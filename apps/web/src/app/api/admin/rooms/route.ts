import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { publicRooms, runLocked, runLockedRead, updateRoomMedia } from "@/lib/store";

const schema = z.object({
  slug: z.enum(["room-1", "room-2", "room-3", "room-4", "room-5"]),
  image: z.string().nullable().optional(),
  photographPublished: z.boolean().optional(),
  publishedSummary: z.string().max(400).optional(),
  publishedName: z.string().max(80).optional(),
});

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  return json({
    rooms: await runLockedRead(() => publicRooms()),
    note: "The estate video does not contain five distinct bedroom interiors. Publish photographs only from owner-approved files under /images/.",
  });
}

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "content") && staff.role !== "owner" && staff.role !== "admin") {
    return error("Forbidden.", 403);
  }
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = await runLocked(() => updateRoomMedia(parsed.data.slug, parsed.data, staff.email));
  if (!result.ok) return error(result.error, 400);
  return json(result);
}
