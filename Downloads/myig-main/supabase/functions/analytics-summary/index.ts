import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  enforceRateLimit,
  getAnalyticsAdminAllowlist,
  getSupabaseAdmin,
  rateLimitHeaders,
} from "../_shared/security.ts";
import { isAllowedAdminEmail } from "../_shared/app-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_EVENTS = [
  "search_link_submitted",
  "screenshot_uploaded",
  "screenshot_pasted",
  "instagram_extract_succeeded",
  "analysis_completed",
  "product_results_loaded",
] as const;

const ALLOWED_MARKETS = ["in", "us", "uk", "ca", "ae", "au"] as const;

async function requireUser(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!url || !anonKey || !authorization) {
    return null;
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function countEvents(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  eventName: string,
  since?: string,
): Promise<number> {
  let query = supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", eventName);

  if (since) {
    query = query.gte("created_at", since);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countMarketEvents(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  market: string,
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("market", market);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!isAllowedAdminEmail(user.email, getAnalyticsAdminAllowlist())) {
      return new Response(
        JSON.stringify({ error: "Analytics access is restricted to the owner account." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      supabaseAdmin,
      req,
      action: "analytics-summary",
      limit: 30,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many analytics summary requests. Please wait and try again." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders(limit.retryAfter),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const totalsEntries = await Promise.all(
      ALLOWED_EVENTS.map(async (eventName) => [eventName, await countEvents(supabaseAdmin, eventName)] as const),
    );

    const last24hEntries = await Promise.all(
      ALLOWED_EVENTS.map(async (eventName) => [eventName, await countEvents(supabaseAdmin, eventName, since)] as const),
    );

    const marketEntries = await Promise.all(
      ALLOWED_MARKETS.map(async (market) => ({
        market,
        count: await countMarketEvents(supabaseAdmin, market),
      })),
    );

    const { data: recentEvents, error: recentError } = await supabaseAdmin
      .from("analytics_events")
      .select("event_name, market, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (recentError) {
      throw new Error(recentError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totals: Object.fromEntries(totalsEntries),
        last24h: Object.fromEntries(last24hEntries),
        topMarkets: marketEntries
          .filter((entry) => entry.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        recentEvents: (recentEvents ?? []).map((event) => ({
          eventName: event.event_name,
          market: event.market,
          createdAt: event.created_at,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in analytics-summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
