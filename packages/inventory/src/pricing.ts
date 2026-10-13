import { enumerateStayNights } from "./dates";

export type DayKind = "weekday" | "weekend" | "holiday" | "seasonal";

export interface RatePlan {
  currency: "INR";
  weekdayMinor: number | null;
  weekendMinor: number | null;
  published: boolean;
  minNights: number | null;
  maxNights: number | null;
  maxGuests: number | null;
  taxBps: number | null;
  depositBps: number | null;
  weekendWeekdays: number[];
}

export interface SeasonalException {
  startDate: string;
  endDate: string;
  nightlyMinor: number;
}

export interface QuoteLine {
  code: string;
  label: string;
  amountMinor: number;
}

export interface StayQuote {
  available: boolean;
  bookingEnabled: boolean;
  reason?: string;
  currency: "INR";
  nights: number;
  nightly: { date: string; amountMinor: number; kind: DayKind }[];
  lines: QuoteLine[];
  subtotalMinor: number | null;
  taxMinor: number | null;
  totalMinor: number | null;
  dueNowMinor: number | null;
  snapshot: Record<string, unknown>;
}

function isoDayOfWeek(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function quoteStay(args: {
  checkIn: string;
  checkOut: string;
  guests: number;
  ratePlan: RatePlan;
  exceptions?: SeasonalException[];
  bookingEnabled: boolean;
}): StayQuote {
  const nights = enumerateStayNights(args.checkIn, args.checkOut);
  const empty: StayQuote = {
    available: true,
    bookingEnabled: false,
    currency: "INR",
    nights: nights.length,
    nightly: [],
    lines: [],
    subtotalMinor: null,
    taxMinor: null,
    totalMinor: null,
    dueNowMinor: null,
    snapshot: { unpublished: true },
  };

  if (!args.bookingEnabled || !args.ratePlan.published) {
    return {
      ...empty,
      available: false,
      reason:
        "Stay rates are not published yet. Online booking stays disabled until the owner approves prices, taxes, and capacity.",
    };
  }

  if (args.ratePlan.weekdayMinor == null || args.ratePlan.weekendMinor == null) {
    return { ...empty, reason: "Weekday and weekend rates are not configured." };
  }

  if (args.ratePlan.maxGuests != null && args.guests > args.ratePlan.maxGuests) {
    return {
      ...empty,
      bookingEnabled: true,
      available: false,
      reason: "Guest count exceeds the configured property capacity.",
    };
  }

  if (args.ratePlan.minNights != null && nights.length < args.ratePlan.minNights) {
    return {
      ...empty,
      bookingEnabled: true,
      available: false,
      reason: `Minimum stay is ${args.ratePlan.minNights} night(s).`,
    };
  }

  if (args.ratePlan.maxNights != null && nights.length > args.ratePlan.maxNights) {
    return {
      ...empty,
      bookingEnabled: true,
      available: false,
      reason: `Maximum stay is ${args.ratePlan.maxNights} night(s).`,
    };
  }

  const weekendDays = args.ratePlan.weekendWeekdays.length
    ? args.ratePlan.weekendWeekdays
    : [0, 6];

  const nightly = nights.map((date) => {
    const exception = (args.exceptions ?? []).find(
      (ex) => date >= ex.startDate && date <= ex.endDate,
    );
    if (exception) {
      return { date, amountMinor: exception.nightlyMinor, kind: "seasonal" as const };
    }
    const dow = isoDayOfWeek(date);
    const weekend = weekendDays.includes(dow);
    return {
      date,
      amountMinor: weekend ? args.ratePlan.weekendMinor! : args.ratePlan.weekdayMinor!,
      kind: weekend ? ("weekend" as const) : ("weekday" as const),
    };
  });

  const subtotalMinor = nightly.reduce((sum, n) => sum + n.amountMinor, 0);
  const taxMinor =
    args.ratePlan.taxBps == null ? 0 : Math.round((subtotalMinor * args.ratePlan.taxBps) / 10000);
  const totalMinor = subtotalMinor + taxMinor;
  const dueNowMinor =
    args.ratePlan.depositBps == null
      ? totalMinor
      : Math.round((totalMinor * args.ratePlan.depositBps) / 10000);

  const lines: QuoteLine[] = [
    { code: "stay", label: `Whole-property stay · ${nights.length} night(s)`, amountMinor: subtotalMinor },
  ];
  if (taxMinor > 0) {
    lines.push({ code: "tax", label: "Taxes (configured)", amountMinor: taxMinor });
  }

  return {
    available: true,
    bookingEnabled: true,
    currency: "INR",
    nights: nights.length,
    nightly,
    lines,
    subtotalMinor,
    taxMinor,
    totalMinor,
    dueNowMinor,
    snapshot: {
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      guests: args.guests,
      nightly,
      lines,
      subtotalMinor,
      taxMinor,
      taxBps: args.ratePlan.taxBps,
      depositBps: args.ratePlan.depositBps,
      totalMinor,
      dueNowMinor,
    },
  };
}

export function formatInrMinor(amountMinor: number | null): string {
  if (amountMinor == null) return "Not published";
  const rupees = amountMinor / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
