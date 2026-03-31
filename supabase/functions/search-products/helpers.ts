import type { SearchMarket } from "./market.ts";

export interface ProductResult {
  title: string;
  url: string;
  image?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  offer?: string;
  availability?: string;
  shipping?: string;
  source?: string;
  badge?: string;
}

export interface SearchQuerySeed {
  item_name: string;
  brand: string;
  search_query: string;
  color?: string;
  material?: string;
  style?: string;
  category?: string;
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

export function isFashionProduct(title: string): boolean {
  const lower = title.toLowerCase();
  return FASHION_KEYWORDS.some((kw) => lower.includes(kw));
}

function isGoogleShoppingProductLink(url: string): boolean {
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
    .filter((product) => !product.image && product.url && isRetailDomain(product.url) && isLikelyProductUrl(product.url))
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
  };
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
    const searchQuery = normalizeQuery(item.search_query);
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
      addQuery(`${baseQuery} women`);
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
    const searchQuery = normalizeQuery(item.search_query);
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
    if (color && normalizedItemName) addQuery(`${color} ${normalizedItemName}`);
    if (material && color && normalizedItemName) addQuery(`${color} ${material} ${normalizedItemName}`);
    if (style && color && normalizedItemName) addQuery(`${color} ${style} ${normalizedItemName}`);
    if (brand && itemName) addQuery(`${brand} ${itemName}`);
    if (brand && color && normalizedItemName) addQuery(`${brand} ${color} ${normalizedItemName}`);
    addQuery(itemName);
    if (detected && itemName && !brand) addQuery(`${detected} ${itemName}`);
    if (category && color) addQuery(`${color} ${category} women`);
    if (itemName) addQuery(`${itemName} women`);
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
