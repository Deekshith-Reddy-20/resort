import { createHash, randomBytes } from "crypto";
import {
  canAllocate,
  quoteStay,
  resolveLatePayment,
  type RatePlan,
} from "@vfarms/inventory";
import { withLock } from "./mutex";
import { emptyCommercial, stayConfigGaps, type CommercialSettings } from "./commercial";
import { BRAND, FAQS, GALLERY, POLICIES, ROOMS } from "./content";

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
  };
}

export function db(): Db {
  if (!globalStore.__vfarmsDb) {
    globalStore.__vfarmsDb = emptyDb();
    bootstrapCommercialFromEnv(globalStore.__vfarmsDb);
  }
  return globalStore.__vfarmsDb;
}

export function resetStore() {
  globalStore.__vfarmsDb = emptyDb();
}

const PROPERTY_ID = process.env.PROPERTY_ID ?? "vfarms-hyderabad";

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
  const live = liveCommercial();
  if (!live) return stayConfigGaps(db().settings.draft).length
    ? ["Online stay booking is not published.", ...stayConfigGaps(db().settings.draft)]
    : ["Online stay booking is not published. Save a complete draft, then publish."];
  return [];
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
    location: BRAND.location,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_LIVE_MODE !== "true" ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_KEY_ID ?? null,
    mediaNote: BRAND.mediaNote,
  };
}

export function publicProperty() {
  return {
    id: PROPERTY_ID,
    name: BRAND.name,
    tagline: BRAND.tagline,
    location: BRAND.location,
    description: BRAND.property,
    acreage: "Five acres",
    rooms: 5,
    map: {
      type: "schematic",
      note: "Exact boundaries, coordinates, and pathways are not verified. This is a labelled schematic, not a surveyed map.",
      zones: [
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
  return FAQS;
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

export async function searchAvailability(input: {
  product: "stay" | "event";
  startDate: string;
  endDate: string;
  guests?: number;
}) {
  return withLock(PROPERTY_ID, async () => {
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
  });
}

export async function createStayQuote(input: { checkIn: string; checkOut: string; guests: number }) {
  const availability = await searchAvailability({
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
  const available = availability.available && quote.available !== false;
  let blockCode: "none" | "unpublished" | "unavailable" | "capacity" | "stay_rules" = "none";
  let blockMessage: string | null = null;
  if (missingSettings.length) {
    blockCode = "unpublished";
    blockMessage = missingSettings[0] ?? "Whole-property stay settings are not published.";
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
  return {
    reference: enquiry.reference,
    status: enquiry.status,
    message: "Enquiry received. This is not a confirmed booking and does not reserve the calendar.",
  };
}

export function lookupEnquiry(reference: string, email: string, phone: string) {
  const enquiry = db().events.find((e) => e.reference === reference);
  if (!enquiry) return null;
  if (enquiry.verificationHash !== verificationHash(email, phone)) return null;
  const quote = db().quotes.find((q) => q.enquiryId === enquiry.id);
  return { enquiry, quote };
}

export async function issueQuote(input: {
  enquiryReference: string;
  lineItems: { label: string; amountMinor: number }[];
  dueNowMinor: number;
  expiresHours?: number;
  actor?: string;
}) {
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
  audit("quote.issue", "event_quote", quote.reference, input.actor);
  return { ok: true as const, quote };
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
}

export async function confirmVerifiedPayment(args: {
  orderId: string;
  paymentId: string;
}): Promise<{ status: string; reference?: string; exception?: string }> {
  return withLock(PROPERTY_ID, async () => {
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

export function adminOverview() {
  const d = db();
  return {
    stays: d.stays.length,
    confirmedStays: d.stays.filter((s) => s.status === "confirmed").length,
    enquiries: d.events.length,
    quotes: d.quotes.length,
    exceptions: d.exceptions.length,
    contacts: d.contacts.length,
    bookingEnabled: Boolean(d.settings.live && d.settings.published),
    calendar: [
      ...d.stays.map((s) => ({ type: "stay", reference: s.reference, status: s.status, start: s.checkIn, end: s.checkOut })),
      ...d.events
        .filter((e) => e.status === "confirmed" || e.status === "held")
        .map((e) => ({ type: "event", reference: e.reference, status: e.status, start: e.startDate, end: e.endDate })),
      ...d.maintenance.map((m) => ({ type: "maintenance", reference: m.id, status: "closed", start: m.startDate, end: m.endDate })),
      ...d.holds.map((h) => ({ type: "hold", reference: h.reference, status: "hold", start: h.startDate, end: h.endDate })),
    ],
    exceptionsList: d.exceptions,
    audit: d.audit.slice(-100).reverse(),
    settings: d.settings,
    staysList: d.stays,
    eventsList: d.events,
    quotesList: d.quotes,
    payments: d.payments,
    rooms: publicRooms(),
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
