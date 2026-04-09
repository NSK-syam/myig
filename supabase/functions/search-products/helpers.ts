import type { SearchMarket } from "./market.ts";

export interface ProductResult {
  title: string;
  url: string;
  image?: string;
  proxyImageUrl?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  offer?: string;
  availability?: string;
  shipping?: string;
  source?: string;
  badge?: string;
  productId?: string;
  immersiveProductPageToken?: string;
  immersiveApiUrl?: string;
}

export interface SearchQuerySeed {
  item_name: string;
  brand: string;
  search_query: string;
  color?: string;
  material?: string;
  style?: string;
  category?: string;
  gender?: string;
}

export interface ItemSearchPlan {
  itemName: string;
  queries: string[];
}

export interface ItemResultGroup {
  itemName: string;
  products: ProductResult[];
}

type MerchantPageFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface GoogleShoppingIdentifiers {
  productId?: string;
  immersiveProductPageToken?: string;
  immersiveApiUrl?: string;
}

interface ClaudeFallbackPlanCandidate {
  itemName?: unknown;
  queries?: unknown;
}

const DEPRIORITIZED_DOMAINS = [
  "amazon.com",
  "walmart.com",
  "ebay.com",
  "shein.com",
  "aliexpress.com",
  "temu.com",
];

const ALLOWED_RETAIL_DOMAINS = [
  "nordstrom.com", "neimanmarcus.com", "bergdorfgoodman.com", "saks.com",
  "saksfifthavenue.com", "bloomingdales.com", "macys.com", "target.com",
  "walmart.com", "amazon.com", "zappos.com", "revolve.com", "asos.com",
  "hm.com", "zara.com", "uniqlo.com", "gap.com", "urbanoutfitters.com",
  "anthropologie.com", "freepeople.com", "jcrew.com", "bananarepublic.com",
  "abercrombie.com", "forever21.com", "shein.com",
  "net-a-porter.com", "mytheresa.com", "farfetch.com", "ssense.com",
  "matchesfashion.com", "brownsfashion.com", "luisaviaroma.com",
  "selfridges.com", "harrods.com", "libertylondon.com",
  "lyst.com", "shopbop.com", "yoox.com", "italist.com", "24s.com",
  "theoutnet.com", "gilt.com", "tjmaxx.com", "6pm.com", "ebay.com",
  "therealreal.com", "vestiairecollective.com", "depop.com",
  "poshmark.com", "grailed.com", "rebag.com", "mercari.com", "thredup.com",
  "gucci.com", "prada.com", "miumiu.com", "louisvuitton.com", "dior.com",
  "chanel.com", "hermes.com", "burberry.com", "fendi.com", "balenciaga.com",
  "valentino.com", "givenchy.com", "loewe.com", "celine.com", "bottegaveneta.com",
  "ysl.com", "saintlaurent.com", "tomford.com", "versace.com",
  "ralphlauren.com", "calvinklein.com", "coach.com", "michaelkors.com",
  "katespade.com", "toryburch.com", "jimmychoo.com", "acnestudios.com",
  "jacquemus.com", "therow.com", "reformation.com", "allsaints.com",
  "reiss.com", "cosstores.com", "mango.com", "massimodutti.com",
  "nike.com", "adidas.com", "newbalance.com", "converse.com", "vans.com",
  "puma.com", "birkenstock.com", "drmartens.com", "stevemadden.com",
  "tiffany.com", "cartier.com", "mejuri.com", "swarovski.com",
  "thesouledstore.com",
];

const FASHION_KEYWORDS = [
  "shirt", "t-shirt", "tee", "top", "blouse", "sweater", "hoodie", "jacket", "coat",
  "pants", "jeans", "trousers", "shorts", "skirt", "dress", "suit", "blazer", "vest",
  "shoes", "sneakers", "boots", "sandals", "loafers", "heels", "flats",
  "bag", "handbag", "purse", "backpack", "tote", "clutch",
  "hat", "cap", "beanie", "scarf", "belt", "watch", "sunglasses", "jewelry",
  "socks", "underwear", "swimwear", "activewear", "leggings", "joggers",
  "cardigan", "polo", "denim", "linen", "cotton", "leather", "knit",
  "sweatshirt", "tracksuit", "shorts", "romper", "jumpsuit", "overalls",
];

const TRACKING_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_",
  "tag",
  "aff",
  "affiliate",
  "cmpid",
  "camp",
  "campaign",
  "source",
  "srsltid",
]);

const BADGE_PRIORITY: Record<string, number> = {
  "Official Store": 5,
  "Authorized Retailer": 4,
  "Brand match": 3,
  "Resale": 2,
  "Search results": 1,
};

export function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", "").toLowerCase(); } catch { return ""; }
}

export function matchesAllowedHost(domain: string, allowed: string): boolean {
  return domain === allowed || domain.endsWith(`.${allowed}`);
}

export function isRetailDomain(url: string): boolean {
  const domain = getDomain(url);
  if (!domain) return false;
  return ALLOWED_RETAIL_DOMAINS.some((allowed) => matchesAllowedHost(domain, allowed));
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  if (first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 0) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  return normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
    || normalized === "::";
}

export function isProxySafePublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) return false;
    if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

export function isFashionProduct(title: string): boolean {
  const lower = title.toLowerCase();
  return FASHION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function isGoogleShoppingProductLink(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!domain.includes("google.com")) return false;

    return parsed.searchParams.get("ibp") === "oshop"
      || parsed.searchParams.has("prds")
      || parsed.pathname.toLowerCase().includes("/shopping/product/");
  } catch {
    return false;
  }
}

function isLikelyProductUrl(url: string): boolean {
  if (isGoogleShoppingProductLink(url)) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const blockedPathFragments = [
      "/live/",
      "/video",
      "/videos",
      "/search",
      "/stories",
      "/story/",
      "/blog",
      "/article",
      "/editorial",
      "/lookbook",
    ];

    if (blockedPathFragments.some((fragment) => path.includes(fragment))) {
      return false;
    }

    const blockedQueryKeys = ["q", "k", "keywords", "search", "query"];
    if (blockedQueryKeys.some((key) => parsed.searchParams.has(key))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function normalizeValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseGoogleShoppingIdentifiers(candidate?: string): GoogleShoppingIdentifiers {
  const normalized = normalizeValue(candidate);
  if (!normalized) return {};

  try {
    const parsed = new URL(normalized);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
    let productId: string | undefined;
    let immersiveProductPageToken: string | undefined;
    let immersiveApiUrl: string | undefined;

    if (domain.includes("google.com")) {
      const pathMatch = parsed.pathname.match(/\/shopping\/product\/([^/?]+)/i);
      if (pathMatch?.[1]) {
        productId = pathMatch[1];
      }

      const prds = parsed.searchParams.get("prds");
      if (prds) {
        for (const rawToken of prds.split(/[;,]/)) {
          const [rawKey, ...rawValueParts] = rawToken.split(":");
          const key = rawKey?.trim().toLowerCase();
          const value = rawValueParts.join(":").trim();
          if (!key || !value) continue;

          if (!productId && ["pid", "productid", "catalogid", "catalog_id", "cid"].includes(key)) {
            productId = value;
          }
        }
      }
    }

    if (domain.includes("serpapi.com")) {
      if (parsed.searchParams.get("engine") === "google_immersive_product") {
        immersiveApiUrl = parsed.toString();
      }

      immersiveProductPageToken = normalizeValue(parsed.searchParams.get("page_token"));
    }

    return { productId, immersiveProductPageToken, immersiveApiUrl };
  } catch {
    return {};
  }
}

function buildImmersiveProductApiUrl(
  market: SearchMarket,
  apiKey: string,
  candidateUrl?: string,
  pageToken?: string,
): string | undefined {
  try {
    const parsed = candidateUrl ? new URL(candidateUrl) : new URL("https://serpapi.com/search.json");
    if (!parsed.hostname.replace(/^www\./, "").toLowerCase().includes("serpapi.com")) {
      return undefined;
    }

    if (!parsed.searchParams.get("engine")) {
      parsed.searchParams.set("engine", "google_immersive_product");
    }

    if (!parsed.searchParams.get("page_token") && pageToken) {
      parsed.searchParams.set("page_token", pageToken);
    }

    if (!parsed.searchParams.get("page_token")) return undefined;

    parsed.searchParams.set("gl", market.gl);
    parsed.searchParams.set("hl", market.hl);
    parsed.searchParams.set("more_stores", "1");
    parsed.searchParams.set("api_key", apiKey);
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function resolveImageUrl(value: string, pageUrl: string): string | undefined {
  const normalized = decodeHtmlAttribute(value.trim());
  if (!normalized) return undefined;

  try {
    const resolved = new URL(normalized, pageUrl);
    if (!/^https?:$/.test(resolved.protocol)) return undefined;
    return resolved.toString();
  } catch {
    return undefined;
  }
}

function parseSrcsetCandidates(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter((entry) => entry.length > 0);
}

function isLikelyProductImageCandidate(value: string): boolean {
  const lower = value.toLowerCase();

  if (lower.endsWith(".svg")) return false;

  const blockedFragments = [
    "logo",
    "icon",
    "sprite",
    "avatar",
    "placeholder",
    "spacer",
    "blank",
    "tracking",
    "pixel",
    "favicon",
  ];

  return !blockedFragments.some((fragment) => lower.includes(fragment));
}

function extractMetaAttributes(markup: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const match of markup.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(['"])(.*?)\2/g)) {
    attrs[match[1].toLowerCase()] = match[3];
  }

  return attrs;
}

function collectJsonLdImageCandidates(node: unknown): string[] {
  if (!node) return [];

  if (typeof node === "string") return [node];

  if (Array.isArray(node)) {
    return node.flatMap((entry) => collectJsonLdImageCandidates(entry));
  }

  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    const candidates: string[] = [];

    if ("image" in record) {
      candidates.push(...collectJsonLdImageCandidates(record.image));
    }

    if ("thumbnailUrl" in record) {
      candidates.push(...collectJsonLdImageCandidates(record.thumbnailUrl));
    }

    if ("url" in record && typeof record.url === "string") {
      candidates.push(record.url);
    }

    return candidates;
  }

  return [];
}

export function extractProductImageFromHtml(html: string, pageUrl: string): string | undefined {
  for (const match of html.matchAll(/<meta\b([^>]+)>/gi)) {
    const attrs = extractMetaAttributes(match[1] ?? "");
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    const content = attrs.content;
    if (!content) continue;

    if (["og:image", "twitter:image", "image"].includes(key)) {
      const resolved = resolveImageUrl(content, pageUrl);
      if (resolved) return resolved;
    }
  }

  for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = extractMetaAttributes(match[1] ?? "");
    const rel = (attrs.rel || "").toLowerCase();
    const as = (attrs.as || "").toLowerCase();
    const href = attrs.href;
    if (!href) continue;
    if (!(rel.includes("preload") || rel.includes("image"))) continue;
    if (as && as !== "image") continue;
    if (!isLikelyProductImageCandidate(href)) continue;

    const resolved = resolveImageUrl(href, pageUrl);
    if (resolved) return resolved;
  }

  for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
    const attrs = extractMetaAttributes(match[1] ?? "");
    const rawCandidates = [
      attrs.src,
      attrs["data-src"],
      attrs["data-original"],
      attrs["data-image"],
      attrs["data-lazy-src"],
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    const srcsetCandidates = [
      attrs.srcset,
      attrs["data-srcset"],
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .flatMap((value) => parseSrcsetCandidates(value));

    for (const candidate of [...rawCandidates, ...srcsetCandidates]) {
      if (!isLikelyProductImageCandidate(candidate)) continue;
      const resolved = resolveImageUrl(candidate, pageUrl);
      if (resolved) return resolved;
    }
  }

  for (const match of html.matchAll(/<script\b[^>]*type=(['"])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = match[2]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const candidates = collectJsonLdImageCandidates(parsed);
      for (const candidate of candidates) {
        const resolved = resolveImageUrl(candidate, pageUrl);
        if (resolved) return resolved;
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return undefined;
}

export async function enrichProductsWithMerchantPageImages(
  products: ProductResult[],
  fetcher: MerchantPageFetcher = fetch,
  maxFetches = 8,
): Promise<ProductResult[]> {
  const targets = products
    .filter((product) => !product.image && product.url && isProxySafePublicUrl(product.url) && isLikelyProductUrl(product.url))
    .slice(0, maxFetches);

  if (targets.length === 0) return products;

  const resolvedImages = new Map<string, string>();

  await Promise.all(
    targets.map(async (product) => {
      try {
        const response = await fetcher(product.url, {
          headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });

        if (!response.ok) return;
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) return;

        const html = await response.text();
        const image = extractProductImageFromHtml(html, product.url);
        if (image) {
          resolvedImages.set(product.url, image);
        }
      } catch {
        // Leave image empty when the retailer page cannot be fetched.
      }
    }),
  );

  if (resolvedImages.size === 0) return products;

  return products.map((product) => (
    product.image || !resolvedImages.has(product.url)
      ? product
      : { ...product, image: resolvedImages.get(product.url) }
  ));
}

function pickExtension(extensions: string[], matcher: (value: string) => boolean): string | undefined {
  return extensions.find((value) => matcher(value.toLowerCase()));
}

export function toShoppingProduct(result: Record<string, unknown>, badge?: string): ProductResult | null {
  const title = normalizeValue(result.title);
  const url = normalizeValue(result.link) ?? normalizeValue(result.product_link);
  const urlDerivedIds = parseGoogleShoppingIdentifiers(url);
  const immersiveApiUrl = normalizeValue(result.serpapi_immersive_product_api) ?? urlDerivedIds.immersiveApiUrl;
  const immersiveApiDerivedIds = parseGoogleShoppingIdentifiers(immersiveApiUrl);
  const productId = normalizeValue(result.product_id) ?? urlDerivedIds.productId ?? immersiveApiDerivedIds.productId;
  const immersiveProductPageToken =
    normalizeValue(result.immersive_product_page_token)
    ?? immersiveApiDerivedIds.immersiveProductPageToken
    ?? urlDerivedIds.immersiveProductPageToken;
  const isGoogleShoppingFallback = isGoogleShoppingProductLink(url);
  if (!title || !url) return null;
  if (getDomain(url).includes("google.com") && !isGoogleShoppingFallback) return null;
  if (!isLikelyProductUrl(url)) return null;

  const extensions = Array.isArray(result.extensions)
    ? result.extensions.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  const extractedPrice = typeof result.extracted_price === "number" ? `$${result.extracted_price}` : undefined;
  const extractedOldPrice = typeof result.extracted_old_price === "number" ? `$${result.extracted_old_price}` : undefined;
  const shipping =
    normalizeValue(result.delivery)
    ?? pickExtension(extensions, (value) => value.includes("delivery") || value.includes("shipping"));
  const availability = pickExtension(
    extensions,
    (value) => value.includes("in stock") || value.includes("out of stock") || value.includes("limited stock") || value.includes("sold out"),
  );
  const discount = pickExtension(
    extensions,
    (value) => value.includes("% off") || value.includes(" off") || value.includes("save "),
  );
  const offer = pickExtension(
    extensions,
    (value) => value.includes("offer") || value.includes("coupon") || value.includes("member") || value.includes("deal"),
  );

  return {
    title,
    url,
    image: normalizeValue(result.thumbnail),
    price: extractedPrice ?? normalizeValue(result.price),
    originalPrice: extractedOldPrice ?? normalizeValue(result.old_price),
    discount,
    offer,
    availability,
    shipping,
    source: normalizeValue(result.source) ?? (getDomain(url) || undefined),
    badge,
    productId,
    immersiveProductPageToken,
    immersiveApiUrl,
  };
}

function extractDirectMerchantUrl(candidate?: string): string | undefined {
  const normalized = normalizeValue(candidate);
  if (!normalized) return undefined;

  try {
    const parsed = new URL(normalized);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (domain.includes("google.com")) {
      const redirectTarget = parsed.searchParams.get("q") ?? parsed.searchParams.get("url");
      if (!redirectTarget) return undefined;
      return extractDirectMerchantUrl(redirectTarget);
    }

    if (!isProxySafePublicUrl(normalized)) return undefined;
    if (!isLikelyProductUrl(normalized)) return undefined;
    return normalized;
  } catch {
    return undefined;
  }
}

function parseSellerPrice(value: unknown): string | undefined {
  if (typeof value === "number") return `$${value}`;
  return normalizeValue(value);
}

function collectSellerTextSignals(seller: Record<string, unknown>): string[] {
  const values: string[] = [];
  const directKeys = [
    "details_and_offers",
    "delivery",
    "returns",
    "condition",
    "extensions",
    "badge",
    "shipping",
    "availability",
  ];

  for (const key of directKeys) {
    const raw = seller[key];
    if (Array.isArray(raw)) {
      values.push(...raw.filter((value): value is string => typeof value === "string" && value.trim().length > 0));
    } else if (typeof raw === "string" && raw.trim().length > 0) {
      values.push(raw);
    } else if (raw && typeof raw === "object") {
      for (const nested of Object.values(raw as Record<string, unknown>)) {
        if (typeof nested === "string" && nested.trim().length > 0) {
          values.push(nested);
        }
      }
    }
  }

  return values;
}

function sellerToProductResult(
  seller: Record<string, unknown>,
  fallbackProduct: ProductResult,
  badge?: string,
): ProductResult | null {
  const directUrl = extractDirectMerchantUrl(
    normalizeValue(seller.direct_link)
      ?? normalizeValue(seller.link)
      ?? normalizeValue(seller.url),
  );
  if (!directUrl) return null;

  const signals = collectSellerTextSignals(seller);
  const badgeValue = normalizeValue(seller.badge);
  const shipping = normalizeValue(seller.shipping)
    ?? pickExtension(signals, (value) => value.includes("delivery") || value.includes("shipping") || value.includes("pickup"));
  const availability = normalizeValue(seller.availability)
    ?? pickExtension(signals, (value) => value.includes("in stock") || value.includes("out of stock") || value.includes("limited stock") || value.includes("sold out"));
  const offer = badgeValue
    ?? pickExtension(signals, (value) => value.includes("offer") || value.includes("coupon") || value.includes("member") || value.includes("cash back") || value.includes("deal"));

  return {
    ...fallbackProduct,
    url: directUrl,
    source: normalizeValue(seller.name) ?? fallbackProduct.source,
    price: parseSellerPrice(seller.price) ?? parseSellerPrice(seller.base_price) ?? parseSellerPrice(seller.total_price) ?? fallbackProduct.price,
    originalPrice: parseSellerPrice(seller.original_price) ?? fallbackProduct.originalPrice,
    shipping: shipping ?? fallbackProduct.shipping,
    availability: availability ?? fallbackProduct.availability,
    offer: offer ?? fallbackProduct.offer,
    badge: badge ?? fallbackProduct.badge,
  };
}

function storeToProductResult(
  store: Record<string, unknown>,
  fallbackProduct: ProductResult,
  badge?: string,
): ProductResult | null {
  const directUrl = extractDirectMerchantUrl(
    normalizeValue(store.link)
      ?? normalizeValue(store.direct_link)
      ?? normalizeValue(store.url),
  );
  if (!directUrl) return null;

  const signals = collectSellerTextSignals(store);
  const badgeValue = normalizeValue(store.tag) ?? normalizeValue(store.badge);
  const shipping = normalizeValue(store.shipping)
    ?? pickExtension(signals, (value) => value.includes("delivery") || value.includes("shipping") || value.includes("pickup"));
  const availability = normalizeValue(store.availability)
    ?? pickExtension(signals, (value) => value.includes("in stock") || value.includes("out of stock") || value.includes("limited stock") || value.includes("sold out"));
  const offer = normalizeValue(store.coupon)
    ?? badgeValue
    ?? pickExtension(signals, (value) => value.includes("offer") || value.includes("coupon") || value.includes("member") || value.includes("cash back") || value.includes("deal"));

  return {
    ...fallbackProduct,
    title: normalizeValue(store.title) ?? fallbackProduct.title,
    url: directUrl,
    source: normalizeValue(store.name) ?? fallbackProduct.source,
    price: parseSellerPrice(store.price) ?? parseSellerPrice(store.base_price) ?? parseSellerPrice(store.total_price) ?? fallbackProduct.price,
    originalPrice: parseSellerPrice(store.original_price) ?? fallbackProduct.originalPrice,
    shipping: shipping ?? fallbackProduct.shipping,
    availability: availability ?? fallbackProduct.availability,
    offer: offer ?? fallbackProduct.offer,
    badge: badge ?? fallbackProduct.badge,
  };
}

function getGoogleShoppingResolutionKey(product: ProductResult): string | undefined {
  return product.immersiveProductPageToken ?? product.productId ?? normalizeValue(product.immersiveApiUrl) ?? product.url;
}

async function resolveImmersiveProductStores(
  product: ProductResult,
  apiKey: string,
  market: SearchMarket,
  fetcher: MerchantPageFetcher,
): Promise<ProductResult[]> {
  const immersiveApiUrl = buildImmersiveProductApiUrl(
    market,
    apiKey,
    product.immersiveApiUrl,
    product.immersiveProductPageToken,
  );
  if (!immersiveApiUrl) return [];

  const response = await fetcher(immersiveApiUrl);
  if (!response.ok) return [];

  const data = await response.json();
  const stores = Array.isArray(data?.product_results?.stores)
    ? data.product_results.stores as Array<Record<string, unknown>>
    : [];

  return stores
    .map((store) => storeToProductResult(store, product))
    .filter((store): store is ProductResult => Boolean(store));
}

async function resolveLegacyGoogleProductStores(
  product: ProductResult,
  apiKey: string,
  market: SearchMarket,
  fetcher: MerchantPageFetcher,
): Promise<ProductResult[]> {
  const productId = product.productId;
  if (!productId) return [];

  const params = new URLSearchParams({
    engine: "google_product",
    product_id: productId,
    offers: "1",
    gl: market.gl,
    hl: market.hl,
    api_key: apiKey,
  });

  const response = await fetcher(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) return [];

  const data = await response.json();
  const onlineSellers = Array.isArray(data?.sellers_results?.online_sellers)
    ? data.sellers_results.online_sellers as Array<Record<string, unknown>>
    : [];

  return onlineSellers
    .map((seller) => sellerToProductResult(seller, product))
    .filter((seller): seller is ProductResult => Boolean(seller));
}

export async function resolveGoogleShoppingFallbackProducts(
  products: ProductResult[],
  apiKey: string,
  market: SearchMarket,
  fetcher: MerchantPageFetcher = fetch,
  maxProductsToResolve = 3,
): Promise<ProductResult[]> {
  const targets = products
    .filter((product) =>
      isGoogleShoppingProductLink(product.url)
      && Boolean(product.productId || product.immersiveProductPageToken || product.immersiveApiUrl)
    )
    .slice(0, maxProductsToResolve);

  if (targets.length === 0) return products;

  const resolvedByKey = new Map<string, ProductResult[]>();

  await Promise.all(
    targets.map(async (product) => {
      const resolutionKey = getGoogleShoppingResolutionKey(product);
      if (!resolutionKey) return;

      try {
        let resolvedProducts = product.immersiveProductPageToken || product.immersiveApiUrl
          ? await resolveImmersiveProductStores(product, apiKey, market, fetcher)
          : [];

        if (resolvedProducts.length === 0 && product.productId) {
          resolvedProducts = await resolveLegacyGoogleProductStores(product, apiKey, market, fetcher);
        }

        if (resolvedProducts.length > 0) {
          resolvedByKey.set(resolutionKey, resolvedProducts);
        }
      } catch {
        // Ignore offer resolution failures and keep the original fallback row behavior.
      }
    }),
  );

  if (resolvedByKey.size === 0) return products;

  const resolvedProducts: ProductResult[] = [];

  for (const product of products) {
    const resolutionKey = getGoogleShoppingResolutionKey(product);
    if (resolutionKey && resolvedByKey.has(resolutionKey)) {
      resolvedProducts.push(...(resolvedByKey.get(resolutionKey) ?? []));
      continue;
    }

    resolvedProducts.push(product);
  }

  return resolvedProducts;
}

export function getMarketDomainBucket(
  url: string,
  market: SearchMarket,
  officialBrandDomain = "",
): "preferred" | "neutral" | "suppressed" {
  const domain = getDomain(url);
  if (!domain) return "neutral";

  const normalizedOfficialDomain = officialBrandDomain.replace(/^www\./, "").toLowerCase();
  if (normalizedOfficialDomain && matchesAllowedHost(domain, normalizedOfficialDomain)) {
    return "preferred";
  }

  if (market.suppressedDomains.some((allowed) => matchesAllowedHost(domain, allowed))) {
    return "suppressed";
  }

  if (market.preferredDomains.some((allowed) => matchesAllowedHost(domain, allowed))) {
    return "preferred";
  }

  return "neutral";
}

function normalizeQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeShoppingTerms(value: string): string {
  return normalizeQuery(value.replace(/[^a-zA-Z0-9\s]/g, " ")).toLowerCase();
}

type CanonicalGender = "men" | "women" | "unisex";

function extractGenderHints(value: string): Set<CanonicalGender> {
  const normalized = normalizeShoppingTerms(value);
  const hints = new Set<CanonicalGender>();

  if (/\bunisex\b/.test(normalized)) {
    hints.add("unisex");
  }

  if (/\b(men|mens|man|male)\b/.test(normalized)) {
    hints.add("men");
  }

  if (/\b(women|womens|woman|female|ladies|lady)\b/.test(normalized)) {
    hints.add("women");
  }

  return hints;
}

function stripGenderTerms(value: string): string {
  return normalizeQuery(
    value.replace(/\b(women'?s?|womens|woman|ladies|lady|female|men'?s?|mens|man|male|unisex)\b/gi, " "),
  );
}

function resolveSearchGender(item: SearchQuerySeed): CanonicalGender {
  const explicitHints = extractGenderHints(item.gender || "");
  const queryHints = extractGenderHints(item.search_query);
  const combinedHints = new Set<CanonicalGender>([...explicitHints, ...queryHints]);

  if (combinedHints.size === 0) return "unisex";
  if (combinedHints.has("unisex")) return "unisex";
  if (combinedHints.size > 1) return "unisex";
  return combinedHints.values().next().value ?? "unisex";
}

function normalizeSearchQueryGender(value: string, gender: CanonicalGender): string {
  const normalized = normalizeQuery(value);
  if (!normalized) return normalized;

  const queryHints = extractGenderHints(normalized);
  if (queryHints.size === 0) return normalized;
  if (queryHints.size === 1 && queryHints.has(gender)) return normalized;

  const stripped = stripGenderTerms(normalized);
  if (!stripped) return normalized;
  if (gender === "unisex") return stripped;
  return `${stripped} ${gender}`;
}

function appendGenderQualifier(baseQuery: string, gender: CanonicalGender): string | undefined {
  const normalized = normalizeQuery(baseQuery);
  if (!normalized) return undefined;

  const queryHints = extractGenderHints(normalized);
  if (queryHints.size > 0) return undefined;

  return `${normalized} ${gender}`;
}

function canonicalizeProductUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.hash = "";

    const kept = new URLSearchParams();
    for (const [key, entry] of parsed.searchParams.entries()) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) continue;
      kept.append(key, entry);
    }

    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    const normalizedSearch = kept.toString();
    return `${parsed.origin.toLowerCase()}${normalizedPath}${normalizedSearch ? `?${normalizedSearch}` : ""}`;
  } catch {
    return value.trim();
  }
}

function normalizeProductTitleKey(value: string): string {
  return normalizeShoppingTerms(
    value.replace(/\b(women|womens|men|mens|online|buy|sale|new|official|store)\b/gi, " "),
  );
}

function buildProductIdentityKey(product: ProductResult): string {
  const domain = getDomain(product.url);
  const canonicalUrl = canonicalizeProductUrl(product.url);
  const titleKey = normalizeProductTitleKey(product.title);

  try {
    const parsed = new URL(canonicalUrl);
    const pathKey = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.toLowerCase()}`;
    return titleKey ? `${domain}::${titleKey}::${pathKey}` : `${domain}::${pathKey}`;
  } catch {
    return `${domain}::${titleKey || canonicalUrl.toLowerCase()}`;
  }
}

function choosePreferredValue(current?: string, incoming?: string): string | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  return incoming.length > current.length ? incoming : current;
}

function choosePreferredBadge(current?: string, incoming?: string): string | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  return (BADGE_PRIORITY[incoming] ?? 0) > (BADGE_PRIORITY[current] ?? 0) ? incoming : current;
}

function mergeProductRecords(current: ProductResult, incoming: ProductResult): ProductResult {
  const canonicalCurrentUrl = canonicalizeProductUrl(current.url);
  const canonicalIncomingUrl = canonicalizeProductUrl(incoming.url);
  const preferredUrl = canonicalIncomingUrl.length < canonicalCurrentUrl.length ? incoming.url : current.url;

  return {
    title: choosePreferredValue(current.title, incoming.title) ?? current.title,
    url: preferredUrl,
    image: current.image ?? incoming.image,
    price: current.price ?? incoming.price,
    originalPrice: current.originalPrice ?? incoming.originalPrice,
    discount: current.discount ?? incoming.discount,
    offer: current.offer ?? incoming.offer,
    availability: current.availability ?? incoming.availability,
    shipping: current.shipping ?? incoming.shipping,
    source: choosePreferredValue(current.source, incoming.source),
    badge: choosePreferredBadge(current.badge, incoming.badge),
  };
}

export function hasUsefulProductSignals(product: ProductResult): boolean {
  return Boolean(
    product.image
    || product.price
    || product.originalPrice
    || product.discount
    || product.offer
    || product.shipping
    || product.availability,
  );
}

export function filterLowValueProducts(products: ProductResult[]): ProductResult[] {
  const usefulProducts = products.filter((product) => hasUsefulProductSignals(product));
  return usefulProducts.length > 0 ? usefulProducts : products;
}

export function shouldExpandSearchFallback(products: ProductResult[], expectedItemCount = 1): boolean {
  if (products.length === 0) return true;

  const usefulCount = products.filter((product) => hasUsefulProductSignals(product)).length;
  const minimumUsefulProducts = Math.min(3, Math.max(1, expectedItemCount));
  return usefulCount < minimumUsefulProducts;
}

function normalizeItemKey(value: string): string {
  return normalizeQuery(value).toLowerCase();
}

export function buildClaudeShoppingQueryPrompt(
  items: SearchQuerySeed[],
  marketLabel: string,
  detectedBrand = "",
): string {
  const payload = items.slice(0, 6).map((item) => ({
    itemName: item.item_name,
    brand: item.brand || detectedBrand || "",
    searchQuery: item.search_query,
    color: item.color || "",
    material: item.material || "",
    style: item.style || "",
    category: item.category || "",
  }));

  return [
    "You generate fallback retail shopping search queries for SearchOutfit.",
    `Target shopping market: ${marketLabel}.`,
    "Return only JSON with this shape:",
    '{"items":[{"itemName":"Exact item name from input","queries":["query 1","query 2","query 3"]}]}',
    "Rules:",
    "- Keep the same itemName text exactly as provided in the input.",
    "- Generate up to 3 concise shopping queries per item.",
    "- Prioritize real retailer-ready product search phrases, not editorial text.",
    "- Include the brand when known.",
    "- If the local market is sparse, prefer broader commercially useful queries.",
    "- No markdown, no explanation, JSON only.",
    `Input items: ${JSON.stringify(payload)}`,
  ].join("\n");
}

function extractClaudeJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const directParsers = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) directParsers.push(fenced.trim());
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) directParsers.push(objectMatch[0]);
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) directParsers.push(arrayMatch[0]);

  for (const candidate of directParsers) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate shape.
    }
  }

  return null;
}

export function parseClaudeFallbackItemSearchPlans(
  text: string,
  items: SearchQuerySeed[],
  existingPlans: ItemSearchPlan[] = [],
  maxQueriesPerItem = 3,
): ItemSearchPlan[] {
  const parsed = extractClaudeJsonPayload(text);
  if (!parsed) return [];

  const rawPlans = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : [];

  const itemNameLookup = new Map(
    items.map((item) => [normalizeItemKey(item.item_name), item.item_name]),
  );
  const existingByItem = new Map(
    existingPlans.map((plan) => [plan.itemName, new Set(plan.queries.map((query) => query.toLowerCase()))]),
  );

  return rawPlans
    .map((candidate): ItemSearchPlan | null => {
      const value = candidate as ClaudeFallbackPlanCandidate;
      const canonicalItemName = typeof value.itemName === "string"
        ? itemNameLookup.get(normalizeItemKey(value.itemName))
        : undefined;
      if (!canonicalItemName || !Array.isArray(value.queries)) return null;

      const seen = new Set<string>();
      const existing = existingByItem.get(canonicalItemName) ?? new Set<string>();
      const queries = value.queries
        .filter((query): query is string => typeof query === "string")
        .map((query) => normalizeQuery(query))
        .filter((query) => {
          if (!query) return false;
          const key = query.toLowerCase();
          if (existing.has(key) || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, maxQueriesPerItem);

      if (queries.length === 0) return null;
      return { itemName: canonicalItemName, queries };
    })
    .filter((plan): plan is ItemSearchPlan => Boolean(plan));
}

export function buildShoppingQueries(
  items: SearchQuerySeed[],
  detectedBrand = "",
  minimumQueries = 10,
): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  const addQuery = (value: string) => {
    const normalized = normalizeQuery(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    queries.push(normalized);
  };

  for (const item of items.slice(0, 6)) {
    const itemName = normalizeQuery(item.item_name);
    const brand = normalizeQuery(item.brand || detectedBrand);
    const gender = resolveSearchGender(item);
    const searchQuery = normalizeSearchQueryGender(item.search_query, gender);
    const color = normalizeShoppingTerms(item.color || "");
    const material = normalizeShoppingTerms(item.material || "");
    const style = normalizeShoppingTerms(item.style || "");
    const baseQuery = itemName || searchQuery;

    addQuery(searchQuery);
    addQuery(itemName);
    if (color && itemName) addQuery(`${color} ${normalizeShoppingTerms(itemName)}`);
    if (material && color && itemName) addQuery(`${color} ${material} ${normalizeShoppingTerms(itemName)}`);
    if (style && color && itemName) addQuery(`${color} ${style} ${normalizeShoppingTerms(itemName)}`);

    if (brand && itemName) addQuery(`${brand} ${itemName}`);
    if (brand && color && itemName) addQuery(`${brand} ${color} ${normalizeShoppingTerms(itemName)}`);
    if (brand && searchQuery && !searchQuery.toLowerCase().includes(brand.toLowerCase())) {
      addQuery(`${brand} ${searchQuery}`);
    }

    if (baseQuery) {
      const genderQualifiedQuery = appendGenderQualifier(baseQuery, gender);
      if (genderQualifiedQuery) addQuery(genderQualifiedQuery);
      addQuery(`${baseQuery} buy online`);
      addQuery(`${baseQuery} fashion`);
    }
  }

  if (queries.length >= minimumQueries) return queries;

  for (const item of items.slice(0, 6)) {
    const itemName = normalizeQuery(item.item_name);
    const searchQuery = normalizeQuery(item.search_query);
    const baseQuery = itemName || searchQuery;
    if (!baseQuery) continue;

    addQuery(`${baseQuery} online store`);
    addQuery(`${baseQuery} clothing`);
    addQuery(`${baseQuery} outfit`);

    if (queries.length >= minimumQueries) break;
  }

  return queries;
}

export function buildItemSearchPlans(
  items: SearchQuerySeed[],
  detectedBrand = "",
  maxQueriesPerItem = 2,
): ItemSearchPlan[] {
  return items.slice(0, 6).map((item) => {
    const queries: string[] = [];
    const seen = new Set<string>();
    const itemName = normalizeQuery(item.item_name);
    const normalizedItemName = normalizeShoppingTerms(item.item_name);
    const brand = normalizeQuery(item.brand);
    const detected = normalizeQuery(detectedBrand);
    const gender = resolveSearchGender(item);
    const searchQuery = normalizeSearchQueryGender(item.search_query, gender);
    const color = normalizeShoppingTerms(item.color || "");
    const material = normalizeShoppingTerms(item.material || "");
    const style = normalizeShoppingTerms(item.style || "");
    const category = normalizeShoppingTerms(item.category || "");
    const addQuery = (value: string) => {
      const normalized = normalizeQuery(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      queries.push(normalized);
    };

    addQuery(searchQuery);
    if (color && normalizedItemName) addQuery(`${color} ${normalizedItemName} ${gender}`);
    if (material && color && normalizedItemName) addQuery(`${color} ${material} ${normalizedItemName} ${gender}`);
    if (style && color && normalizedItemName) addQuery(`${color} ${style} ${normalizedItemName} ${gender}`);
    if (brand && itemName) addQuery(`${brand} ${itemName}`);
    if (brand && color && normalizedItemName) addQuery(`${brand} ${color} ${normalizedItemName}`);
    addQuery(itemName);
    if (detected && itemName && !brand) addQuery(`${detected} ${itemName}`);
    if (category && color) addQuery(`${color} ${category} ${gender}`);
    if (itemName) addQuery(`${itemName} ${gender}`);
    if (itemName) addQuery(`${itemName} buy online`);
    if (itemName) addQuery(`${itemName} fashion`);
    if (itemName) addQuery(`${itemName} online store`);
    if (itemName) addQuery(`${itemName} clothing`);

    return {
      itemName: item.item_name,
      queries: queries.slice(0, maxQueriesPerItem),
    };
  });
}

export function buildExpandedItemSearchPlans(
  items: SearchQuerySeed[],
  detectedBrand = "",
  existingPlans: ItemSearchPlan[] = [],
  maxQueriesPerItem = 6,
): ItemSearchPlan[] {
  const existingByItem = new Map(
    existingPlans.map((plan) => [plan.itemName, new Set(plan.queries.map((query) => query.toLowerCase()))]),
  );

  return buildItemSearchPlans(items, detectedBrand, maxQueriesPerItem)
    .map((plan) => {
      const existing = existingByItem.get(plan.itemName) ?? new Set<string>();
      const queries = plan.queries.filter((query) => !existing.has(query.toLowerCase()));
      return {
        itemName: plan.itemName,
        queries,
      };
    })
    .filter((plan) => plan.queries.length > 0);
}

export function collectOfficialDomainResults(data: any, brandDomain: string): ProductResult[] {
  const normalizedDomain = brandDomain.replace(/^www\./, "").toLowerCase();
  if (!normalizedDomain) return [];

  const products: ProductResult[] = [];

  for (const result of (data.organic_results || [])) {
    if (products.length >= 12) break;
    const title = result.title || "";
    const url = result.link || "";
    if (!title || !url) continue;

    const domain = getDomain(url);
    if (!matchesAllowedHost(domain, normalizedDomain)) continue;
    if (products.some((product) => product.url === url)) continue;

    products.push({
      title,
      url,
      image: result.thumbnail || result.rich_snippet?.top?.detected_extensions?.thumbnail || undefined,
      source: domain || undefined,
      badge: "Official Store",
    });
  }

  return products;
}

export function collectOrganicProductResults(data: any): ProductResult[] {
  const products: ProductResult[] = [];

  for (const result of (data.organic_results || [])) {
    if (products.length >= 12) break;

    const title = normalizeValue(result.title);
    const url = normalizeValue(result.link);
    if (!title || !url) continue;
    if (getDomain(url).includes("google.com")) continue;
    if (!isRetailDomain(url)) continue;
    if (!isFashionProduct(title)) continue;
    if (!isLikelyProductUrl(url)) continue;
    if (products.some((product) => product.url === url)) continue;

    products.push({
      title,
      url,
      image: normalizeValue(result.thumbnail),
      source: normalizeValue(result.source) ?? (getDomain(url) || undefined),
    });
  }

  return products;
}

export function mergeRankedProducts(
  groups: ProductResult[][],
  market: SearchMarket,
  officialBrandDomain = "",
  resultLimit = 24,
): ProductResult[] {
  const normalizedOfficialDomain = officialBrandDomain.replace(/^www\./, "").toLowerCase();
  const mergedProducts = new Map<string, ProductResult>();
  const officialProducts: ProductResult[] = [];
  const preferredProducts: ProductResult[] = [];
  const neutralProducts: ProductResult[] = [];
  const deprioritizedProducts: ProductResult[] = [];
  const indirectGoogleProducts: ProductResult[] = [];
  const deprioritizedCounts: Record<string, number> = {};

  for (const group of groups) {
    for (const product of group) {
      if (!product?.url) continue;
      const identityKey = buildProductIdentityKey(product);
      const existing = mergedProducts.get(identityKey);
      mergedProducts.set(identityKey, existing ? mergeProductRecords(existing, product) : product);
    }
  }

  for (const product of mergedProducts.values()) {
      if (!product?.url) continue;

      const domain = getDomain(product.url);
      const marketBucket = getMarketDomainBucket(product.url, market, normalizedOfficialDomain);
      if (marketBucket === "suppressed") continue;

      const isOfficialStore = normalizedOfficialDomain
        ? matchesAllowedHost(domain, normalizedOfficialDomain)
        : product.badge === "Official Store";

      if (isOfficialStore) {
        officialProducts.push(product);
        continue;
      }

      if (marketBucket === "preferred") {
        preferredProducts.push(product);
        continue;
      }

      if (isGoogleShoppingProductLink(product.url)) {
        indirectGoogleProducts.push(product);
        continue;
      }

      const deprioritizedDomain = DEPRIORITIZED_DOMAINS.find((allowed) => matchesAllowedHost(domain, allowed));
      if (deprioritizedDomain) {
        deprioritizedCounts[deprioritizedDomain] = (deprioritizedCounts[deprioritizedDomain] || 0) + 1;
        if (deprioritizedCounts[deprioritizedDomain] <= 3) {
          deprioritizedProducts.push(product);
        }
        continue;
      }

      neutralProducts.push(product);
  }

  return [
    ...officialProducts,
    ...preferredProducts,
    ...neutralProducts,
    ...deprioritizedProducts,
    ...indirectGoogleProducts,
  ].slice(0, resultLimit);
}

export function mergeItemResultGroups(
  groups: ItemResultGroup[],
  market: SearchMarket,
  officialBrandDomain = "",
  resultLimit = 12,
): Record<string, ProductResult[]> {
  const groupedResults = new Map<string, ProductResult[][]>();

  for (const group of groups) {
    const existing = groupedResults.get(group.itemName) ?? [];
    existing.push(group.products);
    groupedResults.set(group.itemName, existing);
  }

  return Object.fromEntries(
    Array.from(groupedResults.entries()).map(([itemName, productGroups]) => [
      itemName,
      mergeRankedProducts(productGroups, market, officialBrandDomain, resultLimit),
    ]),
  );
}

export function collectLensProducts(data: any): ProductResult[] {
  const products: ProductResult[] = [];

  for (const r of (data.shopping_results || [])) {
    if (products.length >= 20) break;
    const title = r.title || "", url = r.link || "";
    if (!title || !url || url.includes("google.com/search") || url.includes("google.com/aclk")) continue;
    if (!isFashionProduct(title)) continue;
    if (!isRetailDomain(url)) continue;
    const product = toShoppingProduct(r);
    if (!product) continue;
    products.push(product);
  }

  for (const m of (data.visual_matches || [])) {
    if (products.length >= 32) break;
    const title = m.title || "", url = m.link || "";
    if (!title || !url) continue;
    if (!isRetailDomain(url)) continue;
    if (!isFashionProduct(title)) continue;
    if (products.some((p) => p.url === url)) continue;

    const source = m.source || getDomain(url);
    products.push({
      title, url,
      image: m.thumbnail || undefined,
      price: m.price?.value || (m.price?.extracted_value ? `$${m.price.extracted_value}` : undefined),
      source: source || undefined,
    });
  }

  return products;
}
