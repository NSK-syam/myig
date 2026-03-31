import { invokeAppFunction } from "@/lib/appAccess";
import { supabase } from "@/integrations/supabase/client";
import type { SearchAccessState } from "@/lib/searchAccess";

type BackendActiveEntitlement = {
  expires_at: string | null;
  product_id: string | null;
  purchase_source: string | null;
  renewal_period: string | null;
  status: string;
  verified_at: string | null;
  will_renew: boolean | null;
};

type BackendSearchAccessState = {
  active_entitlement: BackendActiveEntitlement | null;
  free_search_limit: number;
  free_searches_used: number;
  has_active_subscription: boolean;
  remaining_searches: number | null;
};

export type SearchAccessSummary = {
  activeProductId: string | null;
  entitlementIdentifier: string | null;
  expiresAt: string | null;
  freeSearchLimit: number;
  freeSearchesUsed: number;
  hasActiveSubscription: boolean;
  remainingSearches: number | null;
  status: SearchAccessState["status"];
  willRenew: boolean;
};

export type ConsumeSearchResult = SearchAccessSummary & {
  allowed: boolean;
  reason: "allowed" | "quota_exhausted";
};

type ConsumeSearchInput = {
  metadata?: Record<string, unknown>;
  requestType?: "image_upload" | "instagram_url" | "unknown";
};

function assertSuccessResponse<T extends Record<string, unknown>>(data: T | null, fallbackMessage: string): T {
  if (!data || data.success !== true) {
    const errorMessage = data && typeof data.error === "string" ? data.error : fallbackMessage;
    throw new Error(errorMessage);
  }

  return data;
}

function mapStatus(input: BackendSearchAccessState): SearchAccessState["status"] {
  return "allowed";
}

function mapSummary(input: BackendSearchAccessState): SearchAccessSummary {
  return {
    activeProductId: input.active_entitlement?.product_id ?? null,
    entitlementIdentifier: input.active_entitlement?.status ?? null,
    expiresAt: input.active_entitlement?.expires_at ?? null,
    freeSearchLimit: input.free_search_limit,
    freeSearchesUsed: input.free_searches_used,
    hasActiveSubscription: input.has_active_subscription,
    remainingSearches: input.remaining_searches,
    status: mapStatus(input),
    willRenew: input.active_entitlement?.will_renew === true,
  };
}

function mapGuestSummary(input: BackendSearchAccessState): SearchAccessSummary {
  return {
    ...mapSummary(input),
    status: (input.remaining_searches ?? 0) > 0 ? "allowed" : "auth_required",
  };
}

export async function getSearchAccessSummary(): Promise<SearchAccessSummary> {
  const { data, error } = await supabase.functions.invoke("access-state", {
    body: {},
  });

  if (error) {
    throw new Error(error.message || "Could not load search access state");
  }

  const payload = assertSuccessResponse(data as Record<string, unknown> | null, "Could not load search access state");
  return mapSummary(payload as unknown as BackendSearchAccessState);
}

export async function getGuestAccessSummary(): Promise<SearchAccessSummary> {
  const { data, error } = await invokeAppFunction("guest-access-state", {
    body: {},
  });

  if (error) {
    throw new Error(error.message || "Could not load guest search access state");
  }

  const payload = assertSuccessResponse(data as Record<string, unknown> | null, "Could not load guest search access state");
  return mapGuestSummary(payload as unknown as BackendSearchAccessState);
}

export async function consumeSearch(input: ConsumeSearchInput = {}): Promise<ConsumeSearchResult> {
  const { data, error } = await supabase.functions.invoke("consume-search", {
    body: input,
  });

  if (error) {
    if ("context" in error && error.context instanceof Response) {
      const errorResponse = (await error.context.json().catch(() => null)) as
        | (Record<string, unknown> & BackendSearchAccessState)
        | null;

      if (error.context.status === 403 && errorResponse) {
        return {
          ...mapSummary(errorResponse),
          allowed: false,
          reason: "quota_exhausted",
        };
      }
    }

    throw new Error(error.message || "Could not consume search access");
  }

  const payload = assertSuccessResponse(data as Record<string, unknown> | null, "Could not consume search access");
  return {
    ...mapSummary(payload as unknown as BackendSearchAccessState),
    allowed: true,
    reason: "allowed",
  };
}
