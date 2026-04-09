import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import {
  buildAppCorsHeaders,
  createGuestToken,
  createProofOfWorkChallengeToken,
  createScopedAppToken,
  getRequestOrigin,
  isAllowedOrigin,
  PUBLIC_APP_SCOPES,
  verifyProofOfWorkChallengeToken,
  verifyGuestToken,
} from "../_shared/app-access.ts";
import {
  enforceRateLimit,
  getAllowedAppOrigins,
  getAppTokenSecret,
  getClientIp,
  getSupabaseAdmin,
  rateLimitHeaders,
} from "../_shared/security.ts";

const POW_CHALLENGE_DIFFICULTY = 4;
const POW_CHALLENGE_TTL_SECONDS = 2 * 60;

serve(async (req) => {
  const origin = getRequestOrigin(req);
  const corsHeaders = buildAppCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!isAllowedOrigin(origin, getAllowedAppOrigins())) {
      return new Response(
        JSON.stringify({ error: "Requests from this origin are not allowed." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      supabaseAdmin,
      req,
      action: "issue-app-token",
      limit: 120,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many token requests. Please wait and try again." }),
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
    const requestedScopes = Array.isArray(body?.scopes)
      ? body.scopes.filter((scope): scope is string => typeof scope === "string" && PUBLIC_APP_SCOPES.includes(scope as (typeof PUBLIC_APP_SCOPES)[number]))
      : [];

    const scopes = requestedScopes.length > 0
      ? Array.from(new Set(requestedScopes))
      : [...PUBLIC_APP_SCOPES];

    const ttlSeconds = 15 * 60;
    const guestTtlSeconds = 90 * 24 * 60 * 60;
    const issuedAt = new Date();
    const secret = getAppTokenSecret();
    const clientIp = getClientIp(req);
    const challengeToken = typeof body?.challengeToken === "string" ? body.challengeToken : null;
    const challengeSolution = typeof body?.challengeSolution === "string" ? body.challengeSolution.trim().toLowerCase() : null;

    const buildChallengeResponse = async (message: string) => {
      const nextChallengeToken = await createProofOfWorkChallengeToken({
        secret,
        clientIp,
        ttlSeconds: POW_CHALLENGE_TTL_SECONDS,
        difficulty: POW_CHALLENGE_DIFFICULTY,
        now: issuedAt,
        origin,
      });

      return new Response(
        JSON.stringify({
          error: message,
          code: "challenge_required",
          challengeToken: nextChallengeToken,
          difficulty: POW_CHALLENGE_DIFFICULTY,
          expiresAt: new Date(issuedAt.getTime() + POW_CHALLENGE_TTL_SECONDS * 1000).toISOString(),
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    };

    if (!challengeToken || !challengeSolution) {
      return await buildChallengeResponse("Challenge required.");
    }

    try {
      await verifyProofOfWorkChallengeToken({
        token: challengeToken,
        solution: challengeSolution,
        secret,
        clientIp,
        now: issuedAt,
        origin,
      });
    } catch {
      return await buildChallengeResponse("Challenge verification failed.");
    }

    const existingGuestToken = typeof body?.guestToken === "string" ? body.guestToken : null;
    let guestId: string | null = null;

    if (existingGuestToken) {
      try {
        guestId = await verifyGuestToken({
          token: existingGuestToken,
          secret,
          now: issuedAt,
          origin,
        });
      } catch {
        guestId = null;
      }
    }

    if (!guestId) {
      guestId = crypto.randomUUID();
    }

    const token = await createScopedAppToken({
      secret,
      clientIp,
      scopes,
      ttlSeconds,
      now: issuedAt,
      origin,
    });
    const guestToken = await createGuestToken({
      secret,
      guestId,
      ttlSeconds: guestTtlSeconds,
      now: issuedAt,
      origin,
    });

    return new Response(
      JSON.stringify({
        guestExpiresAt: new Date(issuedAt.getTime() + guestTtlSeconds * 1000).toISOString(),
        guestId,
        guestToken,
        success: true,
        token,
        expiresAt: new Date(issuedAt.getTime() + ttlSeconds * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in issue-app-token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
