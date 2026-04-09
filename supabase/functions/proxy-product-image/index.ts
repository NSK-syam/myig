import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildAppCorsHeaders,
  getRequestOrigin,
  verifySignedImageProxyToken,
} from "../_shared/app-access.ts";
import {
  enforceRateLimit,
  getAppTokenSecret,
  getSupabaseAdmin,
  rateLimitHeaders,
} from "../_shared/security.ts";
import { isProxySafePublicUrl } from "../search-products/helpers.ts";

serve(async (req) => {
  const origin = getRequestOrigin(req);
  const corsHeaders = buildAppCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const requestUrl = new URL(req.url);
  const token = requestUrl.searchParams.get("token")?.trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing image token" }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const limit = await enforceRateLimit({
    supabaseAdmin,
    req,
    action: "proxy-product-image",
    limit: 240,
    windowSeconds: 600,
  });

  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many product-image requests. Please wait and try again." }),
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

  let targetUrl: string;
  let merchantUrl: string | undefined;
  try {
    const payload = await verifySignedImageProxyToken({
      token,
      secret: getAppTokenSecret(),
      origin,
    });
    targetUrl = payload.imageUrl;
    merchantUrl = payload.merchantUrl;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid image token" }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid image URL" }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  if (!/^https?:$/.test(parsedTarget.protocol)) {
    return new Response(JSON.stringify({ error: "Only HTTP(S) image URLs are supported" }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  if (merchantUrl && !isProxySafePublicUrl(merchantUrl)) {
    return new Response(JSON.stringify({ error: "Merchant URL is not allowed" }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  if (!isProxySafePublicUrl(targetUrl)) {
    return new Response(JSON.stringify({ error: "Image URL is not allowed" }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  let referer: string | undefined;
  if (merchantUrl) {
    try {
      referer = new URL(merchantUrl).origin;
    } catch {
      referer = undefined;
    }
  }

  const upstreamResponse = await fetch(parsedTarget.toString(), {
    headers: {
      "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      ...(referer ? { referer } : {}),
    },
    redirect: "follow",
  }).catch(() => null);

  if (!upstreamResponse || !upstreamResponse.ok) {
    return new Response(JSON.stringify({ error: "Could not fetch product image" }), {
      status: 502,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    return new Response(JSON.stringify({ error: "Upstream response is not an image" }), {
      status: 415,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const cacheControl = upstreamResponse.headers.get("cache-control") || "public, max-age=86400, s-maxage=86400";
  const imageBytes = await upstreamResponse.arrayBuffer();

  return new Response(imageBytes, {
    headers: {
      ...corsHeaders,
      "Content-Type": contentType.startsWith("image/") ? contentType : "image/jpeg",
      "Cache-Control": cacheControl,
    },
  });
});
