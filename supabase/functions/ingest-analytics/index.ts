import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildAppCorsHeaders } from "../_shared/app-access.ts";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  requireAppToken,
  rateLimitHeaders,
} from "../_shared/security.ts";

const corsHeaders = buildAppCorsHeaders();

const ALLOWED_EVENTS = new Set([
  "search_link_submitted",
  "screenshot_uploaded",
  "screenshot_pasted",
  "instagram_extract_succeeded",
  "analysis_completed",
  "product_results_loaded",
]);

function sanitizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, entry]) => {
      return entry === null
        || typeof entry === "string"
        || typeof entry === "number"
        || typeof entry === "boolean";
    }),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tokenCheck = await requireAppToken(req, "ingest-analytics");
    if (!tokenCheck.allowed) {
      return new Response(
        JSON.stringify({ error: tokenCheck.error }),
        { status: tokenCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      supabaseAdmin,
      req,
      action: "ingest-analytics",
      limit: 120,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many analytics events. Please wait and try again." }),
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

    const body = await req.json();
    const eventName = sanitizeString(body?.eventName, 64);
    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return new Response(
        JSON.stringify({ error: "Unsupported analytics event." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const market = sanitizeString(body?.market, 8);
    const page = sanitizeString(body?.page, 128);
    const metadata = sanitizeMetadata(body?.metadata);

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_name: eventName,
      market,
      page,
      metadata,
    });

    if (error) {
      throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in ingest-analytics:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
