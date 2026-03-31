import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildAppCorsHeaders } from "../_shared/app-access.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { consumeGuestSearchAccess } from "../_shared/search-access-service.ts";
import {
  enforceRateLimit,
  estimateBase64Size,
  getSupabaseAdmin,
  requireAppToken,
  requireGuestToken,
  rateLimitHeaders,
} from "../_shared/security.ts";

type ClaudeImageContent =
  | {
      type: "image";
      source:
        | { type: "base64"; media_type: string; data: string }
        | { type: "url"; url: string };
    }
  | { type: "text"; text: string };

type ClaudeResponse = {
  content?: Array<
    | { type: "text"; text: string }
    | { type: string; [key: string]: unknown }
  >;
};

const corsHeaders = buildAppCorsHeaders();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAnthropicWithRetry(request: RequestInit): Promise<Response> {
  const retryDelays = [0, 600, 1400];
  let lastResponse: Response | null = null;

  for (const retryDelay of retryDelays) {
    if (retryDelay > 0) {
      await delay(retryDelay);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", request);
    if (response.ok) {
      return response;
    }

    lastResponse = response;

    if (response.status !== 529) {
      return response;
    }
  }

  if (!lastResponse) {
    throw new Error("Anthropic API did not return a response");
  }

  return lastResponse;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tokenCheck = await requireAppToken(req, "analyze-outfit");
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
      action: "analyze-outfit",
      limit: 10,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many analysis requests. Please wait and try again." }),
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

    const { imageBase64, imageUrl } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Provide an image (base64 or direct image URL)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (imageBase64) {
      if (typeof imageBase64 !== "string" || estimateBase64Size(imageBase64) > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Base64 image must be a string under 10MB" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== "https:") {
          throw new Error("Only HTTPS image URLs are allowed");
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "imageUrl must be a valid HTTPS URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      const guestCheck = await requireGuestToken(req);
      if (!guestCheck.allowed) {
        return new Response(
          JSON.stringify({ error: guestCheck.error, success: false }),
          { status: guestCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const guestAccess = await consumeGuestSearchAccess(
        supabaseAdmin,
        guestCheck.guestId,
        "image_upload",
        { source: "analyze-outfit" },
      );

      if (guestAccess.blocked) {
        return new Response(
          JSON.stringify({
            code: guestAccess.block_reason ?? "guest_search_limit_reached",
            error: "Guest search limit reached. Sign in to keep searching.",
            success: false,
            ...guestAccess,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a fashion AI analyst for SearchOutfit. Your FIRST job is to determine if the image shows a fashion/outfit post or something else (meme, food, landscape, text post, etc.).

STEP 1 - CLASSIFICATION:
Look at the image carefully. Determine if this is:
- A fashion/outfit post (shows a person wearing clothes — even partially visible clothing counts! Selfies, portraits, close-ups where ANY clothing, jewelry, or accessories are visible ALL count as fashion. If you can see a collar, neckline, sleeve, earring, necklace, hat, or any garment/accessory, it IS fashion.)
- NOT a fashion post (memes, text screenshots, food, landscapes with NO people, pets alone, artwork, news, etc.)

IMPORTANT: Be VERY generous with classification. If there is a person in the image and you can see ANY clothing or accessories on them — even just a top/neckline in a selfie — classify it as fashion and analyze what's visible. Only reject images that truly have NO fashion content (no people, or people with no visible clothing at all).

If this is genuinely NOT a fashion/outfit post (no person, no clothing visible at all), return ONLY this JSON:
{
  "is_fashion": false,
  "content_type": "brief description of what the image actually shows",
  "message": "This doesn't appear to be a fashion or outfit post. It looks like [description]. Please share an outfit photo or screenshot for analysis."
}

STEP 2 - BRAND DETECTION (CRITICAL - DO THIS BEFORE ANYTHING ELSE):
Before analyzing individual items, scan the entire image for:
a) **Visible brand logos, text, labels, or tags** — even partial, stylized, or embroidered text on clothing, bags, shoes, jewelry, or accessories. If you can read or recognize ANY brand name, logo, monogram, or label, note it immediately.
b) **Recognizable public figures / celebrities / influencers** — if the person is identifiable, note their name AND any fashion brands they own, co-founded, or have known collaborations with. Examples:
   - Millie Bobby Brown → Florence by Mills
   - Rihanna → Fenty / Savage X Fenty
   - Beyoncé → Ivy Park
   - Victoria Beckham → Victoria Beckham (brand)
   - Kanye West → Yeezy
   - Pharrell Williams → Humanrace
   - Jessica Alba → Honest Company

STEP 3 - If it IS a fashion post, analyze every visible clothing item and accessory:

For each item provide:
1. "name" - A specific, descriptive product name (e.g., "Relaxed Linen Blazer", not just "blazer")
2. "category" - One of: tops, bottoms, dresses, outerwear, shoes, bags, accessories, jewelry
3. "color" - The primary color
4. "material" - Best guess at fabric/material
5. "style" - Style descriptors
6. "brand" - The EXACT brand name if a logo/label/tag is visible on THIS item. Leave empty string if not visible.
7. "brand_guess" - Your best guess at the brand based on style/quality/context, OR the celebrity's own brand if applicable
8. "price_estimate" - Realistic price estimate in USD
9. "confidence" - "high", "medium", or "low" — vary this realistically based on how clearly visible and identifiable the item is
10. "search_query" - A search query to find this item online. CRITICAL: If "brand" is set, the search query MUST start with the exact brand name (e.g., "Florence by Mills beige linen blazer"). If "brand" is empty but "brand_guess" is a specific brand, include it in the query.
11. "shopping_links" - Array of 2-3 retailer names where this type of item could be found. If "brand" is detected, the brand's official store MUST be first.

Also return these top-level fields:
12. "detected_brand" - The primary brand detected via logo/label in the image, or empty string
13. "brand_domain" - The official website domain of the detected brand (e.g. "miumiu.com", "gucci.com"). Must be the real, canonical domain. Empty string if no brand detected.
14. "brand_direct_url" - Construct the most likely direct product search URL on the official brand website (e.g. "https://www.miumiu.com/en/search?q=leather+trench+coat"). Use common URL patterns for luxury/fashion brands. Empty string if no brand detected.
15. "celebrity_name" - Name of the recognized person, or empty string  
16. "celebrity_brand" - The celebrity's own fashion brand/collaboration, or empty string

Return as JSON:
{
  "is_fashion": true,
  "detected_brand": "brand name or empty",
  "brand_domain": "e.g. miumiu.com or empty",
  "brand_direct_url": "e.g. https://www.miumiu.com/en/search?q=... or empty",
  "celebrity_name": "name or empty",
  "celebrity_brand": "brand name or empty",
  "items": [...],
  "overall_style": "Brief description of the overall aesthetic",
  "occasion": "What occasion this outfit suits",
  "season": "Best season for this outfit",
  "total_items": number,
  "confidence_score": number (0-100, be realistic - not everything is 94%)
}

IMPORTANT: 
- If you can identify any brand name, logo, or label visible in the image, state it explicitly as brand: "[name]" on the relevant item. This is the HIGHEST priority signal.
- If the person in the image is a recognizable public figure with their own fashion brand or known brand collaboration, state that as celebrity_brand: "[name]". These fields take priority over style-based matching.
- Search queries MUST prioritize exact brand names when detected. Never generate generic style-only queries when a brand is known.
- Vary confidence scores realistically. A clearly visible blazer might be 95%, but partially hidden shoes might be 60%.
- The overall confidence_score should reflect how well you could identify the items, not a fixed number.
- Be honest about uncertainty.`;
    const userContent: ClaudeImageContent[] = [];

    if (imageBase64) {
      const mediaType = imageBase64.startsWith("/9j/") ? "image/jpeg" : "image/png";
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imageBase64 },
      });
    } else if (imageUrl) {
      userContent.push({
        type: "image",
        source: { type: "url", url: imageUrl },
      });
    }

    userContent.push({
      type: "text",
      text: "Analyze this image. First determine if it's a fashion/outfit post, then analyze accordingly."
    });

    console.log("Calling Claude API for outfit analysis...");

    const response = await callAnthropicWithRetry({
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      const userError = response.status === 529
        ? "SearchOutfit is busy right now. Please try again in a few seconds."
        : `AI analysis error: ${response.status}`;
      return new Response(
        JSON.stringify({ error: userError, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeResponse = await response.json() as ClaudeResponse;
    console.log("Claude response received successfully");

    const textContent = claudeResponse.content?.find(
      (content): content is { type: "text"; text: string } => content.type === "text",
    )?.text;
    
    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let analysisResult;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = { raw_response: textContent };
      }
    } catch {
      analysisResult = { raw_response: textContent };
    }

    // Check if it's not a fashion post
    if (analysisResult.is_fashion === false) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          not_fashion: true,
          content_type: analysisResult.content_type,
          message: analysisResult.message 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-outfit:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
