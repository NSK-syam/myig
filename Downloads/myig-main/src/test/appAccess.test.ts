import { describe, expect, it } from "vitest";

import {
  createGuestToken,
  createScopedAppToken,
  isAllowedAdminEmail,
  isAllowedOrigin,
  parseAllowedOrigins,
  parseAdminEmailAllowlist,
  verifyGuestToken,
  verifyScopedAppToken,
} from "../../supabase/functions/_shared/app-access.ts";

describe("app access helpers", () => {
  it("only allows listed admin emails", () => {
    const allowlist = parseAdminEmailAllowlist("owner@searchoutfit.com, Admin@Example.com");

    expect(isAllowedAdminEmail("owner@searchoutfit.com", allowlist)).toBe(true);
    expect(isAllowedAdminEmail("admin@example.com", allowlist)).toBe(true);
    expect(isAllowedAdminEmail("viewer@example.com", allowlist)).toBe(false);
  });

  it("creates tokens that validate only for the same scope and client ip", async () => {
    const token = await createScopedAppToken({
      secret: "top-secret",
      clientIp: "203.0.113.42",
      scopes: ["search-products", "ingest-analytics"],
      ttlSeconds: 300,
      now: new Date("2026-03-21T12:00:00.000Z"),
    });

    await expect(
      verifyScopedAppToken({
        token,
        secret: "top-secret",
        clientIp: "203.0.113.42",
        requiredScope: "search-products",
        now: new Date("2026-03-21T12:04:00.000Z"),
      }),
    ).resolves.toBe(true);

    await expect(
      verifyScopedAppToken({
        token,
        secret: "top-secret",
        clientIp: "203.0.113.99",
        requiredScope: "search-products",
        now: new Date("2026-03-21T12:04:00.000Z"),
      }),
    ).rejects.toThrow("invalid for this client");

    await expect(
      verifyScopedAppToken({
        token,
        secret: "top-secret",
        clientIp: "203.0.113.42",
        requiredScope: "analytics-summary",
        now: new Date("2026-03-21T12:04:00.000Z"),
      }),
    ).rejects.toThrow("missing required scope");
  });

  it("allows Cloudflare Pages preview subdomains for the configured project host", () => {
    const allowlist = parseAllowedOrigins();

    expect(isAllowedOrigin("https://67e7028e.find-fit-app.pages.dev", allowlist)).toBe(true);
    expect(isAllowedOrigin("https://searchoutfit.com", allowlist)).toBe(true);
    expect(isAllowedOrigin("https://67e7028e.find-fit-app.pages.dev.evil.example", allowlist)).toBe(false);
  });

  it("creates guest tokens that validate only for the same origin", async () => {
    const token = await createGuestToken({
      guestId: "11111111-1111-1111-1111-111111111111",
      origin: "https://searchoutfit.com",
      secret: "top-secret",
      ttlSeconds: 300,
      now: new Date("2026-03-21T12:00:00.000Z"),
    });

    await expect(
      verifyGuestToken({
        token,
        secret: "top-secret",
        origin: "https://searchoutfit.com",
        now: new Date("2026-03-21T12:04:00.000Z"),
      }),
    ).resolves.toBe("11111111-1111-1111-1111-111111111111");

    await expect(
      verifyGuestToken({
        token,
        secret: "top-secret",
        origin: "https://evil.example",
        now: new Date("2026-03-21T12:04:00.000Z"),
      }),
    ).rejects.toThrow("invalid for this origin");
  });
});
