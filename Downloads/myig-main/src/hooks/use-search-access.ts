import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import {
  getSearchAccessState,
  GUEST_SEARCH_LIMIT,
  SearchAccessState,
} from "@/lib/searchAccess";
import { getGuestAccessSummary, getSearchAccessSummary, type SearchAccessSummary } from "@/lib/searchAccessApi";

type AccessSnapshot = {
  guestSearchesUsed: number;
  hasActiveSubscription: boolean;
  isSignedIn: boolean;
  signedInSearchesUsed: number;
  state: SearchAccessState;
};

function createSnapshot(input: {
  guestSearchesUsed: number;
  hasActiveSubscription?: boolean;
  isSignedIn: boolean;
  signedInSearchesUsed: number;
}): AccessSnapshot {
  const state = getSearchAccessState({
    guestSearchLimit: GUEST_SEARCH_LIMIT,
    guestSearchesUsed: input.guestSearchesUsed,
    hasActiveSubscription: input.hasActiveSubscription ?? false,
    isSignedIn: input.isSignedIn,
    signedInSearchesUsed: input.signedInSearchesUsed,
  });

  return {
    guestSearchesUsed: input.guestSearchesUsed,
    hasActiveSubscription: input.hasActiveSubscription ?? false,
    isSignedIn: input.isSignedIn,
    signedInSearchesUsed: input.signedInSearchesUsed,
    state,
  };
}

function createSnapshotFromServerSummary(
  summary: SearchAccessSummary,
  guestSearchesUsed: number,
  isSignedIn: boolean,
): AccessSnapshot {
  return {
    guestSearchesUsed,
    hasActiveSubscription: summary.hasActiveSubscription,
    isSignedIn,
    signedInSearchesUsed: isSignedIn ? summary.freeSearchesUsed : 0,
    state: {
      reason: summary.hasActiveSubscription
        ? "subscriber"
        : isSignedIn
          ? "signed_in_unlimited"
          : summary.status === "allowed"
            ? "guest_remaining"
            : "guest_exhausted",
      status: summary.status,
    },
  };
}

export function useSearchAccess() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<AccessSnapshot>(() =>
    createSnapshot({
      guestSearchesUsed: 0,
      isSignedIn: false,
      signedInSearchesUsed: 0,
    }),
  );

  const refresh = useCallback(async () => {
    if (!user) {
      const summary = await getGuestAccessSummary();
      const nextSnapshot = createSnapshotFromServerSummary(summary, summary.freeSearchesUsed, false);
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    }

    const summary = await getSearchAccessSummary();
    const nextSnapshot = createSnapshotFromServerSummary(summary, 0, true);
    setSnapshot(nextSnapshot);
    return nextSnapshot;
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const consumeLocalGuestSearch = useCallback(async () => {
    return refresh();
  }, [refresh]);

  const consumeSignedInSearch = useCallback(async (input?: {
    metadata?: Record<string, unknown>;
    requestType?: "image_upload" | "instagram_url" | "unknown";
  }) => {
    void input;

    if (!user) {
      const fallbackSnapshot = await refresh();
      return {
        allowed: false,
        reason: "quota_exhausted" as const,
        snapshot: fallbackSnapshot,
      };
    }

    const nextSnapshot = createSnapshot({
      guestSearchesUsed: 0,
      hasActiveSubscription: false,
      isSignedIn: true,
      signedInSearchesUsed: snapshot.signedInSearchesUsed,
    });
    setSnapshot(nextSnapshot);
    return {
      allowed: true,
      reason: "allowed" as const,
      snapshot: nextSnapshot,
    };
  }, [refresh, snapshot.signedInSearchesUsed, user]);

  const resetAccessState = useCallback(() => {
    return refresh();
  }, [refresh]);

  const remainingSearches = useMemo(() => {
    if (snapshot.hasActiveSubscription || snapshot.isSignedIn) return Infinity;
    if (!snapshot.isSignedIn) {
      return Math.max(0, GUEST_SEARCH_LIMIT - snapshot.guestSearchesUsed);
    }
  }, [snapshot.guestSearchesUsed, snapshot.hasActiveSubscription, snapshot.isSignedIn]);

  return {
    consumeLocalGuestSearch,
    consumeSignedInSearch,
    refresh,
    remainingSearches,
    resetAccessState,
    state: snapshot.state,
    usage: snapshot,
  };
}
