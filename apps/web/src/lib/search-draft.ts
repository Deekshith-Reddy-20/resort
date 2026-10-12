export type StayDraft = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  eventType?: string;
  attendees?: string;
};

const KEY = "vfarms.search-draft";

export function readStayDraft(): StayDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StayDraft;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeStayDraft(partial: StayDraft) {
  if (typeof window === "undefined") return;
  const next = { ...readStayDraft(), ...partial };
  sessionStorage.setItem(KEY, JSON.stringify(next));
}
