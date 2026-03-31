import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  APP_TOKEN_HEADER,
  GUEST_TOKEN_HEADER,
  getRequestOrigin,
  isAllowedOrigin,
  parseAdminEmailAllowlist,
  parseAllowedOrigins,
  verifyGuestToken,
  verifyScopedAppToken,
} from "./app-access.ts";

const RATE_LIMIT_TABLE = "edge_rate_limits";
export const IMAGE_BUCKET = "instagram-images";

export function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment is not configured");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getAppTokenSecret(): string {
  const secret =
    Deno.env.get("SEARCHOUTFIT_APP_TOKEN_SECRET")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secret) {
    throw new Error("App token secret is not configured");
  }

  return secret;
}

export function getAllowedAppOrigins(): Set<string> {
  return parseAllowedOrigins(Deno.env.get("APP_ALLOWED_ORIGINS"));
}

export function getAnalyticsAdminAllowlist(): Set<string> {
  return parseAdminEmailAllowlist(Deno.env.get("ANALYTICS_ADMIN_EMAILS"));
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) return firstIp.trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  return "unknown";
}

export function estimateBase64Size(base64: string): number {
  const normalized = base64.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

export async function enforceRateLimit({
  supabaseAdmin,
  req,
  action,
  limit,
  windowSeconds,
}: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  req: Request;
  action: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const subject = getClientIp(req);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const retryAfter = Math.max(1, Math.ceil((windowStartMs + windowMs - now) / 1000));

  const { data: existing, error: selectError } = await supabaseAdmin
    .from(RATE_LIMIT_TABLE)
    .select("id, count")
    .eq("action", action)
    .eq("subject", subject)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Rate limit lookup failed: ${selectError.message}`);
  }

  if (existing && existing.count >= limit) {
    return { allowed: false, retryAfter };
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from(RATE_LIMIT_TABLE)
      .update({
        count: existing.count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Rate limit update failed: ${updateError.message}`);
    }

    return { allowed: true };
  }

  const { error: insertError } = await supabaseAdmin
    .from(RATE_LIMIT_TABLE)
    .insert({
      action,
      subject,
      window_start: windowStart,
      count: 1,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(`Rate limit insert failed: ${insertError.message}`);
  }

  return { allowed: true };
}

export async function createSignedImageUrl(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create signed image URL");
  }

  return data.signedUrl;
}

export async function materializeImageRefs(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  refs: string[],
  expiresIn = 3600,
): Promise<string[]> {
  const urls = await Promise.all(
    refs.map(async (ref) => {
      if (!ref) return null;

      try {
        const parsed = new URL(ref);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return ref;
        }
      } catch {
        // Not an absolute URL; treat it as a storage object path.
      }

      try {
        return await createSignedImageUrl(supabaseAdmin, ref, expiresIn);
      } catch (error) {
        console.warn("Failed to sign stored image ref:", ref, error);
        return null;
      }
    }),
  );

  return urls.filter((value): value is string => Boolean(value));
}

export function rateLimitHeaders(retryAfter: number): HeadersInit {
  return {
    "Retry-After": String(retryAfter),
  };
}

export async function requireAppToken(
  req: Request,
  requiredScope: string,
): Promise<{ allowed: true } | { allowed: false; status: number; error: string }> {
  const origin = getRequestOrigin(req);
  if (!isAllowedOrigin(origin, getAllowedAppOrigins())) {
    return {
      allowed: false,
      status: 403,
      error: "Requests from this origin are not allowed.",
    };
  }

  const token = req.headers.get(APP_TOKEN_HEADER);
  if (!token) {
    return {
      allowed: false,
      status: 401,
      error: "Missing app token.",
    };
  }

  try {
    await verifyScopedAppToken({
      token,
      secret: getAppTokenSecret(),
      clientIp: getClientIp(req),
      requiredScope,
      origin,
    });
    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      status: 401,
      error: error instanceof Error ? error.message : "Invalid app token.",
    };
  }
}

export async function requireGuestToken(
  req: Request,
): Promise<{ allowed: true; guestId: string } | { allowed: false; status: number; error: string }> {
  const token = req.headers.get(GUEST_TOKEN_HEADER);
  if (!token) {
    return {
      allowed: false,
      status: 401,
      error: "Missing guest token.",
    };
  }

  try {
    const guestId = await verifyGuestToken({
      token,
      secret: getAppTokenSecret(),
      origin: getRequestOrigin(req),
    });
    return { allowed: true, guestId };
  } catch (error) {
    return {
      allowed: false,
      status: 401,
      error: error instanceof Error ? error.message : "Invalid guest token.",
    };
  }
}
