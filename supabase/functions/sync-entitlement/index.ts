import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { requireAuthenticatedUser } from "../_shared/auth.ts";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  rateLimitHeaders,
} from "../_shared/security.ts";
import { syncUserEntitlementSnapshot } from "../_shared/search-access-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const auth = await requireAuthenticatedUser(req);
    if ("error" in auth) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      action: "sync-entitlement",
      limit: 60,
      req,
      supabaseAdmin,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many sync-entitlement requests. Please wait and try again." }),
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

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "A verified entitlement payload is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessState = await syncUserEntitlementSnapshot(supabaseAdmin, auth.user.id, body);

    return new Response(
      JSON.stringify({
        success: true,
        ...accessState,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /payload|status|expiresAt|verifiedAt|metadata|productId|purchaseSource|renewalPeriod|originalTransactionId/i.test(message)
      ? 400
      : 500;

    console.error("Error in sync-entitlement:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
