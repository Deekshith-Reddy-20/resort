import { createHash, randomBytes } from "crypto";
import {
  canAllocate,
  quoteStay,
  resolveLatePayment,
  type RatePlan,
} from "@vfarms/inventory";
import { withLock as mutexLock } from "./mutex";
import { lastPersistFailure, persistEnabled, pullStore, pushStore, registerStoreIo } from "./persist";
import { PersistError } from "./persist-error";
import { emptyCommercial, stayConfigGaps, type CommercialSettings } from "./commercial";
import { persistenceMessage } from "./hosted-config";
import { supabaseServiceKey, supabaseUrl } from "./supabase-admin";
import { BRAND, FAQS, GALLERY, POLICIES, ROOMS } from "./content";

const PROPERTY_ID = process.env.PROPERTY_ID ?? "vfarms-hyderabad";

async function withLock<T>(key: string, fn: () => Promise<T> | T, alreadyLocked = false): Promise<T> {
  if (alreadyLocked) return await fn();
  return mutexLock(key, async () => {
    if (persistEnabled()) {
      const loaded = await pullStore();
      if (!loaded) throw new PersistError(lastPersistFailure() ?? { operation: "runtime_state.pull", code: null, reason: "unknown", message: "Inventory store could not be loaded from the database." });
    }
    const result = await fn();
    if (persistEnabled()) {
      const saved = await pushStore();
      if (!saved) throw new PersistError(lastPersistFailure() ?? { operation: "runtime_state.push", code: null, reason: "unknown", message: "Inventory store could not be saved." });
    }
    return result;
  });
}

export async function runLocked<T>(fn: () => T | Promise<T>): Promise<T> {
  return withLock(PROPERTY_ID, () => fn());
}

export async function runLockedRead<T>(fn: () => T | Promise<T>): Promise<T> {
  return mutexLock(PROPERTY_ID, async () => {
    if (persistEnabled()) {
      const loaded = await pullStore();
      if (!loaded) throw new PersistError(lastPersistFailure() ?? { operation: "runtime_state.pull", code: null, reason: "unknown", message: "Inventory store could not be loaded from the database." });
    }
    return fn();
  });
}

export type StayStatus =
  | "held"
  | "awaiting_payment"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "paid_unbooked";

export type EventStatus =
  | "enquiry"
  | "review"
  | "quote_sent"
  | "accepted"
  | "held"
  | "awaiting_deposit"
  | "confirmed"
  | "declined"
  | "expired"
  | "cancelled";

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface StayBooking {
  id: string;
  reference: string;
  status: StayStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  customerId: string;
  specialRequests?: string;
  priceSnapshot: Record<string, unknown>;
  policySnapshot: Record<string, unknown>;
  verificationHash: string;
  holdExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventEnquiry {
  id: string;
  reference: string;
  status: EventStatus;
  eventType: string;
  startDate: string;
  endDate: string;
  expectedAttendees?: number;
  setupRequirements?: string;
  vendorRequests?: string;
  notes?: string;
  customerId: string;
  verificationHash: string;
  createdAt: string;
}

export interface EventQuote {
  id: string;
  enquiryId: string;
  reference: string;
  status: "issued" | "accepted" | "expired" | "cancelled";
  totalMinor: number;
  dueNowMinor: number;
  lineItems: { label: string; amountMinor: number }[];
  expiresAt?: string;
  acceptedAt?: string;
  holdId?: string;
  priceSnapshot: Record<string, unknown>;
}

export interface PaymentRecord {
  id: string;
  stayReference?: string;
  quoteReference?: string;
  orderId?: string;
  paymentId?: string;
  amountMinor: number;
  currency: string;
  status: "created" | "pending" | "captured" | "failed" | "exception";
  exceptionCode?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  type: "stay_hold" | "stay_confirmed" | "event_enquiry" | "event_quote" | "payment" | "exception" | "contact";
  to: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed" | "unconfigured";
  error?: string;
  retries: number;
  createdAt: string;
}

export interface CmsContent {
  heroTagline: string;
  heroBody: string;
  about: string;
  farmStory: string;
  contactPhone: string;
  contactEmail: string;
  whatsapp: string;
  address: string;
  mapsUrl: string;
  supportHours: string;
  published: boolean;
}

export interface MapZone {
  id: string;
  label: string;
  detail: string;
  published: boolean;
}

export function emptyCms(): CmsContent {
  return {
    heroTagline: "",
    heroBody: "",
    about: "",
    farmStory: "",
    contactPhone: "",
    contactEmail: "",
    whatsapp: "",
    address: "",
    mapsUrl: "",
    supportHours: "",
    published: false,
  };
}

interface Db {
  customers: Customer[];
  stays: StayBooking[];
  holds: {
    id: string;
    stayId?: string;
    quoteId?: string;
    kind: "stay" | "event";
    startDate: string;
    endDate: string;
    expiresAt: string;
    reference: string;
  }[];
  events: EventEnquiry[];
  quotes: EventQuote[];
  payments: PaymentRecord[];
  webhookIds: string[];
  exceptions: { id: string; code: string; detail: string; createdAt: string }[];
  maintenance: { id: string; startDate: string; endDate: string; reason: string }[];
  audit: { at: string; action: string; entity: string; entityId: string; actor?: string }[];
  contacts: ContactMessage[];
  staff: { email: string; passwordHash: string; role: string; name: string }[];
  roomOverrides: Record<
    string,
    { image: string | null; photographPublished: boolean; publishedSummary?: string; publishedName?: string }
  >;
  settings: {
    draft: CommercialSettings;
    published: CommercialSettings | null;
    live: boolean;
    publishedAt: string | null;
  };
  cms: CmsContent;
  notifications: NotificationRecord[];
  operationsNotes: { id: string; date: string; kind: string; note: string; actor?: string }[];
  refunds: { id: string; paymentId: string; amountMinor: number; reason: string; actor: string; createdAt: string; status: "recorded" }[];
  mapZones: MapZone[];
  eventTemplates: { id: string; name: string; notes: string; depositBps: number | null }[];
  offlinePayments: { id: string; reference: string; amountMinor: number; method: string; note: string; actor: string; createdAt: string }[];
  faqDrafts: { q: string; a: string; published: boolean }[];
  notificationTemplates: { id: string; name: string; subject: string; body: string }[];
}

const globalStore = globalThis as unknown as { __vfarmsDb?: Db };

function emptyDb(): Db {
  return {
    customers: [],
    stays: [],
    holds: [],
    events: [],
    quotes: [],
    payments: [],
    webhookIds: [],
    exceptions: [],
    maintenance: [],
    audit: [],
    contacts: [],
    staff: [],
    roomOverrides: {},
    settings: {
      draft: emptyCommercial(),
      published: null,
      live: false,
      publishedAt: null,
    },
    cms: emptyCms(),
    notifications: [],
    operationsNotes: [],
    refunds: [],
    mapZones: [
      { id: "arrival", label: "Arrival", detail: "Actual check-in point and parking guidance pending owner confirmation.", published: false },
      { id: "building", label: "Guest building", detail: "One building with five distinct rooms, included together in a stay.", published: true },
      { id: "plantation", label: "Dragon fruit plantation", detail: "Cultivation areas visible in the resort video. Restricted-area rules unpublished.", published: true },
    ],
    eventTemplates: [],
    offlinePayments: [],
    faqDrafts: [],
    notificationTemplates: [
      { id: "hold", name: "Reservation hold", subject: "Your V-Farms hold", body: "A whole-property hold was created. It is not a confirmed stay until payment is verified." },
      { id: "confirmed", name: "Stay confirmed", subject: "V-Farms stay confirmed", body: "Your exclusive estate stay is confirmed after verified payment." },
      { id: "enquiry", name: "Event enquiry", subject: "Event enquiry received", body: "Your enquiry is not a booking and does not hold the calendar." },
    ],
  };
}

function hydrateDb(d: Db): Db {
  const fresh = emptyDb();
  d.notifications ??= fresh.notifications;
  d.cms ??= fresh.cms;
  d.operationsNotes ??= fresh.operationsNotes;
  d.refunds ??= fresh.refunds;
  d.mapZones ??= fresh.mapZones;
  d.eventTemplates ??= fresh.eventTemplates;
  d.offlinePayments ??= fresh.offlinePayments;
  d.faqDrafts ??= fresh.faqDrafts;
  d.notificationTemplates ??= fresh.notificationTemplates;
  d.customers ??= [];
  d.stays ??= [];
  d.holds ??= [];
  d.events ??= [];
  d.quotes ??= [];
  d.payments ??= [];
  d.exceptions ??= [];
  d.maintenance ??= [];
  d.audit ??= [];
  d.contacts ??= [];
  if (d.settings?.draft) {
    d.settings.draft.minAdvanceDays ??= null;
    d.settings.draft.maxAdvanceDays ??= null;
    d.settings.draft.closedToArrival ??= [];
  }
  if (d.settings?.published) {
    d.settings.published.minAdvanceDays ??= null;
    d.settings.published.maxAdvanceDays ??= null;
    d.settings.published.closedToArrival ??= [];
  }
  return d;
}

export function db(): Db {
  if (!globalStore.__vfarmsDb) {
    globalStore.__vfarmsDb = emptyDb();
    bootstrapCommercialFromEnv(globalStore.__vfarmsDb);
  } else {
    hydrateDb(globalStore.__vfarmsDb);
  }
  return globalStore.__vfarmsDb;
}

export function resetStore() {
  globalStore.__vfarmsDb = emptyDb();
}

export function serializeStore(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(db())) as Record<string, unknown>;
}

export function hydrateFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  globalStore.__vfarmsDb = hydrateDb({ ...emptyDb(), ...(payload as Db) });
}

function nowIso() {
  return new Date().toISOString();
}

function ref(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function verificationHash(email: string, phone: string) {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${phone.replace(/\s+/g, "")}`)
    .digest("hex");
}

function audit(action: string, entity: string, entityId: string, actor?: string) {
  db().audit.push({ at: nowIso(), action, entity, entityId, actor });
}

function purgeExpiredInventory() {
  const now = Date.parse(nowIso());
  for (const hold of db().holds) {
    if (Date.parse(hold.expiresAt) > now) continue;
    if (hold.stayId) {
      const stay = db().stays.find((s) => s.id === hold.stayId);
      if (stay && (stay.status === "held" || stay.status === "awaiting_payment")) {
        stay.status = "expired";
        stay.updatedAt = nowIso();
      }
    }
    if (hold.quoteId) {
      const quote = db().quotes.find((q) => q.id === hold.quoteId);
      if (quote && quote.status === "accepted") {
        quote.status = "issued";
        quote.holdId = undefined;
        const enquiry = db().events.find((e) => e.id === quote.enquiryId);
        if (enquiry && enquiry.status === "held") enquiry.status = "quote_sent";
      }
    }
  }
  db().holds = db().holds.filter((h) => Date.parse(h.expiresAt) > now);
}

function snapshot() {
  purgeExpiredInventory();
  const d = db();
  const now = nowIso();
  return {
    stays: d.stays
      .filter((s) => s.status === "confirmed")
      .map((s) => ({
        id: s.id,
        propertyId: PROPERTY_ID,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        status: "confirmed" as const,
      })),
    events: d.events
      .filter((e) => e.status === "confirmed")
      .map((e) => ({
        id: e.id,
        propertyId: PROPERTY_ID,
        startDate: e.startDate,
        endDate: e.endDate,
        status: "confirmed" as const,
      })),
    holds: d.holds
      .filter((h) => Date.parse(h.expiresAt) > Date.parse(now))
      .map((h) => ({
        id: h.id,
        propertyId: PROPERTY_ID,
        kind: h.kind,
        startDate: h.startDate,
        endDate: h.endDate,
        expiresAt: h.expiresAt,
        reference: h.reference,
      })),
    maintenance: d.maintenance.map((m) => ({
      id: m.id,
      propertyId: PROPERTY_ID,
      startDate: m.startDate,
      endDate: m.endDate,
    })),
    nowIso: now,
  };
}

function liveCommercial(): CommercialSettings | null {
  const s = db().settings;
  if (!s.live || !s.published) return null;
  return s.published;
}

function ratePlan(): RatePlan {
  const live = liveCommercial();
  return {
    currency: "INR",
    weekdayMinor: live?.weekdayMinor ?? null,
    weekendMinor: live?.weekendMinor ?? null,
    published: Boolean(live),
    minNights: live?.minNights ?? null,
    maxNights: live?.maxNights ?? null,
    maxGuests: live?.maxGuests ?? null,
    taxBps: live?.taxBps ?? null,
    depositBps: live?.depositBps ?? null,
    weekendWeekdays: [0, 6],
  };
}

export function bookingBlockers(): string[] {
  const issues: string[] = [];
  const persistIssue = persistenceMessage();
  if (persistIssue) issues.push(persistIssue);
  const live = liveCommercial();
  if (!live) {
    issues.push(
      ...(stayConfigGaps(db().settings.draft).length
        ? ["Online stay booking is not published. Authorized staff must save a complete Pricing draft, then publish.", ...stayConfigGaps(db().settings.draft)]
        : ["Online stay booking is not published. Authorized staff must save a complete Pricing draft, then publish."]),
    );
  }
  return issues;
}

export function publicConfig() {
  const live = liveCommercial();
  const missingSettings = bookingBlockers();
  return {
    brand: BRAND,
    timezone: "Asia/Kolkata",
    currency: "INR",
    bookingEnabled: Boolean(live),
    ratesPublished: Boolean(live),
    paymentsConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    maxGuests: live?.maxGuests ?? null,
    minNights: live?.minNights ?? null,
    maxNights: live?.maxNights ?? null,
    checkInTime: live?.checkInTime ?? null,
    checkOutTime: live?.checkOutTime ?? null,
    cancellationSummary: live?.cancellationSummary ?? null,
    missingSettings,
    persistencyReady: persistEnabled() && !lastPersistFailure(),
    persistency: persistEnabled()
      ? "supabase runtime_state (server-only)"
      : "in-process memory (not production persistence)",
    persistFailure: lastPersistFailure(),
    location: BRAND.location,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_LIVE_MODE !== "true" ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_KEY_ID ?? null,
    mediaNote: BRAND.mediaNote,
  };
}

export function publicProperty() {
  const cms = db().cms;
  const publishedZones = db().mapZones.filter((z) => z.published);
  return {
    id: PROPERTY_ID,
    name: BRAND.name,
    tagline: cms.published && cms.heroTagline ? cms.heroTagline : BRAND.tagline,
    location: BRAND.location,
    description: cms.published && cms.about ? cms.about : BRAND.property,
    farmStory: cms.published ? cms.farmStory || null : null,
    acreage: "Five acres",
    rooms: 5,
    contact: cms.published
      ? {
          phone: cms.contactPhone || null,
          email: cms.contactEmail || null,
          whatsapp: cms.whatsapp || null,
          address: cms.address || null,
          mapsUrl: cms.mapsUrl || null,
          supportHours: cms.supportHours || null,
        }
      : { phone: null, email: null, whatsapp: null, address: null, mapsUrl: null, supportHours: null },
    map: {
      type: "schematic",
      note: "Exact boundaries, coordinates, and pathways are not verified. This is a labelled schematic, not a surveyed map.",
      zones: publishedZones.length
        ? publishedZones
        : [
        { id: "arrival", label: "Arrival", detail: "Actual check-in point pending owner confirmation." },
        { id: "building", label: "Guest building", detail: "One building with five distinct rooms." },
        { id: "plantation", label: "Dragon fruit plantation", detail: "Cultivation areas visible in the resort video." },
      ],
    },
  };
}

export function publicRooms() {
  return ROOMS.map((room) => {
    const override = db().roomOverrides[room.slug];
    const image = override?.image !== undefined ? override.image : room.image;
    const photographPublished = Boolean((override?.photographPublished ?? room.photographPublished) && image);
    return {
      slug: room.slug,
      name: override?.publishedName ?? room.name,
      workingTitle: room.workingTitle,
      designDirection: room.designDirection,
      photographPublished,
      image: photographPublished ? image : null,
      publishedSummary: photographPublished ? override?.publishedSummary : undefined,
      bookable: false,
      summary: photographPublished
        ? override?.publishedSummary ??
          "Informational profile only. This room is included in every eligible whole-property stay."
        : "Interior photograph unpublished. The supplied estate film does not show five distinct bedrooms. Bed type, size, and amenities are pending owner approval.",
      notice: BRAND.roomNotice,
    };
  });
}

export function updateRoomMedia(
  slug: string,
  patch: { image?: string | null; photographPublished?: boolean; publishedSummary?: string; publishedName?: string },
  actor?: string,
) {
  const base = ROOMS.find((r) => r.slug === slug);
  if (!base) return { ok: false as const, error: "Unknown room." };
  if (patch.image && !patch.image.startsWith("/images/")) {
    return { ok: false as const, error: "Room photographs must be stored under /images/." };
  }
  const current = db().roomOverrides[slug] ?? { image: null, photographPublished: false };
  const next = {
    ...current,
    ...patch,
    image: patch.image === undefined ? current.image : patch.image,
    photographPublished: patch.photographPublished ?? current.photographPublished,
  };
  if (next.photographPublished && !next.image) {
    return { ok: false as const, error: "Approve a photograph only after an image path is set." };
  }
  db().roomOverrides[slug] = next;
  audit("rooms.update", "room", slug, actor);
  return { ok: true as const, room: publicRooms().find((r) => r.slug === slug) };
}

export function publicGallery() {
  return GALLERY.map((item, index) => ({ ...item, id: `frame-${index + 1}` }));
}

export function publicFaqs() {
  const extras = db().faqDrafts.filter((f) => f.published).map((f) => ({ q: f.q, a: f.a }));
  return [...FAQS, ...extras];
}

export function publicPolicies() {
  const live = liveCommercial();
  return {
    ...POLICIES,
    cancellation: {
      title: POLICIES.cancellation.title,
      body: live?.cancellationSummary ?? POLICIES.cancellation.body,
    },
  };
}

function daysBetweenKolkata(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00+05:30`);
  const b = Date.parse(`${to}T00:00:00+05:30`);
  return Math.round((b - a) / 86_400_000);
}

function stayWindowIssue(checkIn: string, live: CommercialSettings | null) {
  if (!live) return null;
  if (live.closedToArrival?.includes(checkIn)) {
    return "This check-in date is closed to arrival.";
  }
  const today = todayKolkata();
  const advance = daysBetweenKolkata(today, checkIn);
  if (live.minAdvanceDays != null && advance < live.minAdvanceDays) {
    return `Stays must be booked at least ${live.minAdvanceDays} day(s) in advance.`;
  }
  if (live.maxAdvanceDays != null && advance > live.maxAdvanceDays) {
    return `Stays cannot be booked more than ${live.maxAdvanceDays} day(s) ahead.`;
  }
  return null;
}

function evaluateAvailability(input: {
  product: "stay" | "event";
  startDate: string;
  endDate: string;
  guests?: number;
}) {
  const persistIssue = persistenceMessage();
  if (persistIssue) {
    return {
      propertyId: PROPERTY_ID,
      product: input.product,
      available: false,
      reason: persistIssue,
      guests: input.guests ?? null,
      capacityConfigured: false,
    };
  }
  const proposed =
    input.product === "stay"
      ? { kind: "stay" as const, startDate: input.startDate, endDate: input.endDate }
      : { kind: "event" as const, startDate: input.startDate, endDate: input.endDate };
  const result = canAllocate(proposed, snapshot(), PROPERTY_ID);
  return {
    propertyId: PROPERTY_ID,
    product: input.product,
    available: result.ok,
    reason: result.ok ? undefined : result.message,
    guests: input.guests ?? null,
    capacityConfigured: liveCommercial()?.maxGuests != null,
  };
}

export async function searchAvailability(input: {
  product: "stay" | "event";
  startDate: string;
  endDate: string;
  guests?: number;
}) {
  return runLockedRead(() => evaluateAvailability(input));
}

export async function createStayQuote(input: { checkIn: string; checkOut: string; guests: number }) {
  return runLockedRead(async () => {
  const availability = evaluateAvailability({
    product: "stay",
    startDate: input.checkIn,
    endDate: input.checkOut,
    guests: input.guests,
  });
  const live = liveCommercial();
  const quote = quoteStay({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    ratePlan: ratePlan(),
    exceptions: live?.seasonal,
    bookingEnabled: Boolean(live),
  });
  const missingSettings = bookingBlockers();
  const windowIssue = stayWindowIssue(input.checkIn, live);
  const available = availability.available && quote.available !== false && !windowIssue;
  let blockCode: "none" | "unpublished" | "persistence" | "unavailable" | "capacity" | "stay_rules" | "booking_window" = "none";
  let blockMessage: string | null = null;
  if (missingSettings.length) {
    blockCode = missingSettings[0]?.startsWith("Database persistence") ? "persistence" : "unpublished";
    blockMessage = missingSettings[0] ?? "Whole-property stay settings are not published.";
  } else if (windowIssue) {
    blockCode = "booking_window";
    blockMessage = windowIssue;
  } else if (!availability.available) {
    blockCode = "unavailable";
    blockMessage = availability.reason ?? "The property is unavailable for the selected dates.";
  } else if (!quote.available) {
    const capacity = /capacity/i.test(quote.reason ?? "");
    blockCode = capacity ? "capacity" : "stay_rules";
    blockMessage = quote.reason ?? "Those dates cannot be reserved.";
  }
  return {
    ...quote,
    available,
    availabilityReason: availability.reason,
    missingSettings,
    blockCode,
    blockMessage,
    checkInTime: live?.checkInTime ?? null,
    checkOutTime: live?.checkOutTime ?? null,
  };
  });
}

export async function createStayHold(input: {
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
  acceptPolicies: boolean;
}) {
  return withLock(PROPERTY_ID, async () => {
    if (!input.acceptPolicies) {
      return { ok: false as const, error: "Policies must be accepted." };
    }
    const live = liveCommercial();
    const quote = quoteStay({
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      ratePlan: ratePlan(),
      exceptions: live?.seasonal,
      bookingEnabled: Boolean(live),
    });
    const alloc = canAllocate(
      { kind: "stay", startDate: input.checkIn, endDate: input.checkOut },
      snapshot(),
      PROPERTY_ID,
    );
    if (!alloc.ok) return { ok: false as const, error: alloc.message };
    const missingSettings = bookingBlockers();
    if (!live || missingSettings.length > 0) {
      return {
        ok: false as const,
        error: missingSettings[0] ?? "Whole-property stay settings are not published.",
        missingSettings,
      };
    }
    if (!quote.available || quote.totalMinor == null) {
      return { ok: false as const, error: quote.reason ?? "Those dates cannot be reserved." };
    }
    const windowIssue = stayWindowIssue(input.checkIn, live);
    if (windowIssue) return { ok: false as const, error: windowIssue };
    const customer: Customer = {
      id: crypto.randomUUID(),
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    };
    db().customers.push(customer);
    const holdMinutes = live.holdMinutes;
    const expires = new Date(Date.now() + holdMinutes * 60_000).toISOString();
    const booking: StayBooking = {
      id: crypto.randomUUID(),
      reference: ref("VF-STAY"),
      status: "held",
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      customerId: customer.id,
      specialRequests: input.specialRequests,
      priceSnapshot: quote.snapshot,
      policySnapshot: {
        version: db().settings.publishedAt,
        accepted: true,
        cancellationSummary: live.cancellationSummary,
        checkInTime: live.checkInTime,
        checkOutTime: live.checkOutTime,
        terms: "/terms",
        privacy: "/privacy",
        cancellation: "/cancellation-policy",
      },
      verificationHash: verificationHash(input.email, input.phone),
      holdExpiresAt: expires,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db().stays.push(booking);
    db().holds.push({
      id: crypto.randomUUID(),
      stayId: booking.id,
      kind: "stay",
      startDate: input.checkIn,
      endDate: input.checkOut,
      expiresAt: expires,
      reference: booking.reference,
    });
    audit("hold.create", "stay", booking.reference);
    return {
      ok: true as const,
      booking: publicStay(booking, customer, false),
      quote,
    };
  });
}

function publicStay(booking: StayBooking, customer: Customer, includePii: boolean) {
  const snap = booking.priceSnapshot as {
    totalMinor?: number;
    dueNowMinor?: number;
    subtotalMinor?: number;
    taxMinor?: number;
    nightly?: { date: string; amountMinor: number; kind?: string }[];
    lines?: { label: string; amountMinor: number }[];
  };
  const nights = Array.isArray(snap.nightly) ? snap.nightly.length : 0;
  return {
    reference: booking.reference,
    status: booking.status,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    nights,
    wholeProperty: true,
    amount: booking.priceSnapshot,
    policies: booking.policySnapshot,
    paymentStatus: db().payments.find((p) => p.stayReference === booking.reference)?.status ?? "none",
    paymentsConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    holdExpiresAt: booking.holdExpiresAt,
    guest: includePii
      ? { name: customer.fullName, email: customer.email, phone: customer.phone }
      : { name: maskName(customer.fullName) },
  };
}

function maskName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => (p ? `${p[0]}***` : "")).join(" ");
}

export function lookupStay(reference: string, email: string, phone: string) {
  const booking = db().stays.find((s) => s.reference === reference);
  if (!booking) return null;
  if (booking.verificationHash !== verificationHash(email, phone)) return null;
  const customer = db().customers.find((c) => c.id === booking.customerId);
  if (!customer) return null;
  return publicStay(booking, customer, true);
}

export function publicStayByReference(reference: string) {
  const booking = db().stays.find((s) => s.reference === reference);
  if (!booking) return null;
  const customer = db().customers.find((c) => c.id === booking.customerId);
  if (!customer) return null;
  return publicStay(booking, customer, false);
}

export async function createEventEnquiry(input: {
  fullName: string;
  email: string;
  phone: string;
  eventType: string;
  startDate: string;
  endDate: string;
  expectedAttendees?: number;
  setupRequirements?: string;
  vendorRequests?: string;
  notes?: string;
}) {
  return withLock(PROPERTY_ID, async () => {
  const customer: Customer = {
    id: crypto.randomUUID(),
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  };
  db().customers.push(customer);
  const enquiry: EventEnquiry = {
    id: crypto.randomUUID(),
    reference: ref("VF-EVT"),
    status: "enquiry",
    eventType: input.eventType,
    startDate: input.startDate,
    endDate: input.endDate,
    expectedAttendees: input.expectedAttendees,
    setupRequirements: input.setupRequirements,
    vendorRequests: input.vendorRequests,
    notes: input.notes,
    customerId: customer.id,
    verificationHash: verificationHash(input.email, input.phone),
    createdAt: nowIso(),
  };
  db().events.push(enquiry);
  audit("enquiry.create", "event", enquiry.reference);
  queueNotification({
    type: "event_enquiry",
    to: process.env.NOTIFY_OWNER_EMAIL || input.email,
    subject: `Event enquiry ${enquiry.reference}`,
    body: `Enquiry ${enquiry.reference} received for ${enquiry.eventType} ${enquiry.startDate}–${enquiry.endDate}. This is not a booking.`,
    status: "queued",
  });
  return {
    reference: enquiry.reference,
    status: enquiry.status,
    message: "Enquiry received. This is not a confirmed booking and does not reserve the calendar.",
  };
  });
}

export function lookupEnquiry(reference: string, email: string, phone: string) {
  const enquiry = db().events.find((e) => e.reference === reference);
  if (!enquiry) return null;
  if (enquiry.verificationHash !== verificationHash(email, phone)) return null;
  const quote = db().quotes.find((q) => q.enquiryId === enquiry.id);
  return { enquiry, quote };
}

export function lookupQuote(reference: string, email: string, phone: string) {
  const quote = db().quotes.find((q) => q.reference === reference);
  if (!quote) return null;
  const enquiry = db().events.find((e) => e.id === quote.enquiryId);
  if (!enquiry || enquiry.verificationHash !== verificationHash(email, phone)) return null;
  const customer = db().customers.find((c) => c.id === enquiry.customerId);
  const hold = db().holds.find((h) => h.quoteId === quote.id);
  return {
    quote: {
      reference: quote.reference,
      status: quote.status,
      totalMinor: quote.totalMinor,
      dueNowMinor: quote.dueNowMinor,
      lineItems: quote.lineItems,
      expiresAt: quote.expiresAt,
      priceSnapshot: quote.priceSnapshot,
    },
    enquiry: {
      reference: enquiry.reference,
      status: enquiry.status,
      eventType: enquiry.eventType,
      startDate: enquiry.startDate,
      endDate: enquiry.endDate,
      expectedAttendees: enquiry.expectedAttendees,
    },
    guestName: customer?.fullName ?? "",
    holdExpiresAt: hold?.expiresAt ?? null,
    paymentsConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };
}

export async function issueQuote(input: {
  enquiryReference: string;
  lineItems: { label: string; amountMinor: number }[];
  dueNowMinor: number;
  expiresHours?: number;
  actor?: string;
}) {
  return withLock(PROPERTY_ID, async () => {
  const enquiry = db().events.find((e) => e.reference === input.enquiryReference);
  if (!enquiry) return { ok: false as const, error: "Enquiry not found." };
  const totalMinor = input.lineItems.reduce((s, l) => s + l.amountMinor, 0);
  const quote: EventQuote = {
    id: crypto.randomUUID(),
    enquiryId: enquiry.id,
    reference: ref("VF-QTE"),
    status: "issued",
    totalMinor,
    dueNowMinor: input.dueNowMinor,
    lineItems: input.lineItems,
    expiresAt: new Date(Date.now() + (input.expiresHours ?? 72) * 3600_000).toISOString(),
    priceSnapshot: { lineItems: input.lineItems, totalMinor, dueNowMinor: input.dueNowMinor },
  };
  db().quotes.push(quote);
  enquiry.status = "quote_sent";
  const alloc = canAllocate(
    { kind: "event", startDate: enquiry.startDate, endDate: enquiry.endDate },
    snapshot(),
    PROPERTY_ID,
  );
  audit("quote.issue", "event_quote", quote.reference, input.actor);
  return {
    ok: true as const,
    quote,
    availabilityWarning: alloc.ok ? null : alloc.message ?? "Dates are currently occupied. The quote does not hold inventory.",
  };
  });
}

export async function acceptQuote(quoteReference: string, email: string, phone: string) {
  return withLock(PROPERTY_ID, async () => {
    const quote = db().quotes.find((q) => q.reference === quoteReference);
    if (!quote) return { ok: false as const, error: "Quote not found." };
    const enquiry = db().events.find((e) => e.id === quote.enquiryId);
    if (!enquiry) return { ok: false as const, error: "Enquiry not found." };
    if (enquiry.verificationHash !== verificationHash(email, phone)) {
      return { ok: false as const, error: "Verification failed." };
    }
    if (quote.expiresAt && Date.parse(quote.expiresAt) <= Date.now()) {
      quote.status = "expired";
      return { ok: false as const, error: "Quote expired." };
    }
    const alloc = canAllocate(
      { kind: "event", startDate: enquiry.startDate, endDate: enquiry.endDate },
      snapshot(),
      PROPERTY_ID,
    );
    if (!alloc.ok) {
      return { ok: false as const, error: alloc.message ?? "Dates are no longer available." };
    }
    const expires = new Date(Date.now() + (liveCommercial()?.holdMinutes ?? 15) * 60_000).toISOString();
    const holdId = crypto.randomUUID();
    db().holds.push({
      id: holdId,
      quoteId: quote.id,
      kind: "event",
      startDate: enquiry.startDate,
      endDate: enquiry.endDate,
      expiresAt: expires,
      reference: quote.reference,
    });
    quote.status = "accepted";
    quote.acceptedAt = nowIso();
    quote.holdId = holdId;
    enquiry.status = "held";
    audit("quote.accept", "event_quote", quote.reference);
    return { ok: true as const, quote, holdExpiresAt: expires };
  });
}

export function preparePayment(args: { stayReference?: string; quoteReference?: string }) {
  purgeExpiredInventory();
  if (args.stayReference) {
    const stay = db().stays.find((s) => s.reference === args.stayReference);
    if (!stay) return { ok: false as const, error: "Hold not found.", status: 404 as const };
    if (stay.status === "confirmed") {
      return { ok: false as const, error: "This reservation is already confirmed.", status: 409 as const };
    }
    if (stay.status === "cancelled" || stay.status === "expired") {
      return { ok: false as const, error: "This reservation is no longer payable.", status: 409 as const };
    }
    if (stay.status === "paid_unbooked") {
      return {
        ok: false as const,
        error: "Payment was captured without inventory. Staff must review this exception.",
        status: 409 as const,
      };
    }
    const hold = db().holds.find((h) => h.stayId === stay.id);
    if (!hold || Date.parse(hold.expiresAt) <= Date.now()) {
      return {
        ok: false as const,
        error: "This reservation hold has expired. Start a new stay search.",
        status: 409 as const,
        code: "HOLD_EXPIRED",
      };
    }
    const due = stay.priceSnapshot.dueNowMinor;
    if (typeof due !== "number" || due < 1) {
      return { ok: false as const, error: "This stay has no payable amount.", status: 409 as const };
    }
    const existing = db().payments.find(
      (p) => p.stayReference === stay.reference && p.status === "pending" && p.amountMinor === due && p.orderId,
    );
    return {
      ok: true as const,
      kind: "stay" as const,
      reference: stay.reference,
      amountMinor: due,
      currency: "INR" as const,
      existingOrderId: existing?.orderId ?? null,
    };
  }
  if (args.quoteReference) {
    const quote = db().quotes.find((q) => q.reference === args.quoteReference);
    if (!quote || quote.status !== "accepted") {
      return { ok: false as const, error: "Quote must be accepted before payment.", status: 409 as const };
    }
    const hold = db().holds.find((h) => h.quoteId === quote.id);
    if (!hold || Date.parse(hold.expiresAt) <= Date.now()) {
      return { ok: false as const, error: "The event hold has expired.", status: 409 as const, code: "HOLD_EXPIRED" };
    }
    if (quote.dueNowMinor < 1) {
      return { ok: false as const, error: "This quote has no payable amount.", status: 409 as const };
    }
    const existing = db().payments.find(
      (p) => p.quoteReference === quote.reference && p.status === "pending" && p.amountMinor === quote.dueNowMinor && p.orderId,
    );
    return {
      ok: true as const,
      kind: "event" as const,
      reference: quote.reference,
      amountMinor: quote.dueNowMinor,
      currency: "INR" as const,
      existingOrderId: existing?.orderId ?? null,
    };
  }
  return { ok: false as const, error: "A stay or quote reference is required.", status: 400 as const };
}

export function markPaymentFailed(orderId: string, paymentId?: string) {
  const payment = db().payments.find((p) => p.orderId === orderId);
  if (!payment) return { ok: false as const };
  if (payment.status === "captured") return { ok: true as const, ignored: true };
  payment.status = "failed";
  if (paymentId) payment.paymentId = paymentId;
  audit("payment.failed", "payment", orderId);
  return { ok: true as const };
}

export async function attachOrder(args: { stayReference?: string; quoteReference?: string; orderId: string; amountMinor: number }) {
  return withLock(PROPERTY_ID, async () => {
  const payment: PaymentRecord = {
    id: crypto.randomUUID(),
    stayReference: args.stayReference,
    quoteReference: args.quoteReference,
    orderId: args.orderId,
    amountMinor: args.amountMinor,
    currency: "INR",
    status: "pending",
  };
  db().payments.push(payment);
  if (args.stayReference) {
    const stay = db().stays.find((s) => s.reference === args.stayReference);
    if (stay && stay.status === "held") stay.status = "awaiting_payment";
  }
  return payment;
  });
}

export async function confirmVerifiedPayment(
  args: {
    orderId: string;
    paymentId: string;
  },
  alreadyLocked = false,
): Promise<{ status: string; reference?: string; exception?: string }> {
  return withLock(
    PROPERTY_ID,
    async () => {
    const payment = db().payments.find((p) => p.orderId === args.orderId);
    if (!payment) return { status: "unknown_order" };
    if (payment.status === "captured") return { status: "already_captured", reference: payment.stayReference ?? payment.quoteReference };
    payment.paymentId = args.paymentId;
    if (payment.stayReference) {
      const stay = db().stays.find((s) => s.reference === payment.stayReference);
      if (!stay) return { status: "missing_booking" };
      const hold = db().holds.find((h) => h.stayId === stay.id);
      const decision = resolveLatePayment({
        hold: hold
          ? {
              id: hold.id,
              propertyId: PROPERTY_ID,
              kind: "stay",
              startDate: hold.startDate,
              endDate: hold.endDate,
              expiresAt: hold.expiresAt,
              reference: hold.reference,
            }
          : undefined,
        snapshot: snapshot(),
        propertyId: PROPERTY_ID,
        proposed: { kind: "stay", startDate: stay.checkIn, endDate: stay.checkOut },
        nowIso: nowIso(),
      });
      if (decision === "paid_unbooked") {
        stay.status = "paid_unbooked";
        payment.status = "exception";
        payment.exceptionCode = "PAID_UNBOOKED";
        db().exceptions.push({
          id: crypto.randomUUID(),
          code: "PAID_UNBOOKED",
          detail: `Payment ${args.paymentId} captured without inventory for ${stay.reference}`,
          createdAt: nowIso(),
        });
        audit("payment.paid_unbooked", "stay", stay.reference);
        return { status: "paid_unbooked", reference: stay.reference, exception: "PAID_UNBOOKED" };
      }
      stay.status = "confirmed";
      stay.updatedAt = nowIso();
      payment.status = "captured";
      if (hold) hold.expiresAt = nowIso();
      db().holds = db().holds.filter((h) => h.stayId !== stay.id);
      audit("stay.confirm", "stay", stay.reference);
      return { status: "confirmed", reference: stay.reference };
    }
    if (payment.quoteReference) {
      const quote = db().quotes.find((q) => q.reference === payment.quoteReference);
      const enquiry = quote ? db().events.find((e) => e.id === quote.enquiryId) : undefined;
      if (!quote || !enquiry) return { status: "missing_quote" };
      const hold = db().holds.find((h) => h.quoteId === quote.id);
      const decision = resolveLatePayment({
        hold: hold
          ? {
              id: hold.id,
              propertyId: PROPERTY_ID,
              kind: "event",
              startDate: hold.startDate,
              endDate: hold.endDate,
              expiresAt: hold.expiresAt,
              reference: hold.reference,
            }
          : undefined,
        snapshot: snapshot(),
        propertyId: PROPERTY_ID,
        proposed: { kind: "event", startDate: enquiry.startDate, endDate: enquiry.endDate },
        nowIso: nowIso(),
      });
      if (decision === "paid_unbooked") {
        payment.status = "exception";
        payment.exceptionCode = "PAID_UNBOOKED";
        enquiry.status = "enquiry";
        db().exceptions.push({
          id: crypto.randomUUID(),
          code: "PAID_UNBOOKED",
          detail: `Event payment ${args.paymentId} captured without inventory for ${quote.reference}`,
          createdAt: nowIso(),
        });
        return { status: "paid_unbooked", reference: quote.reference, exception: "PAID_UNBOOKED" };
      }
      enquiry.status = "confirmed";
      payment.status = "captured";
      db().holds = db().holds.filter((h) => h.quoteId !== quote.id);
      audit("event.confirm", "event", enquiry.reference);
      return { status: "confirmed", reference: enquiry.reference };
    }
    return { status: "unlinked_payment" };
    },
    alreadyLocked,
  );
}

export async function applyRazorpayWebhook(input: {
  eventId: string;
  event?: string;
  paymentId?: string;
  orderId?: string;
}) {
  return withLock(PROPERTY_ID, async () => {
    if (input.eventId && !rememberWebhook(input.eventId)) {
      return { ok: true as const, duplicate: true as const };
    }
    if (input.event === "payment.captured" && input.paymentId && input.orderId) {
      const result = await confirmVerifiedPayment({ orderId: input.orderId, paymentId: input.paymentId }, true);
      return { ok: true as const, duplicate: false as const, result };
    }
    if ((input.event === "payment.failed" || input.event === "payment.cancelled") && input.orderId) {
      markPaymentFailed(input.orderId, input.paymentId);
      return { ok: true as const, duplicate: false as const, result: { status: "failed" } };
    }
    return { ok: true as const, ignored: input.event };
  });
}

export function rememberWebhook(id: string): boolean {
  if (db().webhookIds.includes(id)) return false;
  db().webhookIds.push(id);
  return true;
}

export function addContact(input: ContactMessage) {
  db().contacts.push(input);
  audit("contact.create", "contact", input.id);
}

function todayKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

function padDate(n: number) {
  return String(n).padStart(2, "0");
}

function stayOccupiesNight(date: string, checkIn: string, checkOut: string) {
  return date >= checkIn && date < checkOut;
}

function inclusiveOccupies(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export type CalendarTone = "available" | "unavailable" | "hold" | "past" | "unconfigured";

export function propertyMonth(year: number, monthIndex: number) {
  const d = db();
  const today = todayKolkata();
  const now = Date.now();
  const bookingEnabled = Boolean(d.settings.live && d.settings.published);
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days = [];
  for (let day = 1; day <= last; day += 1) {
    const iso = `${year}-${padDate(monthIndex + 1)}-${padDate(day)}`;
    const stayHit = d.stays.find(
      (s) => ["confirmed", "held", "awaiting_payment"].includes(s.status) && stayOccupiesNight(iso, s.checkIn, s.checkOut),
    );
    const eventHit = d.events.find(
      (e) => ["confirmed", "held"].includes(e.status) && inclusiveOccupies(iso, e.startDate, e.endDate),
    );
    const closeHit = d.maintenance.find((m) => inclusiveOccupies(iso, m.startDate, m.endDate));
    const holdHit = d.holds.find((h) => Date.parse(h.expiresAt) > now && (h.kind === "stay" ? stayOccupiesNight(iso, h.startDate, h.endDate) : inclusiveOccupies(iso, h.startDate, h.endDate)));
    const pending = d.events.find(
      (e) => ["enquiry", "review", "quote_sent", "accepted"].includes(e.status) && inclusiveOccupies(iso, e.startDate, e.endDate),
    );
    let tone: CalendarTone = "available";
    let label = "Available";
    let blocker: string | null = null;
    if (iso < today) {
      tone = "past";
      label = "Past";
    } else if (stayHit || eventHit || closeHit) {
      tone = "unavailable";
      label = "Unavailable";
      blocker = stayHit?.reference ?? eventHit?.reference ?? closeHit?.reason ?? "Blocked";
    } else if (holdHit) {
      tone = "hold";
      label = "Temporary hold";
      blocker = holdHit.reference;
    } else if (!bookingEnabled) {
      tone = "unconfigured";
      label = "No occupancy · booking unpublished";
    }
    days.push({
      date: iso,
      tone,
      label,
      blocker,
      pendingEnquiry: Boolean(pending && tone !== "unavailable"),
      pendingReference: pending?.reference ?? null,
    });
  }
  return { year, monthIndex, today, bookingEnabled, days };
}

export function staffCancelStay(reference: string, actor?: string) {
  const stay = db().stays.find((s) => s.reference === reference);
  if (!stay) return { ok: false as const, error: "Stay not found." };
  if (stay.status === "confirmed") {
    return { ok: false as const, error: "Confirmed stays require an owner refund/cancellation review. Do not silently release paid inventory." };
  }
  stay.status = "cancelled";
  stay.updatedAt = nowIso();
  db().holds = db().holds.filter((h) => h.stayId !== stay.id);
  audit("stay.cancel", "stay", stay.reference, actor);
  return { ok: true as const, reference, status: stay.status };
}

export function adminOverview() {
  const d = db();
  const today = todayKolkata();
  const now = Date.now();
  return {
    today,
    timezone: "Asia/Kolkata",
    arrivalsToday: d.stays.filter((s) => s.status === "confirmed" && s.checkIn === today).length,
    departuresToday: d.stays.filter((s) => s.status === "confirmed" && s.checkOut === today).length,
    activeStays: d.stays.filter((s) => s.status === "confirmed" && s.checkIn <= today && s.checkOut > today).length,
    upcomingEvents: d.events.filter((e) => (e.status === "confirmed" || e.status === "held") && e.startDate >= today).length,
    pendingEnquiries: d.events.filter((e) => e.status === "enquiry" || e.status === "review").length,
    quotesAwaiting: d.quotes.filter((q) => q.status === "issued").length,
    activeHolds: d.holds.filter((h) => Date.parse(h.expiresAt) > now).length,
    pendingPayments: d.stays.filter((s) => s.status === "awaiting_payment" || s.status === "held").length,
    exceptions: d.exceptions.length,
    closures: d.maintenance.length,
    outstandingMinor: d.stays.reduce((sum, s) => {
      const snap = s.priceSnapshot as { totalMinor?: number };
      const pay = d.payments.find((p) => p.stayReference === s.reference);
      const paid = pay?.status === "captured" ? pay.amountMinor : 0;
      return sum + Math.max(0, (snap.totalMinor ?? 0) - paid);
    }, 0),
    stays: d.stays.length,
    confirmedStays: d.stays.filter((s) => s.status === "confirmed").length,
    enquiries: d.events.length,
    quotes: d.quotes.length,
    contacts: d.contacts.length,
    bookingEnabled: Boolean(d.settings.live && d.settings.published),
    calendar: [
      ...d.stays.map((s) => ({ type: "stay", reference: s.reference, status: s.status, start: s.checkIn, end: s.checkOut })),
      ...d.events
        .filter((e) => ["confirmed", "held", "quote_sent", "accepted"].includes(e.status))
        .map((e) => ({
          type: e.status === "confirmed" || e.status === "held" ? "event" : "event_soft",
          reference: e.reference,
          status: e.status,
          start: e.startDate,
          end: e.endDate,
        })),
      ...d.maintenance.map((m) => ({ type: "maintenance", reference: m.id, status: "closed", start: m.startDate, end: m.endDate })),
      ...d.holds.filter((h) => Date.parse(h.expiresAt) > now).map((h) => ({ type: "hold", reference: h.reference, status: "hold", start: h.startDate, end: h.endDate })),
    ],
    exceptionsList: d.exceptions,
    audit: d.audit.slice(-100).reverse(),
    settings: d.settings,
    staysList: d.stays.map((s) => {
      const customer = d.customers.find((c) => c.id === s.customerId);
      const pay = d.payments.find((p) => p.stayReference === s.reference);
      const snap = s.priceSnapshot as { totalMinor?: number; dueNowMinor?: number };
      const totalMinor = snap.totalMinor ?? 0;
      const paidMinor = pay?.status === "captured" ? pay.amountMinor : 0;
      return {
        reference: s.reference,
        status: s.status,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        guests: s.guests,
        createdAt: s.createdAt,
        guestName: customer?.fullName ?? "Guest",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        totalMinor,
        paidMinor,
        outstandingMinor: Math.max(0, totalMinor - paidMinor),
        paymentStatus: pay?.status ?? "none",
        type: "whole-property stay",
        policySnapshot: s.policySnapshot,
        priceSnapshot: s.priceSnapshot,
        specialRequests: s.specialRequests ?? "",
      };
    }),
    eventsList: d.events.map((e) => {
      const customer = d.customers.find((c) => c.id === e.customerId);
      const quote = d.quotes.find((q) => q.enquiryId === e.id);
      return {
        ...e,
        guestName: customer?.fullName ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        quoteReference: quote?.reference ?? null,
        quoteStatus: quote?.status ?? null,
        quoteTotalMinor: quote?.totalMinor ?? null,
        dueNowMinor: quote?.dueNowMinor ?? null,
      };
    }),
    quotesList: d.quotes,
    payments: d.payments,
    refunds: d.refunds,
    offlinePayments: d.offlinePayments,
    eventTemplates: d.eventTemplates,
    faqDrafts: d.faqDrafts,
    notificationTemplates: d.notificationTemplates,
    reports: {
      stayNights: d.stays
        .filter((s) => s.status === "confirmed")
        .reduce((n, s) => n + Math.max(0, (Date.parse(`${s.checkOut}T00:00:00+05:30`) - Date.parse(`${s.checkIn}T00:00:00+05:30`)) / 86400000), 0),
      confirmedStays: d.stays.filter((s) => s.status === "confirmed").length,
      confirmedEvents: d.events.filter((e) => e.status === "confirmed").length,
      capturedRevenueMinor: d.payments.filter((p) => p.status === "captured").reduce((s, p) => s + p.amountMinor, 0),
    },
    rooms: publicRooms(),
    cms: d.cms,
    notifications: d.notifications.slice(-50).reverse(),
    operationsNotes: d.operationsNotes,
    mapZones: d.mapZones,
    contactsList: d.contacts,
    integrations: integrationStatus(),
  };
}

export function commercialState() {
  return {
    draft: db().settings.draft,
    published: db().settings.published,
    live: db().settings.live,
    publishedAt: db().settings.publishedAt,
    draftGaps: stayConfigGaps(db().settings.draft),
    liveBlockers: bookingBlockers(),
  };
}

export function updateDraftSettings(patch: Partial<CommercialSettings>, actor?: string) {
  db().settings.draft = { ...db().settings.draft, ...patch };
  audit("settings.draft", "settings", "property", actor);
  return commercialState();
}

export function publishStayConfig(actor?: string) {
  const gaps = stayConfigGaps(db().settings.draft);
  if (gaps.length) {
    return { ok: false as const, error: "Cannot publish until every required stay setting is valid.", missingSettings: gaps };
  }
  db().settings.published = structuredClone(db().settings.draft);
  db().settings.live = true;
  db().settings.publishedAt = nowIso();
  audit("settings.publish", "settings", "property", actor);
  return { ok: true as const, ...commercialState() };
}

export function unpublishStayConfig(actor?: string) {
  db().settings.live = false;
  audit("settings.unpublish", "settings", "property", actor);
  return commercialState();
}

function envInt(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function bootstrapCommercialFromEnv(target: Db) {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;
  if (process.env.VERCEL) return;
  if (process.env.DEV_STAY_CONFIG_PUBLISH !== "true") return;
  const weekday = envInt("DEV_WEEKDAY_MINOR") ?? (envInt("DEV_WEEKDAY_INR") != null ? envInt("DEV_WEEKDAY_INR")! * 100 : null);
  const weekend = envInt("DEV_WEEKEND_MINOR") ?? (envInt("DEV_WEEKEND_INR") != null ? envInt("DEV_WEEKEND_INR")! * 100 : null);
  target.settings.draft = {
    ...emptyCommercial(),
    weekdayMinor: weekday,
    weekendMinor: weekend,
    taxBps: envInt("DEV_TAX_BPS"),
    depositBps: envInt("DEV_DEPOSIT_BPS"),
    maxGuests: envInt("DEV_MAX_GUESTS"),
    minNights: envInt("DEV_MIN_NIGHTS"),
    maxNights: envInt("DEV_MAX_NIGHTS"),
    checkInTime: process.env.DEV_CHECK_IN || null,
    checkOutTime: process.env.DEV_CHECK_OUT || null,
    cancellationSummary: process.env.DEV_CANCELLATION || null,
    termsConfirmed: process.env.DEV_TERMS_CONFIRMED === "true",
    privacyConfirmed: process.env.DEV_PRIVACY_CONFIRMED === "true",
    holdMinutes: envInt("HOLD_MINUTES") ?? 15,
  };
  const gaps = stayConfigGaps(target.settings.draft);
  if (gaps.length) return;
  target.settings.published = structuredClone(target.settings.draft);
  target.settings.live = true;
  target.settings.publishedAt = nowIso();
}

export function addMaintenance(startDate: string, endDate: string, reason: string, actor?: string) {
  return withLock(PROPERTY_ID, async () => {
    const alloc = canAllocate({ kind: "maintenance", startDate, endDate }, snapshot(), PROPERTY_ID);
    if (!alloc.ok) return { ok: false as const, error: alloc.message };
    const block = { id: crypto.randomUUID(), startDate, endDate, reason };
    db().maintenance.push(block);
    audit("maintenance.create", "maintenance", block.id, actor);
    return { ok: true as const, block };
  });
}

export function integrationStatus() {
  return {
    databaseMode: persistEnabled() ? "supabase" : (process.env.DATABASE_MODE ?? "memory"),
    supabaseUrl: Boolean(supabaseUrl()),
    supabaseService: Boolean(supabaseServiceKey()),
    staffSecret: Boolean(process.env.STAFF_SESSION_SECRET),
    razorpayKeyId: Boolean(process.env.RAZORPAY_KEY_ID),
    razorpaySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
    razorpayWebhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    razorpayLive: process.env.RAZORPAY_LIVE_MODE === "true",
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    persistency: persistEnabled()
      ? "supabase runtime_state (server-only)"
      : "in-process memory (not production persistence)",
  };
}

export function queueNotification(input: Omit<NotificationRecord, "id" | "createdAt" | "retries"> & { retries?: number }) {
  const record: NotificationRecord = {
    id: crypto.randomUUID(),
    retries: input.retries ?? 0,
    createdAt: nowIso(),
    ...input,
  };
  db().notifications.push(record);
  return record;
}

export function listNotifications() {
  return db().notifications.slice().reverse();
}

export function updateCms(patch: Partial<CmsContent>, actor?: string) {
  db().cms = { ...db().cms, ...patch };
  audit("cms.update", "cms", db().cms.published ? "published" : "draft", actor);
  return db().cms;
}

export function reviewEnquiry(reference: string, action: "review" | "decline", actor?: string) {
  const enquiry = db().events.find((e) => e.reference === reference);
  if (!enquiry) return { ok: false as const, error: "Enquiry not found." };
  if (enquiry.status === "confirmed") return { ok: false as const, error: "A confirmed event cannot be moved to review from this form." };
  enquiry.status = action === "decline" ? "declined" : "review";
  audit(action === "decline" ? "enquiry.decline" : "enquiry.review", "event", enquiry.reference, actor);
  return { ok: true as const, enquiry };
}

export function recordRefund(input: { paymentId: string; amountMinor: number; reason: string; actor: string }) {
  const payment = db().payments.find((p) => p.paymentId === input.paymentId || p.id === input.paymentId || p.orderId === input.paymentId);
  if (!payment) return { ok: false as const, error: "Payment not found." };
  if (payment.status !== "captured" && payment.status !== "exception") {
    return { ok: false as const, error: "Only verified captured or exception payments can enter the refund record." };
  }
  const refund = {
    id: crypto.randomUUID(),
    paymentId: payment.id,
    amountMinor: input.amountMinor,
    reason: input.reason,
    actor: input.actor,
    createdAt: nowIso(),
    status: "recorded" as const,
  };
  db().refunds.push(refund);
  db().exceptions.push({
    id: crypto.randomUUID(),
    code: "REFUND_RECORDED",
    detail: `Refund ${refund.id} recorded for payment ${payment.orderId ?? payment.id}. Gateway execution is separate and not claimed here.`,
    createdAt: nowIso(),
  });
  audit("refund.record", "payment", payment.id, input.actor);
  return { ok: true as const, refund, notice: "Refund recorded for operations. This does not mark Razorpay as refunded until the gateway confirms it." };
}

export function addOperationsNote(input: { date: string; kind: string; note: string; actor?: string }) {
  const row = { id: crypto.randomUUID(), ...input };
  db().operationsNotes.push(row);
  audit("ops.note", "operations", row.id, input.actor);
  return row;
}

export function recordOfflinePayment(input: { reference: string; amountMinor: number; method: string; note: string; actor: string }) {
  const stay = db().stays.find((s) => s.reference === input.reference);
  const quote = db().quotes.find((q) => q.reference === input.reference);
  if (!stay && !quote) return { ok: false as const, error: "Unknown stay or quote reference." };
  const row = { id: crypto.randomUUID(), ...input, createdAt: nowIso() };
  db().offlinePayments.push(row);
  audit("payment.offline", "payment", input.reference, input.actor);
  return { ok: true as const, payment: row, notice: "Offline payment logged. This does not mark Razorpay captured or confirm inventory." };
}

export function saveEventTemplate(input: { name: string; notes: string; depositBps: number | null }, actor?: string) {
  const row = { id: crypto.randomUUID(), ...input };
  db().eventTemplates.push(row);
  audit("template.event", "pricing", row.id, actor);
  return row;
}

export function saveNotificationTemplate(input: { id?: string; name: string; subject: string; body: string }, actor?: string) {
  const existing = input.id ? db().notificationTemplates.find((t) => t.id === input.id) : undefined;
  if (existing) {
    existing.name = input.name;
    existing.subject = input.subject;
    existing.body = input.body;
    audit("template.notify", "notifications", existing.id, actor);
    return existing;
  }
  const row = { id: crypto.randomUUID(), name: input.name, subject: input.subject, body: input.body };
  db().notificationTemplates.push(row);
  audit("template.notify", "notifications", row.id, actor);
  return row;
}

export function saveFaqDraft(input: { q: string; a: string; published: boolean }, actor?: string) {
  db().faqDrafts.push(input);
  audit("faq.draft", "cms", input.q, actor);
  return db().faqDrafts;
}

export function updateMapZone(id: string, patch: Partial<MapZone>, actor?: string) {
  const zone = db().mapZones.find((z) => z.id === id);
  if (!zone) return { ok: false as const, error: "Unknown map zone." };
  Object.assign(zone, patch);
  audit("map.update", "map", id, actor);
  return { ok: true as const, zone };
}

registerStoreIo({ serialize: serializeStore, hydrate: hydrateFromPayload });
