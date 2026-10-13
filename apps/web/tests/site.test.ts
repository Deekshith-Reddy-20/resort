import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isVercelPreview, publicSiteUrl } from "../src/lib/site";

describe("publicSiteUrl", () => {
  const keys = ["NEXT_PUBLIC_SITE_URL", "VERCEL_URL", "VERCEL_ENV", "VERCEL"] as const;
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) previous[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("prefers an explicit https origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.vercel.app/";
    process.env.VERCEL_URL = "ignored.vercel.app";
    expect(publicSiteUrl()).toBe("https://example.vercel.app");
  });

  it("uses VERCEL_URL when the public site URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "resort-git-main-team.vercel.app";
    expect(publicSiteUrl()).toBe("https://resort-git-main-team.vercel.app");
  });

  it("does not index Vercel preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    expect(isVercelPreview()).toBe(true);
  });
});
