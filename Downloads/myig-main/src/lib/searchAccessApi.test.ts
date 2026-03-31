import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const invokeAppFunctionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

vi.mock("@/lib/appAccess", () => ({
  invokeAppFunction: (...args: unknown[]) => invokeAppFunctionMock(...args),
}));

const {
  consumeSearch,
  getGuestAccessSummary,
} = await import("./searchAccessApi");

describe("searchAccessApi", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeAppFunctionMock.mockReset();
  });

  it("maps an exhausted guest backend response to the auth gate state", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: {
        success: true,
        active_entitlement: null,
        free_search_limit: 3,
        free_searches_used: 3,
        has_active_subscription: false,
        remaining_searches: 0,
      },
      error: null,
    });

    await expect(getGuestAccessSummary()).resolves.toMatchObject({
      freeSearchLimit: 3,
      freeSearchesUsed: 3,
      hasActiveSubscription: false,
      remainingSearches: 0,
      status: "auth_required",
    });
  });

  it("keeps signed-in backend summaries in the allowed state even when the legacy counter reaches zero", async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        active_entitlement: null,
        free_search_limit: 7,
        free_searches_used: 7,
        has_active_subscription: false,
        remaining_searches: 0,
      },
      error: null,
    });

    await expect(consumeSearch({ requestType: "instagram_url" })).resolves.toMatchObject({
      allowed: true,
      reason: "allowed",
      freeSearchLimit: 7,
      freeSearchesUsed: 7,
      hasActiveSubscription: false,
      remainingSearches: 0,
      status: "allowed",
    });
  });
});
