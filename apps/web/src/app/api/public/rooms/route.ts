import { json } from "@/lib/http";
import { publicRooms } from "@/lib/store";

export async function GET() {
  return json({ rooms: publicRooms(), notice: "Rooms are informational only and cannot be reserved individually." });
}
