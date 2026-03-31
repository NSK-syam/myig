import { beforeEach, describe, expect, it, vi } from "vitest";

describe("auth URL helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
  });

  it("prefers an explicit auth redirect URL when configured", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));
    vi.stubEnv("VITE_SUPABASE_AUTH_REDIRECT_URL", "searchoutfit://auth/callback");
    const { buildAuthRedirectUrl } = await import("@/lib/auth");

    expect(buildAuthRedirectUrl()).toBe("searchoutfit://auth/callback");
  });

  it("uses the native app callback URL when running inside the iOS shell", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    const { buildAuthRedirectUrl } = await import("@/lib/auth");

    expect(buildAuthRedirectUrl()).toBe("searchoutfit://auth/callback");
  });

  it("builds an explicit native app URL for deep-link handoff", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));
    const { buildNativeAppUrl } = await import("@/lib/auth");

    expect(buildNativeAppUrl("/auth/callback?code=123#token")).toBe("searchoutfit://auth/callback?code=123#token");
  });

  it("falls back to the homepage when no auth return path is stored", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));
    const { readAuthReturnTo } = await import("@/lib/auth");

    expect(readAuthReturnTo()).toBe("/");
  });

  it("migrates legacy auth return paths before using the homepage fallback", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));
    window.sessionStorage.setItem("findfit-auth-return-to", "/saved");
    const { readAuthReturnTo } = await import("@/lib/auth");

    expect(readAuthReturnTo()).toBe("/saved");
  });
});
