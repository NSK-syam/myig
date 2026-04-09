import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildAppCorsHeaders, getRequestOrigin } from "../_shared/app-access.ts";
import {
  IMAGE_BUCKET,
  createSignedImageUrl,
  enforceRateLimit,
  estimateBase64Size,
  getSupabaseAdmin,
  requireAppToken,
  rateLimitHeaders,
} from "../_shared/security.ts";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function decodeBase64Image(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

serve(async (req) => {
  const corsHeaders = buildAppCorsHeaders(getRequestOrigin(req));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tokenCheck = await requireAppToken(req, "upload-image");
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
      action: "upload-image",
      limit: 15,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many uploads. Please wait and try again." }),
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

    const { imageBase64, contentType } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string" || !contentType || typeof contentType !== "string") {
      return new Response(
        JSON.stringify({ error: "Provide imageBase64 and contentType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return new Response(
        JSON.stringify({ error: "Unsupported image type. Use JPG, PNG, or WEBP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (estimateBase64Size(imageBase64) > MAX_UPLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: "Image exceeds the 10MB upload limit." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bytes = decodeBase64Image(imageBase64);
    const ext = extensionFor(contentType);
    const path = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(path, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const signedUrl = await createSignedImageUrl(supabaseAdmin, path);

    return new Response(
      JSON.stringify({ success: true, path, signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in upload-image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
