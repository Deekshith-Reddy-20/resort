import { json } from "@/lib/http";
import { publicRooms, runLockedRead } from "@/lib/store";

export async function GET() {
  return json({
    rooms: await runLockedRead(() => publicRooms()),
    notice: "Rooms are informational only and cannot be reserved individually.",
  });
}
