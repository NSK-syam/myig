export const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
export const MAX_INSTAGRAM_CAROUSEL_IMAGES = 20;
const MIN_PLAUSIBLE_CACHED_IMAGE_BYTES = 24_000;
const MAX_IMAGE_SIZE_DROP_RATIO = 0.4;

export function parseInstagramPostUrl(input: string): { shortcode: string; normalizedUrl: string; requestedIndex: number | null } | null {
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !INSTAGRAM_HOSTS.has(hostname)) {
      return null;
    }

    const pathname = url.pathname.replace(/\/+$/, "");
    const match = pathname.match(/^\/(?:[A-Za-z0-9_.]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]+)$/);

    if (!match?.[2]) {
      return null;
    }

    const postType = match[1];
    const rawShortcode = match[2];
    const shortcode =
      url.searchParams.has("igsh") && rawShortcode.length > 11
        ? rawShortcode.slice(0, 11)
        : rawShortcode;
    const rawRequestedIndex = url.searchParams.get("img_index");
    const parsedRequestedIndex = rawRequestedIndex ? Number.parseInt(rawRequestedIndex, 10) : Number.NaN;
    const requestedIndex =
      Number.isInteger(parsedRequestedIndex) && parsedRequestedIndex >= 1
        ? parsedRequestedIndex - 1
        : null;

    return {
      shortcode,
      normalizedUrl: `https://www.instagram.com/${postType}/${shortcode}/`,
      requestedIndex,
    };
  } catch {
    return null;
  }
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function decodeInstagramEscapes(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\\\\u0026/g, "&")
    .replace(/\\\\u003c/g, "<")
    .replace(/\\\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\\\\//g, "/")
    .replace(/\\\//g, "/")
    .replace(/\\+$/g, "")
    .replace(/\\"/g, '"');
}

function normalizeImageCandidate(input: string): string {
  const decoded = decodeInstagramEscapes(input).trim();
  if (!decoded) return decoded;

  if (/^https?:\/\//i.test(decoded)) {
    return decoded;
  }

  if (/^[A-Za-z0-9-]+\.cdninstagram\.com\//i.test(decoded)) {
    return `https://${decoded}`;
  }

  return decoded;
}

export function dedupeImages(images: string[]): string[] {
  return [...new Set(images.filter(Boolean))];
}

export function buildFinalImageRefs(
  extractedImages: string[],
  proxiedRefs: Array<string | null | undefined>,
): string[] {
  return dedupeImages(
    extractedImages.map((image, index) => proxiedRefs[index] || image),
  );
}

export function pickRicherImageSet(primaryImages: string[], fallbackImages: string[]): string[] {
  return fallbackImages.length > primaryImages.length ? fallbackImages : primaryImages;
}

export function shouldAttemptEmbedFallback(images: string[], requestedIndex: number | null): boolean {
  return images.length <= 1 || (requestedIndex !== null && images.length <= requestedIndex);
}

export function hasCachedInstagramImages(images: string[] | null | undefined): images is string[] {
  return Array.isArray(images) && images.length > 0;
}

function parseCachedInstagramRefIndex(ref: string): number | null {
  const match = ref.match(/^instagram\/[^/]+\/(\d+)(?:_|\.|$)/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function hasContiguousCachedInstagramIndexes(images: string[]): boolean {
  const parsedIndexes = images.map(parseCachedInstagramRefIndex);
  const storageRefsCount = parsedIndexes.filter((value) => value !== null).length;

  if (storageRefsCount === 0) {
    return true;
  }

  if (storageRefsCount !== images.length) {
    return false;
  }

  const sortedIndexes = parsedIndexes
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  return sortedIndexes.every((value, index) => value === index);
}

export function shouldUseCachedInstagramImages(images: string[] | null | undefined): images is string[] {
  return hasCachedInstagramImages(images)
    && isPlausibleInstagramImageCount(images.length)
    && hasContiguousCachedInstagramIndexes(images);
}

export function canServeRequestedIndexFromCache(images: string[], requestedIndex: number | null): boolean {
  if (images.length === 0) return false;
  if (requestedIndex === null) return true;
  return requestedIndex >= 0 && requestedIndex < images.length;
}

export function isPlausibleInstagramImageCount(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_INSTAGRAM_CAROUSEL_IMAGES;
}

export function salvageCachedImageRefsByByteSize(
  candidates: Array<{ ref: string; byteLength: number }>,
): string[] {
  if (candidates.length === 0) {
    return [];
  }

  const sorted = [...candidates]
    .filter((candidate) => candidate.ref && candidate.byteLength > 0)
    .sort((left, right) => right.byteLength - left.byteLength);

  const largest = sorted[0]?.byteLength ?? 0;
  if (largest < MIN_PLAUSIBLE_CACHED_IMAGE_BYTES) {
    return [];
  }

  const survivingRefs = new Set(
    sorted
    .filter((candidate) =>
      candidate.byteLength >= MIN_PLAUSIBLE_CACHED_IMAGE_BYTES
      && candidate.byteLength >= largest * MAX_IMAGE_SIZE_DROP_RATIO
    )
    .map((candidate) => candidate.ref),
  );

  return candidates
    .map((candidate) => candidate.ref)
    .filter((ref) => survivingRefs.has(ref));
}

export function filterDominantCachedInstagramRefs(
  refs: string[],
  candidates: Array<{ ref: string; byteLength: number }>,
): string[] {
  const dominantRefs = new Set(salvageCachedImageRefsByByteSize(candidates));

  if (dominantRefs.size === 0 || dominantRefs.size >= refs.length) {
    return refs;
  }

  return refs.filter((ref) => dominantRefs.has(ref));
}

export function getSelectedImageRef(images: string[], requestedIndex: number | null): string | null {
  if (!canServeRequestedIndexFromCache(images, requestedIndex)) {
    return null;
  }

  return images[getRequestedCarouselImageIndex(images, requestedIndex)] ?? null;
}

export function getRequestedCarouselImageIndex(images: string[], requestedIndex: number | null): number {
  if (
    requestedIndex !== null
    && requestedIndex >= 0
    && requestedIndex < images.length
  ) {
    return requestedIndex;
  }

  return 0;
}

export function isPrivateOrUnavailablePostHtml(html: string): boolean {
  return /PolarisLoggedOutPrivateDesktopPostRoute/.test(html)
    || /"pageID":"privatePostPage"/.test(html)
    || /"gql_data":null/.test(html);
}

export function extractImagesFromHtml(html: string): { images: string[]; caption?: string } {
  const imageCandidates: string[] = [];

  const collectMatches = (pattern: RegExp, decoder: (value: string) => string = normalizeImageCandidate) => {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) {
        imageCandidates.push(decoder(match[1]));
      }
    }
  };

  collectMatches(/\\?"display_url\\?":\\?"([^"]+)\\?"/g);

  collectMatches(/\\?"thumbnail_url\\?":\\?"([^"]+)\\?"/g);

  collectMatches(/\\?"thumbnail_src\\?":\\?"([^"]+)\\?"/g);

  collectMatches(/\\?"best_image\\?":\\?"([^"]+)\\?"/g);

  collectMatches(/\\?"display_resources\\?":\[\{\\?"src\\?":\\?"([^"]+)\\?"/g);

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (jsonLdMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      const thumbnailUrl = typeof parsed?.thumbnailUrl === "string" ? parsed.thumbnailUrl : null;
      if (thumbnailUrl) {
        imageCandidates.push(thumbnailUrl);
      }
    } catch (error) {
      console.warn("Failed to parse JSON-LD from Instagram HTML:", error);
    }
  }

  const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
  if (ogImageMatch?.[1]) {
    imageCandidates.push(normalizeImageCandidate(ogImageMatch[1]));
  }

  for (const match of html.matchAll(/<meta\s+(?:property|name)="og:image:secure_url"\s+content="([^"]+)"/gi)) {
    imageCandidates.push(normalizeImageCandidate(match[1]));
  }

  const captionMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i);
  const images = dedupeImages(imageCandidates);
  if (images.length === 0) {
    throw new Error("No images found in Instagram HTML");
  }

  return {
    images,
    caption: captionMatch?.[1] ? decodeHtmlEntities(captionMatch[1]) : undefined,
  };
}
