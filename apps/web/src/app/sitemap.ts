import type { MetadataRoute } from "next";
import { ROOMS } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = [
    "",
    "/estate",
    "/rooms",
    "/stays",
    "/events",
    "/gallery",
    "/experiences",
    "/about",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/cancellation-policy",
    "/event-terms",
    "/booking",
    ...ROOMS.map((room) => `/rooms/${room.slug}`),
  ];
  return paths.map((path) => ({ url: `${base}${path}` }));
}
