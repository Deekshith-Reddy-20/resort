import type { MetadataRoute } from "next";
import { isVercelPreview, publicSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteUrl();
  if (isVercelPreview()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/booking/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
