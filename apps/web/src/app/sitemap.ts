import type { MetadataRoute } from "next";
import { ROOMS } from "@/lib/content";
import { publicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl();
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
    "/legal",
    "/booking",
    ...ROOMS.map((room) => `/rooms/${room.slug}`),
  ];
  return paths.map((path) => ({ url: `${base}${path}` }));
}
