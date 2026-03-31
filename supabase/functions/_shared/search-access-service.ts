import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildAccessStateResponse,
  buildGuestAccessStateResponse,
  normalizeVerifiedEntitlementInput,
  type SearchAccessStateResponse,
  type GuestSearchAccessUsageRecord,
  type SearchAccessUsageRecord,
  type SubscriptionEntitlementRecord,
} from "./search-access.ts";

async function ensureUserSearchAccessRow(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_search_access")
    .upsert({ user_id: userId }, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Could not initialize user search access: ${error.message}`);
  }
}

async function ensureGuestSearchAccessRow(
  supabaseAdmin: SupabaseClient,
  guestId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("guest_search_access")
    .upsert({ guest_id: guestId }, { onConflict: "guest_id" });

  if (error) {
    throw new Error(`Could not initialize guest search access: ${error.message}`);
  }
}

export async function loadUserSearchAccessState(
  supabaseAdmin: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<SearchAccessStateResponse> {
  await ensureUserSearchAccessRow(supabaseAdmin, userId);

  const [{ data: usage, error: usageError }, { data: entitlement, error: entitlementError }] =
    await Promise.all([
      supabaseAdmin
        .from("user_search_access")
        .select("free_searches_used, free_search_limit")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("user_subscription_entitlements")
        .select(
          "is_active, status, product_id, renewal_period, purchase_source, expires_at, will_renew, original_transaction_id, verified_at, metadata",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (usageError) {
    throw new Error(`Could not load user search usage: ${usageError.message}`);
  }

  if (entitlementError) {
    throw new Error(`Could not load user entitlement: ${entitlementError.message}`);
  }

  return buildAccessStateResponse({
    entitlement: (entitlement ?? null) as SubscriptionEntitlementRecord | null,
    now,
    usage: usage as SearchAccessUsageRecord,
  });
}

export async function syncUserEntitlementSnapshot(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: unknown,
  now = new Date(),
): Promise<SearchAccessStateResponse> {
  const normalized = normalizeVerifiedEntitlementInput(payload, now);

  const { error } = await supabaseAdmin
    .from("user_subscription_entitlements")
    .upsert(
      {
        ...normalized,
        updated_at: now.toISOString(),
        user_id: userId,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    throw new Error(`Could not sync entitlement snapshot: ${error.message}`);
  }

  return loadUserSearchAccessState(supabaseAdmin, userId, now);
}

export async function loadGuestSearchAccessState(
  supabaseAdmin: SupabaseClient,
  guestId: string,
): Promise<SearchAccessStateResponse> {
  await ensureGuestSearchAccessRow(supabaseAdmin, guestId);

  const { data, error } = await supabaseAdmin
    .from("guest_search_access")
    .select("free_searches_used, free_search_limit")
    .eq("guest_id", guestId)
    .single();

  if (error) {
    throw new Error(`Could not load guest search usage: ${error.message}`);
  }

  return buildGuestAccessStateResponse({
    usage: data as GuestSearchAccessUsageRecord,
  });
}

export async function consumeGuestSearchAccess(
  supabaseAdmin: SupabaseClient,
  guestId: string,
  requestType: "instagram_url" | "image_upload" | "unknown",
  metadata: Record<string, unknown> = {},
): Promise<SearchAccessStateResponse & { blocked: boolean; block_reason: string | null }> {
  const { data, error } = await supabaseAdmin
    .rpc("consume_guest_search_access", {
      p_guest_id: guestId,
      p_metadata: metadata,
      p_request_type: requestType,
    })
    .single();

  if (error) {
    throw new Error(`Could not consume guest search access: ${error.message}`);
  }

  const accessState = await loadGuestSearchAccessState(supabaseAdmin, guestId);
  return {
    ...accessState,
    block_reason: typeof data?.block_reason === "string" ? data.block_reason : null,
    blocked: data?.blocked === true,
  };
}
