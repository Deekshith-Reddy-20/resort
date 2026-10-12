import { describe, expect, it } from "vitest";
import { publicRooms } from "../src/lib/store";

describe("G01 rooms are informational", () => {
  it("never exposes a bookable room", () => {
    const rooms = publicRooms();
    expect(rooms).toHaveLength(5);
    expect(rooms.every((room) => room.bookable === false)).toBe(true);
    expect(rooms.every((room) => room.notice.includes("exclusive estate booking"))).toBe(true);
  });

  it("publishes five distinct owner-supplied bedroom photographs", () => {
    const rooms = publicRooms();
    expect(rooms.every((room) => room.photographPublished === true)).toBe(true);
    expect(new Set(rooms.map((room) => room.image)).size).toBe(5);
    expect(rooms.every((room) => room.image?.startsWith("/images/rooms/"))).toBe(true);
  });
});
