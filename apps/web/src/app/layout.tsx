import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { PublicChrome } from "@/components/PublicChrome";
import { publicSiteUrl } from "@/lib/site";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const site = publicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "V-Farms — A singular escape to nature",
    template: "%s · V-Farms",
  },
  description:
    "A private five-acre dragon fruit farm near Hyderabad for exclusive whole-property stays and private events. All five rooms are included.",
  openGraph: {
    title: "V-Farms — A singular escape to nature",
    description:
      "Exclusive whole-property stays and private events on a five-acre dragon fruit farm near Hyderabad.",
    url: site,
    siteName: "V-Farms",
    images: [{ url: "/images/estate/hero-poster.jpg", alt: "Aerial view of V-Farms at dusk" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "V-Farms — A singular escape to nature",
    images: ["/images/estate/hero-poster.jpg"],
  },
  other: {
    "theme-color": "#09281F",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "V-Farms",
  description:
    "A private five-acre dragon fruit farm near Hyderabad for exclusive whole-property stays and private events.",
  areaServed: "Hyderabad, Telangana, India",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Telangana",
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/images/estate/hero-poster.jpg" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${serif.variable} ${sans.variable} font-sans antialiased`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
