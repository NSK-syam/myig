import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { buildAuthenticatedCorsHeaders, getRequestOrigin } from "../_shared/app-access.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  rateLimitHeaders,
  requireAllowedAppOrigin,
} from "../_shared/security.ts";
import { loadUserSearchAccessState } from "../_shared/search-access-service.ts";

serve(async (req) => {
  const corsHeaders = buildAuthenticatedCorsHeaders(getRequestOrigin(req));

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
    const originCheck = requireAllowedAppOrigin(req);
    if (!originCheck.allowed) {
      return new Response(
        JSON.stringify({ error: originCheck.error }),
        { status: originCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = await requireAuthenticatedUser(req);
    if ("error" in auth) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      action: "access-state",
      limit: 120,
      req,
      supabaseAdmin,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many access-state requests. Please wait and try again." }),
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

    const accessState = await loadUserSearchAccessState(supabaseAdmin, auth.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        ...accessState,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in access-state:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
