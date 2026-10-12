/** Property calendar dates are civil dates in Asia/Kolkata. */

export const PROPERTY_TIMEZONE = "Asia/Kolkata";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateISO(value: string, field = "date"): string {
  if (!DATE_RE.test(value)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    throw new Error(`${field} is not a valid calendar date`);
  }
  return value;
}

export function addDays(dateISO: string, days: number): string {
  const [y, m, d] = assertDateISO(dateISO).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  return assertDateISO(a).localeCompare(assertDateISO(b));
}

export function todayInPropertyTz(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Inclusive date list from start through end. */
export function enumerateInclusive(start: string, end: string): string[] {
  assertDateISO(start, "start");
  assertDateISO(end, "end");
  if (compareDates(end, start) < 0) {
    throw new Error("end date must be on or after start date");
  }
  const dates: string[] = [];
  let cursor = start;
  while (compareDates(cursor, end) <= 0) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

/** Stay nights: half-open [checkIn, checkOut). */
export function enumerateStayNights(checkIn: string, checkOut: string): string[] {
  assertDateISO(checkIn, "checkIn");
  assertDateISO(checkOut, "checkOut");
  if (compareDates(checkOut, checkIn) <= 0) {
    throw new Error("check-out must be after check-in");
  }
  const nights: string[] = [];
  let cursor = checkIn;
  while (compareDates(cursor, checkOut) < 0) {
    nights.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return nights;
}

export function inclusiveOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return compareDates(aStart, bEnd) <= 0 && compareDates(bStart, aEnd) <= 0;
}

export function halfOpenOverlap(
  aStart: string,
  aEndExclusive: string,
  bStart: string,
  bEndExclusive: string,
): boolean {
  return compareDates(aStart, bEndExclusive) < 0 && compareDates(bStart, aEndExclusive) < 0;
}
