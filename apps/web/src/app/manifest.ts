import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "V-Farms",
    short_name: "V-Farms",
    description: "Exclusive whole-property stays and events at V-Farms.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F5ED",
    theme_color: "#09281F",
    icons: [{ src: "/images/estate/hero-poster.jpg", sizes: "192x192", type: "image/jpeg" }],
  };
}
