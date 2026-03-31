import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string },
}));

const accessApiState = vi.hoisted(() => ({
  getGuestAccessSummary: vi.fn(),
  getSearchAccessSummary: vi.fn(),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    loading: false,
    session: null,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    user: authState.user,
  }),
}));

vi.mock("@/lib/searchAccessApi", () => ({
  getGuestAccessSummary: (...args: unknown[]) => accessApiState.getGuestAccessSummary(...args),
  getSearchAccessSummary: (...args: unknown[]) => accessApiState.getSearchAccessSummary(...args),
}));

import { useSearchAccess } from "@/hooks/use-search-access";

describe("useSearchAccess", () => {
  beforeEach(() => {
    authState.user = null;
    accessApiState.getGuestAccessSummary.mockReset();
    accessApiState.getSearchAccessSummary.mockReset();
    window.localStorage.clear();
  });

  it("hydrates guest access state from the backend summary", async () => {
    accessApiState.getGuestAccessSummary.mockResolvedValue({
      freeSearchLimit: 3,
      freeSearchesUsed: 1,
      hasActiveSubscription: false,
      remainingSearches: 2,
      status: "allowed",
    });

    const { result } = renderHook(() => useSearchAccess());

    await act(async () => {
      await result.current.refresh();
    });

    expect(accessApiState.getGuestAccessSummary).toHaveBeenCalled();
    expect(result.current.state.status).toBe("allowed");
    expect(result.current.remainingSearches).toBe(2);
  });

  it("moves guests to the auth-required state after the third server-backed search", async () => {
    accessApiState.getGuestAccessSummary.mockResolvedValue({
      freeSearchLimit: 3,
      freeSearchesUsed: 3,
      hasActiveSubscription: false,
      remainingSearches: 0,
      status: "auth_required",
    });

    const { result } = renderHook(() => useSearchAccess());

    await act(async () => {
      await result.current.refresh();
    });

    expect(accessApiState.getGuestAccessSummary).toHaveBeenCalled();
    expect(result.current.state).toEqual({
      reason: "guest_exhausted",
      status: "auth_required",
    });
    expect(result.current.remainingSearches).toBe(0);
  });

  it("keeps signed-in users allowed with unlimited searches after auth", async () => {
    authState.user = { id: "user-123" };
    accessApiState.getSearchAccessSummary.mockResolvedValue({
      freeSearchLimit: 7,
      freeSearchesUsed: 6,
      hasActiveSubscription: false,
      remainingSearches: null,
      status: "allowed",
    });

    const { result } = renderHook(() => useSearchAccess());

    await act(async () => {
      await result.current.refresh();
    });

    expect(accessApiState.getSearchAccessSummary).toHaveBeenCalled();
    expect(result.current.remainingSearches).toBe(Number.POSITIVE_INFINITY);
    expect(result.current.state.status).toBe("allowed");

    await act(async () => {
      await result.current.consumeSignedInSearch();
    });

    expect(result.current.remainingSearches).toBe(Number.POSITIVE_INFINITY);
    expect(result.current.state).toEqual({
      reason: "signed_in_unlimited",
      status: "allowed",
    });
  });
});
