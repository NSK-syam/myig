import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock3, Globe2, Loader2 } from "lucide-react";

import AuthDialog from "@/components/AuthDialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";
import { fetchAnalyticsSummary, type AnalyticsSummaryResponse, type AnalyticsEventName } from "@/lib/analytics";
import { SEARCH_MARKETS } from "@/lib/market";

const EVENT_LABELS: Record<AnalyticsEventName, string> = {
  search_link_submitted: "Link submits",
  screenshot_uploaded: "Screenshot uploads",
  screenshot_pasted: "Screenshot pastes",
  instagram_extract_succeeded: "Instagram extracts",
  analysis_completed: "Analyses completed",
  product_results_loaded: "Product result loads",
};

const MARKET_LABELS = new Map(SEARCH_MARKETS.map((market) => [market.code, market.label]));

const EVENT_ORDER: AnalyticsEventName[] = [
  "search_link_submitted",
  "screenshot_uploaded",
  "screenshot_pasted",
  "instagram_extract_succeeded",
  "analysis_completed",
  "product_results_loaded",
];

function isAccessRestrictedError(error: string | null): boolean {
  return Boolean(error && /restricted to the owner account/i.test(error));
}

const AnalyticsPage = () => {
  const { loading, user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessRestricted = isAccessRestrictedError(error);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchAnalyticsSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setSummary(null);
          setError(nextError instanceof Error ? nextError.message : "Could not load analytics.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return EVENT_ORDER.map((eventName) => ({
      eventName,
      label: EVENT_LABELS[eventName],
      total: summary.totals[eventName] ?? 0,
      last24h: summary.last24h[eventName] ?? 0,
    }));
  }, [summary]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center px-6 pt-16">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="px-6 pt-28 pb-20">
          <div className="mx-auto max-w-3xl rounded-sm border border-border bg-card p-8 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-foreground" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Sign in to view analytics
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              SearchOutfit analytics are only available to signed-in users on this device.
            </p>
            <div className="mt-6 flex justify-center">
              <AuthDialog triggerLabel="Sign in to analytics" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accessRestricted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="px-6 pt-28 pb-20">
          <div className="mx-auto max-w-3xl rounded-sm border border-border bg-card p-8 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-foreground" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Analytics access is restricted
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in with the owner account to view SearchOutfit production analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-6 pt-28 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                SearchOutfit usage overview
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Event counts from production for links, screenshots, extraction, analysis, and loaded product results.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-sm border border-border bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              {error}
            </div>
          ) : summary ? (
            <div className="space-y-8">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <div key={card.eventName} className="rounded-sm border border-border bg-card p-5">
                    <div className="text-sm font-medium text-muted-foreground">{card.label}</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                      {card.total}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Last 24h: {card.last24h}
                    </div>
                  </div>
                ))}
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
                <div className="rounded-sm border border-border bg-card p-6">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <Globe2 className="h-3.5 w-3.5" />
                    Top markets
                  </div>
                  <div className="mt-5 space-y-3">
                    {summary.topMarkets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No market data yet.</p>
                    ) : (
                      summary.topMarkets.map((entry) => (
                        <div key={entry.market} className="flex items-center justify-between rounded-sm border border-border px-4 py-3">
                          <span className="text-sm font-medium text-foreground">
                            {MARKET_LABELS.get(entry.market) ?? entry.market.toUpperCase()}
                          </span>
                          <span className="text-sm text-muted-foreground">{entry.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-sm border border-border bg-card p-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Recent events
                  </div>
                  <div className="mt-5 space-y-3">
                    {summary.recentEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No analytics events have been recorded yet.</p>
                    ) : (
                      summary.recentEvents.map((event, index) => (
                        <div key={`${event.eventName}-${event.createdAt}-${index}`} className="rounded-sm border border-border px-4 py-3">
                          <div className="text-sm font-medium text-foreground">{EVENT_LABELS[event.eventName]}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {event.market ? `${MARKET_LABELS.get(event.market) ?? event.market.toUpperCase()} · ` : ""}
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
