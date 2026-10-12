import { describe, expect, it } from "vitest";
import { publicRooms } from "../src/lib/store";

describe("G01 rooms are informational", () => {
  it("never exposes a bookable room", () => {
    const rooms = publicRooms();
    expect(rooms).toHaveLength(5);
    expect(rooms.every((room) => room.bookable === false)).toBe(true);
    expect(rooms.every((room) => room.notice.includes("exclusive estate booking"))).toBe(true);
  });

  it("does not publish unverified bedroom photographs", () => {
    const rooms = publicRooms();
    expect(rooms.every((room) => room.photographPublished === false)).toBe(true);
    expect(rooms.every((room) => room.image === null)).toBe(true);
  });
});
