import { describe, expect, it } from "vitest";

import { getSearchAccessState } from "@/lib/searchAccess";

describe("getSearchAccessState", () => {
  it("allows guests while under the guest limit", () => {
    expect(
      getSearchAccessState({
        guestSearchesUsed: 2,
        guestSearchLimit: 3,
        hasActiveSubscription: false,
        isSignedIn: false,
        signedInSearchesUsed: 0,
      }),
    ).toMatchObject({
      reason: "guest_remaining",
      status: "allowed",
    });
  });

  it("requires auth when the guest limit is exhausted", () => {
    expect(
      getSearchAccessState({
        guestSearchesUsed: 3,
        guestSearchLimit: 3,
        hasActiveSubscription: false,
        isSignedIn: false,
        signedInSearchesUsed: 0,
      }),
    ).toMatchObject({
      reason: "guest_exhausted",
      status: "auth_required",
    });
  });

  it("continues allowing signed-in users after the legacy free limit is exhausted", () => {
    expect(
      getSearchAccessState({
        guestSearchesUsed: 3,
        guestSearchLimit: 3,
        hasActiveSubscription: false,
        isSignedIn: true,
        signedInSearchesUsed: 7,
      }),
    ).toMatchObject({
      reason: "signed_in_unlimited",
      status: "allowed",
    });
  });

  it("always allows active subscribers", () => {
    expect(
      getSearchAccessState({
        guestSearchesUsed: 99,
        guestSearchLimit: 3,
        hasActiveSubscription: true,
        isSignedIn: true,
        signedInSearchesUsed: 99,
      }),
    ).toMatchObject({
      reason: "subscriber",
      status: "allowed",
    });
  });
});
