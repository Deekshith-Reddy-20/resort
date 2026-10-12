import { json } from "@/lib/http";
import { BRAND } from "@/lib/content";

export async function GET() {
  return json({
    heroEyebrow: "THE ESTATE",
    heroTitle: "V-FARMS",
    heroTagline: "A singular escape to nature.",
    heroBody: BRAND.property,
    ctas: [
      { href: "/estate", label: "Explore the Estate" },
      { href: "/stays", label: "Plan Your Stay" },
      { href: "/events", label: "Host an Event" },
    ],
  });
}
