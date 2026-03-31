import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { buildAppCorsHeaders } from "../_shared/app-access.ts";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  rateLimitHeaders,
  requireAppToken,
  requireGuestToken,
} from "../_shared/security.ts";
import { loadGuestSearchAccessState } from "../_shared/search-access-service.ts";

const corsHeaders = buildAppCorsHeaders();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const tokenCheck = await requireAppToken(req, "guest-access-state");
    if (!tokenCheck.allowed) {
      return new Response(
        JSON.stringify({ error: tokenCheck.error }),
        { status: tokenCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const guestCheck = await requireGuestToken(req);
    if (!guestCheck.allowed) {
      return new Response(
        JSON.stringify({ error: guestCheck.error }),
        { status: guestCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      action: "guest-access-state",
      limit: 120,
      req,
      supabaseAdmin,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many guest-access-state requests. Please wait and try again." }),
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

    const accessState = await loadGuestSearchAccessState(supabaseAdmin, guestCheck.guestId);

    return new Response(
      JSON.stringify({
        success: true,
        ...accessState,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in guest-access-state:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
