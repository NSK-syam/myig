import { describe, expect, it } from "vitest";

import {
  buildAccessStateResponse,
  buildGuestAccessStateResponse,
  normalizeVerifiedEntitlementInput,
} from "../../supabase/functions/_shared/search-access.ts";

describe("search access backend helpers", () => {
  it("reports unlimited remaining access for signed-in users without an active entitlement", () => {
    expect(
      buildAccessStateResponse({
        entitlement: null,
        now: new Date("2026-03-21T00:00:00.000Z"),
        usage: {
          free_search_limit: 7,
          free_searches_used: 3,
        },
      }),
    ).toMatchObject({
      active_entitlement: null,
      free_search_limit: 7,
      free_searches_used: 3,
      has_active_subscription: false,
      remaining_searches: null,
    });
  });

  it("surfaces active entitlement details and unlimited remaining access", () => {
    expect(
      buildAccessStateResponse({
        entitlement: {
          expires_at: "2026-04-21T00:00:00.000Z",
          is_active: true,
          original_transaction_id: "orig_123",
          product_id: "searchoutfit_yearly",
          purchase_source: "app_store",
          renewal_period: "yearly",
          status: "active",
          will_renew: true,
        },
        now: new Date("2026-03-21T00:00:00.000Z"),
        usage: {
          free_search_limit: 7,
          free_searches_used: 7,
        },
      }),
    ).toMatchObject({
      active_entitlement: {
        expires_at: "2026-04-21T00:00:00.000Z",
        product_id: "searchoutfit_yearly",
        purchase_source: "app_store",
        renewal_period: "yearly",
        status: "active",
        will_renew: true,
      },
      has_active_subscription: true,
      remaining_searches: null,
    });
  });

  it("reports guest access exhaustion after the third guest search", () => {
    expect(
      buildGuestAccessStateResponse({
        usage: {
          free_search_limit: 3,
          free_searches_used: 3,
        },
      }),
    ).toMatchObject({
      active_entitlement: null,
      free_search_limit: 3,
      free_searches_used: 3,
      has_active_subscription: false,
      remaining_searches: 0,
    });
  });

  it("normalizes a verified client entitlement snapshot", () => {
    expect(
      normalizeVerifiedEntitlementInput({
        expiresAt: "2026-04-21T00:00:00.000Z",
        metadata: {
          environment: "sandbox",
        },
        originalTransactionId: "orig_123",
        productId: "searchoutfit_monthly",
        purchaseSource: "app_store",
        renewalPeriod: "monthly",
        status: "active",
        verifiedAt: "2026-03-21T12:00:00.000Z",
        willRenew: true,
      }),
    ).toMatchObject({
      expires_at: "2026-04-21T00:00:00.000Z",
      is_active: true,
      original_transaction_id: "orig_123",
      product_id: "searchoutfit_monthly",
      purchase_source: "app_store",
      renewal_period: "monthly",
      status: "active",
      verified_at: "2026-03-21T12:00:00.000Z",
      will_renew: true,
    });
  });

  it("rejects unsupported entitlement statuses", () => {
    expect(() =>
      normalizeVerifiedEntitlementInput({
        status: "unknown",
      }),
    ).toThrow(/status/i);
  });
});
