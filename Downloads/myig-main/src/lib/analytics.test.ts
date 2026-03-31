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

const { fetchAnalyticsSummary, trackAnalyticsEvent } = await import("./analytics");

describe("trackAnalyticsEvent", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeAppFunctionMock.mockReset();
  });

  it("sends the allowed event payload to the ingest function", async () => {
    invokeAppFunctionMock.mockResolvedValue({ data: { success: true }, error: null });

    await trackAnalyticsEvent("analysis_completed", {
      market: "in",
      page: "/results",
      metadata: {
        totalItems: 3,
        sourceType: "instagram_url",
      },
    });

    expect(invokeAppFunctionMock).toHaveBeenCalledWith("ingest-analytics", {
      body: {
        eventName: "analysis_completed",
        market: "in",
        page: "/results",
        metadata: {
          totalItems: 3,
          sourceType: "instagram_url",
        },
      },
    });
  });

  it("fetches the analytics summary from the summary function", async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        totals: { search_link_submitted: 12 },
        last24h: { search_link_submitted: 3 },
        topMarkets: [{ market: "in", count: 7 }],
        recentEvents: [],
      },
      error: null,
    });

    const summary = await fetchAnalyticsSummary();

    expect(invokeMock).toHaveBeenCalledWith("analytics-summary", { body: {} });
    expect(summary.totals.search_link_submitted).toBe(12);
    expect(summary.last24h.search_link_submitted).toBe(3);
    expect(summary.topMarkets[0]).toEqual({ market: "in", count: 7 });
  });
});
