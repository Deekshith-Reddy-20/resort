-- V-Farms is one property-wide booking inventory for both stays and events.
-- Time zone for civil dates: Asia/Kolkata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE staff_role AS ENUM ('owner', 'admin', 'reservations', 'operations', 'content');
CREATE TYPE booking_status AS ENUM (
  'draft', 'held', 'awaiting_payment', 'confirmed', 'checked_in', 'checked_out',
  'cancelled', 'expired', 'paid_unbooked'
);
CREATE TYPE event_status AS ENUM (
  'enquiry', 'review', 'quote_sent', 'accepted', 'held', 'awaiting_deposit',
  'confirmed', 'completed', 'declined', 'expired', 'cancelled'
);
CREATE TYPE payment_status AS ENUM (
  'created', 'pending', 'authorized', 'captured', 'failed', 'refund_pending',
  'partially_refunded', 'refunded', 'exception'
);
CREATE TYPE inventory_kind AS ENUM ('stay', 'event', 'hold_stay', 'hold_event', 'maintenance');
CREATE TYPE inventory_status AS ENUM ('active', 'released', 'converted', 'expired', 'cancelled');

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL DEFAULT 'vfarms-hyderabad',
  name text NOT NULL DEFAULT 'V-Farms',
  tagline text NOT NULL DEFAULT 'A singular escape to nature',
  location_label text NOT NULL DEFAULT 'Near Hyderabad, Telangana',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  acreage_label text NOT NULL DEFAULT 'Five acres',
  room_count integer NOT NULL DEFAULT 5 CHECK (room_count = 5),
  booking_enabled boolean NOT NULL DEFAULT false,
  rates_published boolean NOT NULL DEFAULT false,
  max_overnight_guests integer,
  check_in_time text,
  check_out_time text,
  weekday_rate_minor bigint,
  weekend_rate_minor bigint,
  tax_bps integer,
  deposit_bps integer,
  min_nights integer,
  max_nights integer,
  hold_minutes integer NOT NULL DEFAULT 15,
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE room_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sort_order integer NOT NULL,
  slug text NOT NULL,
  display_name text NOT NULL,
  summary text NOT NULL,
  details_status text NOT NULL DEFAULT 'pending_owner_approval',
  image_path text NOT NULL,
  UNIQUE (property_id, slug),
  UNIQUE (property_id, sort_order)
);

CREATE TABLE inventory_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  kind inventory_kind NOT NULL,
  status inventory_status NOT NULL DEFAULT 'active',
  start_date date NOT NULL,
  end_date date NOT NULL,
  end_exclusive boolean NOT NULL,
  hold_id uuid,
  booking_id uuid,
  event_id uuid,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dates_ok CHECK (
    (end_exclusive AND end_date > start_date) OR (NOT end_exclusive AND end_date >= start_date)
  )
);

CREATE INDEX inventory_blocks_property_dates ON inventory_blocks (property_id, start_date, end_date);
CREATE INDEX inventory_blocks_active ON inventory_blocks (property_id, status, kind);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stay_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  reference text UNIQUE NOT NULL,
  status booking_status NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL CHECK (guests > 0),
  special_requests text,
  price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_hash text NOT NULL,
  hold_expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  reference text UNIQUE NOT NULL,
  status event_status NOT NULL DEFAULT 'enquiry',
  event_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  expected_attendees integer,
  setup_requirements text,
  vendor_requests text,
  notes text,
  verification_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES event_enquiries(id) ON DELETE CASCADE,
  reference text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  currency text NOT NULL DEFAULT 'INR',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_minor bigint NOT NULL,
  due_now_minor bigint NOT NULL,
  expires_at timestamptz,
  accepted_at timestamptz,
  price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_booking_id uuid REFERENCES stay_bookings(id),
  event_quote_id uuid REFERENCES event_quotes(id),
  provider text NOT NULL DEFAULT 'razorpay',
  provider_order_id text UNIQUE,
  provider_payment_id text,
  amount_minor bigint NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'created',
  exception_code text,
  raw_last_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (stay_booking_id IS NOT NULL OR event_quote_id IS NOT NULL)
);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  amount_minor bigint NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  provider_refund_id text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE payment_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id),
  code text NOT NULL,
  detail text NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  path text NOT NULL,
  kind text NOT NULL,
  alt text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  approved boolean NOT NULL DEFAULT true,
  source_note text NOT NULL DEFAULT 'Extracted and colour-graded from V-Farms source video. Not native 4K or genuine HDR.'
);

CREATE TABLE site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  key text NOT NULL,
  value jsonb NOT NULL,
  UNIQUE (property_id, key)
);

CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true
);

CREATE TABLE policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  slug text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  UNIQUE (property_id, slug, version)
);

CREATE TABLE notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  to_email text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE admin_profiles (
  id uuid PRIMARY KEY,
  role staff_role NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION vfarms_block_active(b inventory_blocks)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT b.status = 'active' AND (b.expires_at IS NULL OR b.expires_at > now());
$$;

CREATE OR REPLACE FUNCTION vfarms_inventory_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  other inventory_blocks%ROWTYPE;
  stay_a boolean;
  stay_b boolean;
  overlap boolean;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  FOR other IN
    SELECT * FROM inventory_blocks
    WHERE property_id = NEW.property_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    stay_a := NEW.kind IN ('stay', 'hold_stay');
    stay_b := other.kind IN ('stay', 'hold_stay');

    IF stay_a AND stay_b THEN
      overlap := NEW.start_date < other.end_date AND other.start_date < NEW.end_date;
      IF overlap THEN
        RAISE EXCEPTION 'STAY_OVERLAP'
          USING ERRCODE = 'exclusion_violation';
      END IF;
    ELSIF (stay_a AND NOT stay_b) OR (stay_b AND NOT stay_a) THEN
      -- Conservative event/maintenance vs stay: inclusive of stay arrival and departure (INV-04)
      IF stay_a THEN
        overlap := NEW.start_date <= other.end_date AND other.start_date <= NEW.end_date;
      ELSE
        overlap := NEW.start_date <= other.end_date AND other.start_date <= NEW.end_date;
      END IF;
      -- Stay stored as [check_in, check_out) so checkout date == end_date.
      -- Inclusive compare against stay.end_date includes departure day.
      IF stay_a THEN
        overlap := NEW.start_date <= other.end_date AND other.start_date <= NEW.end_date;
      ELSE
        overlap := other.start_date <= NEW.end_date AND NEW.start_date <= other.end_date;
      END IF;
      IF overlap THEN
        RAISE EXCEPTION 'EVENT_STAY_OVERLAP'
          USING ERRCODE = 'exclusion_violation';
      END IF;
    ELSE
      overlap := NEW.start_date <= other.end_date AND other.start_date <= NEW.end_date;
      IF overlap THEN
        RAISE EXCEPTION 'NONSTAY_OVERLAP'
          USING ERRCODE = 'exclusion_violation';
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_blocks_guard
  BEFORE INSERT OR UPDATE ON inventory_blocks
  FOR EACH ROW EXECUTE FUNCTION vfarms_inventory_guard();

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read of non-sensitive published content.
CREATE POLICY public_read_property ON properties FOR SELECT USING (true);
CREATE POLICY public_read_rooms ON room_profiles FOR SELECT USING (true);
CREATE POLICY public_read_media ON media_assets FOR SELECT USING (approved = true);
CREATE POLICY public_read_content ON site_content FOR SELECT USING (true);
CREATE POLICY public_read_faqs ON faqs FOR SELECT USING (published = true);
CREATE POLICY public_read_policies ON policies FOR SELECT USING (true);

-- Guests never read other customers, payments, or bookings via anon key.
-- Authoritative booking/payment APIs use the service role on the server only.

CREATE POLICY staff_admin_profiles ON admin_profiles
  FOR SELECT USING (auth.uid() = id);

INSERT INTO properties (slug, name, tagline, location_label, booking_enabled, rates_published)
VALUES ('vfarms-hyderabad', 'V-Farms', 'A singular escape to nature', 'Near Hyderabad, Telangana', false, false);

INSERT INTO room_profiles (property_id, sort_order, slug, display_name, summary, image_path)
SELECT p.id, x.sort_order, x.slug, x.display_name, x.summary, x.image_path
FROM properties p
CROSS JOIN (
  VALUES
    (1, 'room-1', 'Room 1', 'One of five distinct rooms included in every whole-property stay. Detailed specifications are pending owner approval.', '/images/rooms/room-1.jpg'),
    (2, 'room-2', 'Room 2', 'One of five distinct rooms included in every whole-property stay. Detailed specifications are pending owner approval.', '/images/rooms/room-2.jpg'),
    (3, 'room-3', 'Room 3', 'One of five distinct rooms included in every whole-property stay. Detailed specifications are pending owner approval.', '/images/rooms/room-3.jpg'),
    (4, 'room-4', 'Room 4', 'One of five distinct rooms included in every whole-property stay. Detailed specifications are pending owner approval.', '/images/rooms/room-4.jpg'),
    (5, 'room-5', 'Room 5', 'One of five distinct rooms included in every whole-property stay. Detailed specifications are pending owner approval.', '/images/rooms/room-5.jpg')
) AS x(sort_order, slug, display_name, summary, image_path);
