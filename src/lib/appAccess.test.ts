import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_URL: "https://uqrxaffgnmnaewaaqmmh.supabase.co",
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

const originalFetch = global.fetch;
global.fetch = fetchMock as typeof fetch;

const {
  clearCachedAppToken,
  getAppFunctionHeaders,
  invokeAppFunction,
} = await import("./appAccess");

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("appAccess client helpers", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fetchMock.mockReset();
    clearCachedAppToken();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("retries once with a fresh app token after a token-related 401", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        guestToken: "guest-token",
        guestExpiresAt: "2099-01-30T00:00:00.000Z",
        success: true,
        token: "stale-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }))
      .mockResolvedValueOnce(jsonResponse({
        guestToken: "guest-token",
        guestExpiresAt: "2099-01-30T00:00:00.000Z",
        success: true,
        token: "fresh-token",
        expiresAt: "2099-01-01T00:05:00.000Z",
      }));

    invokeMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Unauthorized",
          context: { status: 401 },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

    const result = await invokeAppFunction("search-products", {
      body: { imageUrl: "https://example.com/look.jpg" },
    });

    expect(result.data).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenNthCalledWith(1, "search-products", {
      body: { imageUrl: "https://example.com/look.jpg" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "stale-token" },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "search-products", {
      body: { imageUrl: "https://example.com/look.jpg" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "fresh-token" },
    });
  });

  it("reuses a cached token while it is still fresh and persists the guest token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      guestId: "guest-123",
      guestToken: "guest-token",
      guestExpiresAt: "2099-01-30T00:00:00.000Z",
      success: true,
      token: "cached-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    }));

    expect(await getAppFunctionHeaders()).toEqual({
      "x-searchoutfit-guest": "guest-token",
      "x-searchoutfit-token": "cached-token",
    });
    expect(await getAppFunctionHeaders()).toEqual({
      "x-searchoutfit-guest": "guest-token",
      "x-searchoutfit-token": "cached-token",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("searchoutfit-guest-token")).toContain("guest-token");
  });

  it("solves the issue-app-token proof-of-work challenge automatically", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        code: "challenge_required",
        challengeToken: "challenge-token",
        difficulty: 1,
        error: "Challenge required.",
        expiresAt: "2099-01-01T00:00:30.000Z",
      }, 403))
      .mockResolvedValueOnce(jsonResponse({
        guestToken: "guest-token",
        guestExpiresAt: "2099-01-30T00:00:00.000Z",
        success: true,
        token: "challenge-token-issued",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }));

    expect(await getAppFunctionHeaders()).toEqual({
      "x-searchoutfit-guest": "guest-token",
      "x-searchoutfit-token": "challenge-token-issued",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const secondBody = JSON.parse(String(secondRequest.body)) as Record<string, string>;
    expect(secondBody.challengeToken).toBe("challenge-token");
    expect(typeof secondBody.challengeSolution).toBe("string");
    expect(secondBody.challengeSolution.length).toBeGreaterThan(0);
  });

  it("retries once with a fresh app token after a generic edge function request failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        guestToken: "guest-token",
        guestExpiresAt: "2099-01-30T00:00:00.000Z",
        success: true,
        token: "stale-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }))
      .mockResolvedValueOnce(jsonResponse({
        guestToken: "guest-token",
        guestExpiresAt: "2099-01-30T00:00:00.000Z",
        success: true,
        token: "fresh-token",
        expiresAt: "2099-01-01T00:05:00.000Z",
      }));

    invokeMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Failed to send a request to the Edge Function",
        },
      })
      .mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

    const result = await invokeAppFunction("extract-instagram", {
      body: { instagramUrl: "https://www.instagram.com/p/CAROUSEL123/?img_index=7" },
    });

    expect(result.data).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenNthCalledWith(1, "extract-instagram", {
      body: { instagramUrl: "https://www.instagram.com/p/CAROUSEL123/?img_index=7" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "stale-token" },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "extract-instagram", {
      body: { instagramUrl: "https://www.instagram.com/p/CAROUSEL123/?img_index=7" },
      headers: { "x-searchoutfit-guest": "guest-token", "x-searchoutfit-token": "fresh-token" },
    });
  });
});
