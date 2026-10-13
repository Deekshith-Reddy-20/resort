import { json, persistCatch } from "@/lib/http";
import { publicRooms, runLockedRead } from "@/lib/store";

export async function GET() {
  try {
    return json({
      rooms: await runLockedRead(() => publicRooms()),
      notice: "Rooms are informational only and cannot be reserved individually.",
    });
  } catch (e) {
    return persistCatch(e, "Rooms could not be loaded.");
  }
}
