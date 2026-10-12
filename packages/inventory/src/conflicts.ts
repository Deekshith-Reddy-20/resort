import {
  compareDates,
  enumerateInclusive,
  enumerateStayNights,
  halfOpenOverlap,
  inclusiveOverlap,
} from "./dates";

/**
 * V-Farms is one property-wide booking inventory for both stays and events.
 *
 * INV-01 One sellable inventory entity: the entire property.
 * INV-02 Confirmed stays cannot overlap booked nights [checkIn, checkOut).
 * INV-03 Events cannot overlap confirmed stays, events, active holds, or maintenance.
 * INV-04 Conservative MVP: an event also cannot use a stay arrival or departure date.
 * INV-05 Back-to-back stays may share a checkout/check-in date when turnover is allowed.
 * INV-08 Soft event enquiries never create hard holds.
 */

export type OccupancyKind = "stay" | "event" | "maintenance";

export interface Occupancy {
  kind: OccupancyKind;
  startDate: string;
  endDate: string;
  /** For stays, endDate is exclusive checkout. For events/maintenance, endDate is inclusive. */
}

export type ConflictCode =
  | "STAY_OVERLAP"
  | "EVENT_STAY_OVERLAP"
  | "EVENT_EVENT_OVERLAP"
  | "MAINTENANCE_OVERLAP"
  | "INVALID_RANGE";

export interface ConflictResult {
  ok: boolean;
  code?: ConflictCode;
  message?: string;
}

export function stayConflictsStay(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
): boolean {
  return halfOpenOverlap(a.checkIn, a.checkOut, b.checkIn, b.checkOut);
}

/**
 * Event dates are inclusive. Conservative policy treats stay arrival AND departure
 * as blocked for events (INV-04), i.e. overlap against [checkIn, checkOut] inclusive.
 */
export function eventConflictsStay(
  event: { startDate: string; endDate: string },
  stay: { checkIn: string; checkOut: string },
): boolean {
  return inclusiveOverlap(event.startDate, event.endDate, stay.checkIn, stay.checkOut);
}

export function eventConflictsEvent(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
): boolean {
  return inclusiveOverlap(a.startDate, a.endDate, b.startDate, b.endDate);
}

export function occupancyConflicts(proposed: Occupancy, existing: Occupancy): ConflictResult {
  if (proposed.kind === "stay") {
    if (compareDates(proposed.endDate, proposed.startDate) <= 0) {
      return { ok: false, code: "INVALID_RANGE", message: "Stay check-out must be after check-in." };
    }
    if (existing.kind === "stay") {
      const conflict = stayConflictsStay(
        { checkIn: proposed.startDate, checkOut: proposed.endDate },
        { checkIn: existing.startDate, checkOut: existing.endDate },
      );
      return conflict
        ? { ok: false, code: "STAY_OVERLAP", message: "Those dates are already reserved for a stay." }
        : { ok: true };
    }
    if (existing.kind === "event") {
      const conflict = eventConflictsStay(
        { startDate: existing.startDate, endDate: existing.endDate },
        { checkIn: proposed.startDate, checkOut: proposed.endDate },
      );
      return conflict
        ? {
            ok: false,
            code: "EVENT_STAY_OVERLAP",
            message: "Those dates conflict with an exclusive event, including arrival or departure dates.",
          }
        : { ok: true };
    }
    const conflict = eventConflictsStay(
      { startDate: existing.startDate, endDate: existing.endDate },
      { checkIn: proposed.startDate, checkOut: proposed.endDate },
    );
    return conflict
      ? { ok: false, code: "MAINTENANCE_OVERLAP", message: "The property is closed on those dates." }
      : { ok: true };
  }

  if (compareDates(proposed.endDate, proposed.startDate) < 0) {
    return { ok: false, code: "INVALID_RANGE", message: "Event end date must be on or after start date." };
  }

  if (existing.kind === "stay") {
    const conflict = eventConflictsStay(
      { startDate: proposed.startDate, endDate: proposed.endDate },
      { checkIn: existing.startDate, checkOut: existing.endDate },
    );
    return conflict
      ? {
          ok: false,
          code: "EVENT_STAY_OVERLAP",
          message: "An event cannot share a date with a stay, including arrival or departure.",
        }
      : { ok: true };
  }

  if (existing.kind === "event") {
    const conflict = eventConflictsEvent(
      { startDate: proposed.startDate, endDate: proposed.endDate },
      { startDate: existing.startDate, endDate: existing.endDate },
    );
    return conflict
      ? { ok: false, code: "EVENT_EVENT_OVERLAP", message: "Those dates are already reserved for an event." }
      : { ok: true };
  }

  const conflict = eventConflictsEvent(
    { startDate: proposed.startDate, endDate: proposed.endDate },
    { startDate: existing.startDate, endDate: existing.endDate },
  );
  return conflict
    ? { ok: false, code: "MAINTENANCE_OVERLAP", message: "The property is closed on those dates." }
    : { ok: true };
}

export function findConflicts(proposed: Occupancy, existing: Occupancy[]): ConflictResult {
  for (const block of existing) {
    const result = occupancyConflicts(proposed, block);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function occupiedDatesFor(block: Occupancy): string[] {
  if (block.kind === "stay") {
    return enumerateStayNights(block.startDate, block.endDate);
  }
  return enumerateInclusive(block.startDate, block.endDate);
}
