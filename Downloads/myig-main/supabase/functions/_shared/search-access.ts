export const DEFAULT_SIGNED_IN_FREE_SEARCH_LIMIT = 7;
export const DEFAULT_GUEST_FREE_SEARCH_LIMIT = 3;

const ACTIVE_ENTITLEMENT_STATUSES = ["active", "grace_period", "billing_retry"] as const;
const ALL_ENTITLEMENT_STATUSES = [
  ...ACTIVE_ENTITLEMENT_STATUSES,
  "expired",
  "revoked",
  "cancelled",
  "inactive",
  "pending",
] as const;

type EntitlementStatus = (typeof ALL_ENTITLEMENT_STATUSES)[number];

export type SearchAccessUsageRecord = {
  free_search_limit: number | null;
  free_searches_used: number | null;
};

export type GuestSearchAccessUsageRecord = {
  free_search_limit: number | null;
  free_searches_used: number | null;
};

export type SubscriptionEntitlementRecord = {
  expires_at: string | null;
  is_active: boolean | null;
  metadata?: Record<string, unknown> | null;
  original_transaction_id: string | null;
  product_id: string | null;
  purchase_source: string | null;
  renewal_period: string | null;
  status: string | null;
  verified_at?: string | null;
  will_renew: boolean | null;
};

export type ActiveEntitlementDetails = {
  expires_at: string | null;
  product_id: string | null;
  purchase_source: string | null;
  renewal_period: string | null;
  status: string;
  verified_at: string | null;
  will_renew: boolean | null;
};

export type SearchAccessStateResponse = {
  active_entitlement: ActiveEntitlementDetails | null;
  free_search_limit: number;
  free_searches_used: number;
  has_active_subscription: boolean;
  remaining_searches: number | null;
};

export type NormalizedEntitlementInput = {
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  original_transaction_id: string | null;
  product_id: string | null;
  purchase_source: string;
  renewal_period: string | null;
  status: EntitlementStatus;
  verified_at: string;
  will_renew: boolean | null;
};

function normalizeCount(value: number | null | undefined, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function normalizeOptionalString(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string when provided`);
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

function normalizeIsoTimestamp(value: unknown, fieldName: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be an ISO timestamp string when provided`);
  }

  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO timestamp`);
  }

  return parsed.toISOString();
}

function normalizeEntitlementStatus(value: unknown): EntitlementStatus {
  if (typeof value !== "string") {
    throw new Error("status is required");
  }

  const normalized = value.trim().toLowerCase();
  if (!ALL_ENTITLEMENT_STATUSES.includes(normalized as EntitlementStatus)) {
    throw new Error(`status must be one of: ${ALL_ENTITLEMENT_STATUSES.join(", ")}`);
  }

  return normalized as EntitlementStatus;
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata must be an object when provided");
  }

  return value as Record<string, unknown>;
}

export function hasActiveEntitlement(
  entitlement: SubscriptionEntitlementRecord | null | undefined,
  now = new Date(),
): boolean {
  if (!entitlement?.is_active) return false;

  const status = typeof entitlement.status === "string"
    ? entitlement.status.trim().toLowerCase()
    : "";
  if (!ACTIVE_ENTITLEMENT_STATUSES.includes(status as (typeof ACTIVE_ENTITLEMENT_STATUSES)[number])) {
    return false;
  }

  if (!entitlement.expires_at) return true;

  const expiresAt = new Date(entitlement.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;

  return expiresAt.getTime() > now.getTime();
}

export function buildActiveEntitlementDetails(
  entitlement: SubscriptionEntitlementRecord | null | undefined,
  now = new Date(),
): ActiveEntitlementDetails | null {
  if (!hasActiveEntitlement(entitlement, now) || !entitlement) {
    return null;
  }

  return {
    expires_at: entitlement.expires_at,
    product_id: entitlement.product_id,
    purchase_source: entitlement.purchase_source,
    renewal_period: entitlement.renewal_period,
    status: entitlement.status?.trim().toLowerCase() ?? "inactive",
    verified_at: entitlement.verified_at ?? null,
    will_renew: entitlement.will_renew,
  };
}

export function buildAccessStateResponse({
  entitlement,
  now = new Date(),
  usage,
}: {
  entitlement: SubscriptionEntitlementRecord | null;
  now?: Date;
  usage: SearchAccessUsageRecord | null;
}): SearchAccessStateResponse {
  const freeSearchLimit = normalizeCount(
    usage?.free_search_limit,
    DEFAULT_SIGNED_IN_FREE_SEARCH_LIMIT,
  ) || DEFAULT_SIGNED_IN_FREE_SEARCH_LIMIT;
  const freeSearchesUsed = normalizeCount(usage?.free_searches_used, 0);
  const activeEntitlement = buildActiveEntitlementDetails(entitlement, now);
  const hasActiveSubscription = Boolean(activeEntitlement);

  return {
    active_entitlement: activeEntitlement,
    free_search_limit: freeSearchLimit,
    free_searches_used: freeSearchesUsed,
    has_active_subscription: hasActiveSubscription,
    remaining_searches: null,
  };
}

export function buildGuestAccessStateResponse({
  usage,
}: {
  usage: GuestSearchAccessUsageRecord | null;
}): SearchAccessStateResponse {
  const freeSearchLimit = normalizeCount(
    usage?.free_search_limit,
    DEFAULT_GUEST_FREE_SEARCH_LIMIT,
  ) || DEFAULT_GUEST_FREE_SEARCH_LIMIT;
  const freeSearchesUsed = normalizeCount(usage?.free_searches_used, 0);

  return {
    active_entitlement: null,
    free_search_limit: freeSearchLimit,
    free_searches_used: freeSearchesUsed,
    has_active_subscription: false,
    remaining_searches: Math.max(freeSearchLimit - freeSearchesUsed, 0),
  };
}

export function normalizeVerifiedEntitlementInput(
  input: unknown,
  now = new Date(),
): NormalizedEntitlementInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A verified entitlement payload is required");
  }

  const record = input as Record<string, unknown>;
  const status = normalizeEntitlementStatus(record.status);
  const expiresAt = normalizeIsoTimestamp(record.expiresAt, "expiresAt");
  const verifiedAt = normalizeIsoTimestamp(record.verifiedAt, "verifiedAt") ?? now.toISOString();
  const purchaseSource = normalizeOptionalString(record.purchaseSource, "purchaseSource", 64) ?? "app_store";
  const isActive = ACTIVE_ENTITLEMENT_STATUSES.includes(
    status as (typeof ACTIVE_ENTITLEMENT_STATUSES)[number],
  ) && (!expiresAt || new Date(expiresAt).getTime() > now.getTime());

  return {
    expires_at: expiresAt,
    is_active: isActive,
    metadata: normalizeMetadata(record.metadata),
    original_transaction_id: normalizeOptionalString(
      record.originalTransactionId,
      "originalTransactionId",
      255,
    ),
    product_id: normalizeOptionalString(record.productId, "productId", 120),
    purchase_source: purchaseSource,
    renewal_period: normalizeOptionalString(record.renewalPeriod, "renewalPeriod", 64),
    status,
    verified_at: verifiedAt,
    will_renew: typeof record.willRenew === "boolean" ? record.willRenew : null,
  };
}
