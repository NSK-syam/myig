import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildAppCorsHeaders } from "../_shared/app-access.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { consumeGuestSearchAccess } from "../_shared/search-access-service.ts";
import {
  IMAGE_BUCKET,
  enforceRateLimit,
  getSupabaseAdmin,
  materializeImageRefs,
  requireAppToken,
  requireGuestToken,
  rateLimitHeaders,
} from "../_shared/security.ts";
import {
  buildFinalImageRefs,
  extractImagesFromHtml,
  filterDominantCachedInstagramRefs,
  getRequestedCarouselImageIndex,
  hasCachedInstagramImages,
  isPrivateOrUnavailablePostHtml,
  parseInstagramPostUrl,
  pickRicherImageSet,
  salvageCachedImageRefsByByteSize,
  shouldAttemptEmbedFallback,
  shouldUseCachedInstagramImages,
} from "./helpers.ts";

type InstagramGraphQLMedia = {
  edge_sidecar_to_children?: { edges?: Array<{ node?: { display_url?: string } }> };
  display_url?: string;
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> };
  is_video?: boolean;
};

const corsHeaders = buildAppCorsHeaders();

// Instagram internal GraphQL doc_id — rotates every 2-4 weeks
const DOC_ID = "10015901848480474";
const IG_APP_ID = "936619743392459";
const PRIVATE_POST_ERROR = "INSTAGRAM_PRIVATE_OR_UNAVAILABLE_POST";
const BROWSER_NAV_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Referer": "https://www.instagram.com/",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function extractViaGraphQL(shortcode: string): Promise<{ images: string[]; caption?: string; isVideo: boolean }> {
  console.log("Attempting GraphQL extraction for shortcode:", shortcode);

  const response = await fetch("https://www.instagram.com/api/graphql", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36",
      "X-IG-App-ID": IG_APP_ID,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      variables: JSON.stringify({ shortcode }),
      doc_id: DOC_ID,
      lsd: "AVqbxe3J_YA",
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const data = await response.json() as { data?: { xdt_shortcode_media?: InstagramGraphQLMedia } };
  const media = data?.data?.xdt_shortcode_media;
  if (!media) {
    throw new Error("Post not found via GraphQL");
  }

  const images =
    media.edge_sidecar_to_children?.edges
      ?.map((edge) => edge.node?.display_url)
      .filter((url): url is string => Boolean(url)) ??
    (media.display_url ? [media.display_url] : []);

  const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text;

  return { images, caption, isVideo: !!media.is_video };
}

async function fetchInstagramHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: BROWSER_NAV_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Instagram page fetch failed: ${response.status}`);
  }

  return await response.text();
}

async function extractViaHtmlScrape(url: string): Promise<{ images: string[]; caption?: string }> {
  console.log("Attempting HTML scrape for URL:", url);
  const html = await fetchInstagramHtml(url);
  if (isPrivateOrUnavailablePostHtml(html)) {
    throw new Error(PRIVATE_POST_ERROR);
  }
  return extractImagesFromHtml(html);
}

async function extractViaEmbed(url: string): Promise<{ images: string[]; caption?: string }> {
  const embedUrl = `${url.replace(/\/+$/, "")}/embed/captioned/`;
  console.log("Attempting embed scrape for URL:", embedUrl);
  const html = await fetchInstagramHtml(embedUrl);
  if (isPrivateOrUnavailablePostHtml(html)) {
    throw new Error(PRIVATE_POST_ERROR);
  }
  return extractImagesFromHtml(html);
}

type ProxiedInstagramImage = {
  base64: string;
  byteLength: number;
  contentType: string;
  ref: string;
};

async function proxyAndStore(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  cdnUrl: string,
  shortcode: string,
  index: number
): Promise<ProxiedInstagramImage> {
  // If it's a data URL (from Firecrawl screenshot), decode base64
  let buffer: ArrayBuffer;
  let contentType = "image/jpeg";

  if (cdnUrl.startsWith("data:")) {
    const matches = cdnUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid data URL");
    contentType = matches[1];
    const binaryStr = atob(matches[2]);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } else {
    // Download from Instagram CDN with browser-like headers
    const response = await fetch(cdnUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });
    if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
    buffer = await response.arrayBuffer();
    contentType = response.headers.get("content-type") || "image/jpeg";
  }

  const ext = contentType.includes("png") ? "png" : "jpg";
  const filename = `instagram/${shortcode}/${index}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(IMAGE_BUCKET)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return {
    base64: btoa(binary),
    byteLength: bytes.byteLength,
    contentType,
    ref: filename,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tokenCheck = await requireAppToken(req, "extract-instagram");
    if (!tokenCheck.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: tokenCheck.error }),
        { status: tokenCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = await enforceRateLimit({
      supabaseAdmin,
      req,
      action: "extract-instagram",
      limit: 20,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many Instagram extraction requests. Please wait and try again." }),
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

    const { instagramUrl } = await req.json();
    if (!instagramUrl || typeof instagramUrl !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Instagram URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedInstagramUrl = parseInstagramPostUrl(instagramUrl);
    if (!parsedInstagramUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Provide a valid public Instagram post URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      const guestCheck = await requireGuestToken(req);
      if (!guestCheck.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: guestCheck.error }),
          { status: guestCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const guestAccess = await consumeGuestSearchAccess(
        supabaseAdmin,
        guestCheck.guestId,
        "instagram_url",
        { source: "extract-instagram" },
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

    const { shortcode, normalizedUrl, requestedIndex } = parsedInstagramUrl;

    console.log("Extracting Instagram post:", shortcode);

    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from("instagram_extractions")
      .select("images, caption, is_video")
      .eq("shortcode", shortcode)
      .maybeSingle();

    if (shouldUseCachedInstagramImages(cached?.images)) {
      console.log("Cache hit for shortcode:", shortcode);
      let cachedImageRefs = cached.images;

      if (cached.images.length > 1) {
        const cachedCandidates = await Promise.all(
          cached.images.map(async (ref) => {
            try {
              const { data, error } = await supabaseAdmin.storage
                .from(IMAGE_BUCKET)
                .download(ref);
              if (error || !data) {
                console.warn("Failed to inspect cached Instagram image:", ref, error);
                return null;
              }

              return {
                ref,
                byteLength: data.size,
              };
            } catch (error) {
              console.warn("Failed to inspect cached Instagram image:", ref, error);
              return null;
            }
          }),
        );

        const dominantRefs = filterDominantCachedInstagramRefs(
          cached.images,
          cachedCandidates.filter((candidate): candidate is { ref: string; byteLength: number } => Boolean(candidate)),
        );

        if (dominantRefs.length < cached.images.length) {
          console.warn(
            "Filtering polluted cached Instagram extraction down to dominant media:",
            cached.images.length,
            "->",
            dominantRefs.length,
          );
          cachedImageRefs = dominantRefs;
          await supabaseAdmin.from("instagram_extractions").upsert({
            shortcode,
            original_url: normalizedUrl,
            images: cachedImageRefs,
            caption: cached.caption ?? null,
            is_video: cached.is_video ?? false,
            extracted_at: new Date().toISOString(),
          }, { onConflict: "shortcode" });
        }
      }

      const images = await materializeImageRefs(supabaseAdmin, cachedImageRefs);
      return new Response(
        JSON.stringify({ success: true, images, caption: cached.caption, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (hasCachedInstagramImages(cached?.images)) {
      console.warn(
        "Discarding polluted Instagram cache entry and forcing fresh extraction:",
        shortcode,
        cached.images.length,
      );
    }

    // Try extraction methods in order
    let extractedImages: string[] = [];
    let caption: string | undefined;
    let isVideo = false;

    // Primary: Instagram GraphQL (free, fast)
    try {
      const result = await extractViaGraphQL(shortcode);
      extractedImages = result.images;
      caption = result.caption;
      isVideo = result.isVideo;
      console.log("GraphQL extraction succeeded:", extractedImages.length, "images");

      if (shouldAttemptEmbedFallback(extractedImages, requestedIndex)) {
        try {
          const htmlResult = await extractViaHtmlScrape(normalizedUrl);
          extractedImages = pickRicherImageSet(extractedImages, htmlResult.images);
          caption = caption || htmlResult.caption;
          console.log("HTML enrichment produced", extractedImages.length, "images");
        } catch (htmlEnrichmentError) {
          console.warn("HTML enrichment after GraphQL failed:", htmlEnrichmentError);
        }
      }

      if (shouldAttemptEmbedFallback(extractedImages, requestedIndex)) {
        try {
          const embedResult = await extractViaEmbed(normalizedUrl);
          extractedImages = pickRicherImageSet(extractedImages, embedResult.images);
          caption = caption || embedResult.caption;
          console.log("Embed enrichment produced", extractedImages.length, "images");
        } catch (embedEnrichmentError) {
          console.warn("Embed enrichment after GraphQL failed:", embedEnrichmentError);
        }
      }
    } catch (gqlError) {
      console.warn("GraphQL extraction failed:", gqlError);

      // Fallback: public page HTML scrape
      try {
        const result = await extractViaHtmlScrape(normalizedUrl);
        extractedImages = result.images;
        caption = result.caption;
        console.log("HTML scrape succeeded");

        if (shouldAttemptEmbedFallback(extractedImages, requestedIndex)) {
          const embedResult = await extractViaEmbed(normalizedUrl);
          extractedImages = pickRicherImageSet(extractedImages, embedResult.images);
          caption = caption || embedResult.caption;
          console.log("Embed scrape enrichment produced", extractedImages.length, "images");
        }
      } catch (htmlError) {
        if (htmlError instanceof Error && htmlError.message === PRIVATE_POST_ERROR) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "This Instagram post is not publicly accessible. Please use a public post URL or upload a screenshot instead.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.warn("Public page HTML scrape failed:", htmlError);

        try {
          const result = await extractViaEmbed(normalizedUrl);
          extractedImages = result.images;
          caption = result.caption;
          console.log("Embed scrape succeeded");
        } catch (embedError) {
          if (embedError instanceof Error && embedError.message === PRIVATE_POST_ERROR) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "This Instagram post is not publicly accessible. Please use a public post URL or upload a screenshot instead.",
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.error("Embed scrape also failed:", embedError);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Could not extract images from this Instagram post. Please try uploading a screenshot instead.",
            }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Download and proxy images to storage first so we can discard
    // polluted thumbnail candidates before picking the selected slide.
    let finalImageRefs = extractedImages;
    let imageBase64: string | null = null;
    try {
      const proxiedImages = await Promise.all(
        extractedImages.map(async (imageUrl, index) => {
          try {
            return await proxyAndStore(supabaseAdmin, imageUrl, shortcode, index);
          } catch (error) {
            console.warn(`Image proxy to storage failed for image ${index}:`, error);
            return null;
          }
        }),
      );

      const proxiedRefs = proxiedImages.map((image) => image?.ref ?? null);
      finalImageRefs = buildFinalImageRefs(extractedImages, proxiedRefs);

      const salvageCandidates = proxiedImages
        .filter((image): image is ProxiedInstagramImage => Boolean(image))
        .map((image) => ({ ref: image.ref, byteLength: image.byteLength }));
      const salvagedRefs = salvageCachedImageRefsByByteSize(salvageCandidates);

      if (salvagedRefs.length > 0 && salvagedRefs.length < finalImageRefs.length) {
        console.warn(
          "Filtering Instagram extraction down to dominant media set:",
          finalImageRefs.length,
          "->",
          salvagedRefs.length,
        );
        finalImageRefs = salvagedRefs;
      }

      const selectedImageIndex = getRequestedCarouselImageIndex(finalImageRefs, requestedIndex);
      const selectedRef = finalImageRefs[selectedImageIndex] ?? null;
      const selectedProxiedImage = proxiedImages.find((image) => image?.ref === selectedRef) ?? null;
      imageBase64 = selectedProxiedImage?.base64 ?? null;
    } catch (proxyError) {
      console.warn("Image proxy to storage failed:", proxyError);
    }

    if (!imageBase64) {
      const selectedImageIndex = getRequestedCarouselImageIndex(finalImageRefs, requestedIndex);
      const selectedImage = finalImageRefs[selectedImageIndex];
      if (selectedImage) {
        try {
          console.log("Downloading image for base64 conversion...");
          const imgResp = await fetch(selectedImage, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
              "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
              "Referer": "https://www.instagram.com/",
            },
          });
          if (imgResp.ok) {
            const arrayBuf = await imgResp.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            imageBase64 = btoa(binary);
            console.log("Image downloaded and encoded to base64, length:", imageBase64.length);
          } else {
            console.warn("Image download failed:", imgResp.status);
          }
        } catch (dlErr) {
          console.warn("Image download error:", dlErr);
        }
      }
    }

    // Cache the result
    await supabaseAdmin.from("instagram_extractions").upsert({
      shortcode,
      original_url: normalizedUrl,
      images: finalImageRefs,
      caption: caption || null,
      is_video: isVideo,
      extracted_at: new Date().toISOString(),
    }, { onConflict: "shortcode" });

    const responseImages = await materializeImageRefs(supabaseAdmin, finalImageRefs);

    console.log("Extraction complete.", responseImages.length, "images.");

    return new Response(
      JSON.stringify({
        success: true,
        images: responseImages,
        imageBase64: imageBase64 || null,
        caption,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-instagram:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
