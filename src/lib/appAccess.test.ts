import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

const {
  clearCachedAppToken,
  getAppFunctionHeaders,
  invokeAppFunction,
} = await import("./appAccess");

describe("appAccess client helpers", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    clearCachedAppToken();
    window.sessionStorage.clear();
  });

  it("retries once with a fresh app token after a token-related 401", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: {
          guestToken: "guest-token",
          guestExpiresAt: "2099-01-30T00:00:00.000Z",
          success: true,
          token: "stale-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Unauthorized",
          context: { status: 401 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          guestToken: "guest-token",
          guestExpiresAt: "2099-01-30T00:00:00.000Z",
          success: true,
          token: "fresh-token",
          expiresAt: "2099-01-01T00:05:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

    const result = await invokeAppFunction("search-products", {
      body: { imageUrl: "https://example.com/look.jpg" },
    });

    expect(result.data).toEqual({ success: true });
    expect(invokeMock.mock.calls[0]?.[0]).toBe("issue-app-token");
    expect(invokeMock).toHaveBeenNthCalledWith(2, "search-products", {
      body: { imageUrl: "https://example.com/look.jpg" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "stale-token" },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, "issue-app-token", {
      body: {
        guestToken: "guest-token",
        scopes: [
          "guest-access-state",
          "upload-image",
          "extract-instagram",
          "analyze-outfit",
          "search-products",
          "ingest-analytics",
        ],
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(4, "search-products", {
      body: { imageUrl: "https://example.com/look.jpg" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "fresh-token" },
    });
  });

  it("reuses a cached token while it is still fresh and persists the guest token", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        guestId: "guest-123",
        guestToken: "guest-token",
        guestExpiresAt: "2099-01-30T00:00:00.000Z",
        success: true,
        token: "cached-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      error: null,
    });

    expect(await getAppFunctionHeaders()).toEqual({
      "x-searchoutfit-guest": "guest-token",
      "x-searchoutfit-token": "cached-token",
    });
    expect(await getAppFunctionHeaders()).toEqual({
      "x-searchoutfit-guest": "guest-token",
      "x-searchoutfit-token": "cached-token",
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("searchoutfit-guest-token")).toContain("guest-token");
  });

  it("retries once with a fresh app token after a generic edge function request failure", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: {
          guestToken: "guest-token",
          guestExpiresAt: "2099-01-30T00:00:00.000Z",
          success: true,
          token: "stale-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Failed to send a request to the Edge Function",
        },
      })
      .mockResolvedValueOnce({
        data: {
          guestToken: "guest-token",
          guestExpiresAt: "2099-01-30T00:00:00.000Z",
          success: true,
          token: "fresh-token",
          expiresAt: "2099-01-01T00:05:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

    const result = await invokeAppFunction("extract-instagram", {
      body: { instagramUrl: "https://www.instagram.com/p/CAROUSEL123/?img_index=7" },
    });

    expect(result.data).toEqual({ success: true });
    expect(invokeMock.mock.calls[0]?.[0]).toBe("issue-app-token");
    expect(invokeMock).toHaveBeenNthCalledWith(2, "extract-instagram", {
      body: { instagramUrl: "https://www.instagram.com/p/CAROUSEL123/?img_index=7" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "stale-token" },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, "issue-app-token", {
      body: {
        guestToken: "guest-token",
        scopes: [
          "guest-access-state",
          "upload-image",
          "extract-instagram",
          "analyze-outfit",
          "search-products",
          "ingest-analytics",
        ],
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(4, "extract-instagram", {
      body: { instagramUrl: "https://www.instagram.com/p/CAROUSEL123/?img_index=7" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "fresh-token" },
    });
  });
});
