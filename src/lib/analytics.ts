import { supabase } from "@/integrations/supabase/client";
import { invokeAppFunction } from "@/lib/appAccess";
import type { SearchMarketCode } from "@/lib/market";

export const ANALYTICS_EVENTS = [
  "search_link_submitted",
  "screenshot_uploaded",
  "screenshot_pasted",
  "instagram_extract_succeeded",
  "analysis_completed",
  "product_results_loaded",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsEventPayload {
  market?: SearchMarketCode;
  page?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSummaryResponse {
  totals: Partial<Record<AnalyticsEventName, number>>;
  last24h: Partial<Record<AnalyticsEventName, number>>;
  topMarkets: Array<{ market: SearchMarketCode; count: number }>;
  recentEvents: Array<{
    eventName: AnalyticsEventName;
    market: SearchMarketCode | null;
    createdAt: string;
  }>;
}

export async function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  payload: AnalyticsEventPayload = {},
): Promise<void> {
  const { error } = await invokeAppFunction("ingest-analytics", {
    body: {
      eventName,
      market: payload.market,
      page: payload.page,
      metadata: payload.metadata ?? {},
    },
  });

  if (error) {
    throw new Error(error.message || "Analytics tracking failed");
  }
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const { data, error } = await supabase.functions.invoke("analytics-summary", {
    body: {},
  });

  if (error) {
    throw new Error(error.message || "Could not load analytics summary");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Could not load analytics summary");
  }

  return {
    totals: data.totals ?? {},
    last24h: data.last24h ?? {},
    topMarkets: data.topMarkets ?? [],
    recentEvents: data.recentEvents ?? [],
  };
}

export function fireAndForgetAnalyticsEvent(
  eventName: AnalyticsEventName,
  payload: AnalyticsEventPayload = {},
): void {
  void trackAnalyticsEvent(eventName, payload).catch((error) => {
    console.warn(`Analytics event failed: ${eventName}`, error);
  });
}
