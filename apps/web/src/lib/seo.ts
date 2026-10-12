import type { Metadata } from "next";

export function pageMeta(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} · V-Farms`,
      description,
    },
    twitter: {
      title: `${title} · V-Farms`,
      description,
    },
  };
}
