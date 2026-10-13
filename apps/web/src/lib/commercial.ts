export type SeasonalRate = {
  startDate: string;
  endDate: string;
  nightlyMinor: number;
};

export type CommercialSettings = {
  weekdayMinor: number | null;
  weekendMinor: number | null;
  seasonal: SeasonalRate[];
  taxBps: number | null;
  depositBps: number | null;
  maxGuests: number | null;
  minNights: number | null;
  maxNights: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  cancellationSummary: string | null;
  termsConfirmed: boolean;
  privacyConfirmed: boolean;
  holdMinutes: number;
  minAdvanceDays: number | null;
  maxAdvanceDays: number | null;
  closedToArrival: string[];
};

export function emptyCommercial(): CommercialSettings {
  return {
    weekdayMinor: null,
    weekendMinor: null,
    seasonal: [],
    taxBps: null,
    depositBps: null,
    maxGuests: null,
    minNights: null,
    maxNights: null,
    checkInTime: null,
    checkOutTime: null,
    cancellationSummary: null,
    termsConfirmed: false,
    privacyConfirmed: false,
    holdMinutes: Number(process.env.HOLD_MINUTES ?? 15),
    minAdvanceDays: null,
    maxAdvanceDays: null,
    closedToArrival: [],
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function stayConfigGaps(config: CommercialSettings | null): string[] {
  if (!config) {
    return ["No stay configuration has been published by the owner."];
  }
  const missing: string[] = [];
  if (config.weekdayMinor == null || config.weekdayMinor < 1) {
    missing.push("Whole-property weekday nightly rate");
  }
  if (config.weekendMinor == null || config.weekendMinor < 1) {
    missing.push("Whole-property weekend nightly rate");
  }
  if (config.taxBps == null || config.taxBps < 0 || config.taxBps > 10000) {
    missing.push("Tax rate in basis points (0 is allowed if no tax applies)");
  }
  if (config.depositBps == null || config.depositBps < 0 || config.depositBps > 10000) {
    missing.push("Deposit / amount-due-now in basis points (10000 = pay in full)");
  }
  if (config.maxGuests == null || config.maxGuests < 1) {
    missing.push("Maximum overnight guest capacity");
  }
  if (config.minNights == null || config.minNights < 1) {
    missing.push("Minimum stay length in nights");
  }
  if (config.maxNights == null || config.maxNights < 1) {
    missing.push("Maximum stay length in nights");
  }
  if (config.minNights != null && config.maxNights != null && config.maxNights < config.minNights) {
    missing.push("Maximum stay must be greater than or equal to minimum stay");
  }
  if (!config.checkInTime || !TIME.test(config.checkInTime)) {
    missing.push("Check-in time (HH:MM)");
  }
  if (!config.checkOutTime || !TIME.test(config.checkOutTime)) {
    missing.push("Check-out time (HH:MM)");
  }
  if (!config.cancellationSummary || config.cancellationSummary.trim().length < 20) {
    missing.push("Cancellation and refund policy text");
  }
  if (!config.termsConfirmed) {
    missing.push("Owner confirmation that the terms of stay apply at checkout");
  }
  if (!config.privacyConfirmed) {
    missing.push("Owner confirmation that the privacy policy applies at checkout");
  }
  if (!Number.isFinite(config.holdMinutes) || config.holdMinutes < 5 || config.holdMinutes > 120) {
    missing.push("Reservation hold duration (5–120 minutes)");
  }
  config.seasonal.forEach((row, index) => {
    if (!row.startDate || !row.endDate || row.endDate < row.startDate) {
      missing.push(`Seasonal rate ${index + 1}: valid start and end dates`);
    }
    if (!Number.isFinite(row.nightlyMinor) || row.nightlyMinor < 1) {
      missing.push(`Seasonal rate ${index + 1}: nightly amount`);
    }
  });
  return missing;
}

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function minorToRupees(minor: number | null): number | "" {
  if (minor == null) return "";
  return minor / 100;
}
