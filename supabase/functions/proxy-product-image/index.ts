import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildAppCorsHeaders } from "../_shared/app-access.ts";
import { isRetailDomain } from "../search-products/helpers.ts";

const corsHeaders = buildAppCorsHeaders();

function buildErrorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return buildErrorResponse(405, "Method not allowed");
  }

  const requestUrl = new URL(req.url);
  const targetUrl = requestUrl.searchParams.get("url")?.trim();
  const merchantUrl = requestUrl.searchParams.get("merchantUrl")?.trim();

  if (!targetUrl) {
    return buildErrorResponse(400, "Missing image URL");
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return buildErrorResponse(400, "Invalid image URL");
  }

  if (!/^https?:$/.test(parsedTarget.protocol)) {
    return buildErrorResponse(400, "Only HTTP(S) image URLs are supported");
  }

  if (merchantUrl && !isRetailDomain(merchantUrl)) {
    return buildErrorResponse(403, "Merchant URL is not allowed");
  }

  if (!merchantUrl && !isRetailDomain(targetUrl)) {
    return buildErrorResponse(403, "Image URL is not allowed");
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
    return buildErrorResponse(502, "Could not fetch product image");
  }

  const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    return buildErrorResponse(415, "Upstream response is not an image");
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
