import { occupancyConflicts, type Occupancy } from "./conflicts";
import { compareDates, todayInPropertyTz } from "./dates";

export type HoldKind = "stay" | "event";

export interface ActiveHold {
  id: string;
  propertyId: string;
  kind: HoldKind;
  startDate: string;
  endDate: string;
  expiresAt: string;
  reference: string;
}

export interface ConfirmedStay {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  status: "confirmed" | "cancelled" | "checked_in" | "checked_out";
}

export interface ConfirmedEvent {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  status: "confirmed" | "cancelled" | "completed";
}

export interface MaintenanceBlock {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
}

export interface InventorySnapshot {
  stays: ConfirmedStay[];
  events: ConfirmedEvent[];
  holds: ActiveHold[];
  maintenance: MaintenanceBlock[];
  nowIso: string;
}

export function isHoldActive(hold: ActiveHold, nowIso: string): boolean {
  return Date.parse(hold.expiresAt) > Date.parse(nowIso);
}

export function toOccupancies(snapshot: InventorySnapshot, propertyId: string): Occupancy[] {
  const now = snapshot.nowIso;
  const occupancies: Occupancy[] = [];

  for (const stay of snapshot.stays) {
    if (stay.propertyId !== propertyId) continue;
    if (stay.status === "cancelled") continue;
    occupancies.push({ kind: "stay", startDate: stay.checkIn, endDate: stay.checkOut });
  }
  for (const event of snapshot.events) {
    if (event.propertyId !== propertyId) continue;
    if (event.status === "cancelled") continue;
    occupancies.push({ kind: "event", startDate: event.startDate, endDate: event.endDate });
  }
  for (const hold of snapshot.holds) {
    if (hold.propertyId !== propertyId) continue;
    if (!isHoldActive(hold, now)) continue;
    occupancies.push({
      kind: hold.kind === "stay" ? "stay" : "event",
      startDate: hold.startDate,
      endDate: hold.endDate,
    });
  }
  for (const block of snapshot.maintenance) {
    if (block.propertyId !== propertyId) continue;
    occupancies.push({ kind: "maintenance", startDate: block.startDate, endDate: block.endDate });
  }
  return occupancies;
}

export function canAllocate(
  proposed: Occupancy,
  snapshot: InventorySnapshot,
  propertyId: string,
  ignoreHoldId?: string,
): { ok: true } | { ok: false; code?: string; message: string } {
  const occupancies = toOccupancies(
    {
      ...snapshot,
      holds: snapshot.holds.filter((h) => h.id !== ignoreHoldId),
    },
    propertyId,
  );
  for (const existing of occupancies) {
    const result = occupancyConflicts(proposed, existing);
    if (!result.ok) {
      return { ok: false, code: result.code, message: result.message ?? "Dates are unavailable." };
    }
  }
  return { ok: true };
}

export function validateStayWindow(checkIn: string, checkOut: string, now = new Date()): string | null {
  const today = todayInPropertyTz(now);
  if (compareDates(checkIn, today) < 0) return "Check-in cannot be in the past.";
  if (compareDates(checkOut, checkIn) <= 0) return "Check-out must be after check-in.";
  return null;
}

/**
 * Late payment after hold expiry: never auto-confirm if inventory is gone (INV-07).
 */
export function resolveLatePayment(args: {
  hold: ActiveHold | undefined;
  snapshot: InventorySnapshot;
  propertyId: string;
  proposed: Occupancy;
  nowIso: string;
}): "confirm" | "paid_unbooked" {
  if (args.hold && isHoldActive(args.hold, args.nowIso)) {
    const available = canAllocate(args.proposed, args.snapshot, args.propertyId, args.hold.id);
    return available.ok ? "confirm" : "paid_unbooked";
  }
  const available = canAllocate(args.proposed, args.snapshot, args.propertyId);
  return available.ok ? "confirm" : "paid_unbooked";
}
