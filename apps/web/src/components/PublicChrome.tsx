"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileDock } from "@/components/MobileDock";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  if (admin) {
    return <div id="main">{children}</div>;
  }
  return (
    <>
      <SiteHeader />
      <div id="main" className="pb-24 text-charcoal md:pb-0">
        {children}
      </div>
      <SiteFooter />
      <MobileDock />
    </>
  );
}
