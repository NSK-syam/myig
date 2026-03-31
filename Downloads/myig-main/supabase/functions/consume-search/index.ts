import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { requireAuthenticatedUser } from "../_shared/auth.ts";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  rateLimitHeaders,
} from "../_shared/security.ts";
import { loadUserSearchAccessState } from "../_shared/search-access-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeRequestType(value: unknown): "instagram_url" | "image_upload" | "unknown" {
  if (typeof value !== "string") return "unknown";

  const normalized = value.trim().toLowerCase();
  if (normalized === "instagram_url" || normalized === "image_upload") {
    return normalized;
  }

  return "unknown";
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

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
      action: "consume-search",
      limit: 60,
      req,
      supabaseAdmin,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many search-consume requests. Please wait and try again." }),
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

    const body = await req.json().catch(() => ({}));
    const requestType = normalizeRequestType(body?.requestType ?? body?.request_type);
    const metadata = normalizeMetadata(body?.metadata);

    const { data, error } = await supabaseAdmin
      .rpc("consume_search_access", {
        p_metadata: metadata,
        p_request_type: requestType,
        p_user_id: auth.user.id,
      })
      .single();

    if (error) {
      throw new Error(`Could not consume search access: ${error.message}`);
    }

    const accessState = await loadUserSearchAccessState(supabaseAdmin, auth.user.id);
    if (data?.blocked) {
      return new Response(
        JSON.stringify({
          code: data.block_reason ?? "free_search_limit_reached",
          error: "Signed-in free search limit reached.",
          success: false,
          ...accessState,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...accessState,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in consume-search:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
