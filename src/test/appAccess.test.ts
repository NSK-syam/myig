import { describe, expect, it } from "vitest";

import {
  buildAppCorsHeaders,
  buildAuthenticatedCorsHeaders,
  createGuestToken,
  createProofOfWorkChallengeToken,
  createSignedImageProxyToken,
  createScopedAppToken,
  isAllowedAdminEmail,
  isAllowedOrigin,
  parseAllowedOrigins,
  parseAdminEmailAllowlist,
  verifyGuestToken,
  verifyProofOfWorkChallengeToken,
  verifySignedImageProxyToken,
  verifyScopedAppToken,
} from "../../supabase/functions/_shared/app-access.ts";

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function solveChallenge(token: string, difficulty: number): Promise<string> {
  for (let candidate = 0; candidate < 50_000; candidate += 1) {
    const solution = candidate.toString(16);
    const digest = await sha256Hex(`${token}.${solution}`);
    if (digest.startsWith("0".repeat(difficulty))) {
      return solution;
    }
  }

  throw new Error("Could not solve proof-of-work challenge in test");
}

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

  it("builds origin-scoped CORS headers for app and authenticated flows", () => {
    const appHeaders = buildAppCorsHeaders("https://preview.find-fit-app.pages.dev");
    const authHeaders = buildAuthenticatedCorsHeaders("https://searchoutfit.com");

    expect(appHeaders["Access-Control-Allow-Origin"]).toBe("https://preview.find-fit-app.pages.dev");
    expect(appHeaders["Access-Control-Allow-Headers"]).toContain("x-searchoutfit-token");
    expect(appHeaders["Access-Control-Allow-Headers"]).toContain("x-searchoutfit-guest");
    expect(authHeaders["Access-Control-Allow-Origin"]).toBe("https://searchoutfit.com");
    expect(authHeaders["Access-Control-Allow-Headers"]).not.toContain("x-searchoutfit-token");
    expect(authHeaders["Vary"]).toBe("Origin");
  });

  it("creates proof-of-work challenge tokens that validate only for the same client and origin", async () => {
    const token = await createProofOfWorkChallengeToken({
      secret: "top-secret",
      clientIp: "203.0.113.42",
      difficulty: 1,
      ttlSeconds: 300,
      now: new Date("2026-03-31T12:00:00.000Z"),
      origin: "https://searchoutfit.com",
    });
    const solution = await solveChallenge(token, 1);

    await expect(
      verifyProofOfWorkChallengeToken({
        token,
        solution,
        secret: "top-secret",
        clientIp: "203.0.113.42",
        origin: "https://searchoutfit.com",
        now: new Date("2026-03-31T12:00:10.000Z"),
      }),
    ).resolves.toBe(true);

    await expect(
      verifyProofOfWorkChallengeToken({
        token,
        solution,
        secret: "top-secret",
        clientIp: "203.0.113.99",
        origin: "https://searchoutfit.com",
        now: new Date("2026-03-31T12:00:10.000Z"),
      }),
    ).rejects.toThrow("invalid for this client");
  });

  it("creates signed image proxy tokens that validate only for the same origin", async () => {
    const token = await createSignedImageProxyToken({
      secret: "top-secret",
      imageUrl: "https://cdn.example.com/products/top.jpg",
      merchantUrl: "https://shop.example.com/products/top",
      ttlSeconds: 300,
      now: new Date("2026-03-31T12:00:00.000Z"),
      origin: "https://searchoutfit.com",
    });

    await expect(
      verifySignedImageProxyToken({
        token,
        secret: "top-secret",
        origin: "https://searchoutfit.com",
        now: new Date("2026-03-31T12:00:10.000Z"),
      }),
    ).resolves.toEqual({
      imageUrl: "https://cdn.example.com/products/top.jpg",
      merchantUrl: "https://shop.example.com/products/top",
    });

    await expect(
      verifySignedImageProxyToken({
        token,
        secret: "top-secret",
        origin: "https://evil.example",
        now: new Date("2026-03-31T12:00:10.000Z"),
      }),
    ).rejects.toThrow("invalid for this origin");
  });
});
