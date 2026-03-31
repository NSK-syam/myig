export const GUEST_SEARCH_LIMIT = 3;

export type SearchAccessInput = {
  guestSearchesUsed: number;
  guestSearchLimit?: number;
  hasActiveSubscription: boolean;
  isSignedIn: boolean;
  signedInSearchesUsed: number;
};

export type SearchAccessState =
  | { status: "allowed"; reason: "guest_remaining" | "signed_in_unlimited" | "subscriber" }
  | { status: "auth_required"; reason: "guest_exhausted" };

export function getSearchAccessState(input: SearchAccessInput): SearchAccessState {
  if (input.hasActiveSubscription) {
    return { reason: "subscriber", status: "allowed" };
  }

  const guestLimit = input.guestSearchLimit ?? GUEST_SEARCH_LIMIT;
  if (!input.isSignedIn) {
    return input.guestSearchesUsed < guestLimit
      ? { reason: "guest_remaining", status: "allowed" }
      : { reason: "guest_exhausted", status: "auth_required" };
  }

  return { reason: "signed_in_unlimited", status: "allowed" };
}
