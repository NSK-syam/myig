import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildAppCorsHeaders,
  createSignedImageProxyToken,
  getRequestOrigin,
} from "../_shared/app-access.ts";
import {
  enforceRateLimit,
  getAppTokenSecret,
  getSupabaseAdmin,
  requireAppToken,
  rateLimitHeaders,
} from "../_shared/security.ts";
import {
  buildClaudeShoppingQueryPrompt,
  buildExpandedItemSearchPlans,
  buildItemSearchPlans,
  collectLensProducts,
  collectOrganicProductResults,
  collectOfficialDomainResults,
  enrichProductsWithMerchantPageImages,
  filterLowValueProducts,
  getDomain,
  isGoogleShoppingProductLink,
  ItemSearchPlan,
  mergeItemResultGroups,
  mergeRankedProducts,
  parseClaudeFallbackItemSearchPlans,
  ProductResult,
  resolveGoogleShoppingFallbackProducts,
  shouldExpandSearchFallback,
  toShoppingProduct,
} from "./helpers.ts";
import { resolveFallbackSearchMarket, resolveSearchMarket, type SearchMarket } from "./market.ts";

interface BrandedItem {
  item_name: string;
  brand: string;
  search_query: string;
  color?: string;
  material?: string;
  style?: string;
  category?: string;
  gender?: string;
}

interface SearchFetchResult {
  products: ProductResult[];
  error?: string;
}

interface ItemSearchFetchResult extends SearchFetchResult {
  itemName: string;
}

type ClaudeResponse = {
  content?: Array<
    | { type: "text"; text: string }
    | { type: string; [key: string]: unknown }
  >;
};

const ENABLE_AUTOMATIC_MARKET_FALLBACK = false;
const SEARCH_RATE_LIMIT = 8;

function isGoogleHostedCommerceImage(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();

    const isGoogleImageHost =
      domain.endsWith("gstatic.com")
      || domain.endsWith("googleusercontent.com")
      || domain.endsWith("ggpht.com");

    return isGoogleImageHost
      && (parsed.pathname.toLowerCase().includes("/shopping") || parsed.searchParams.has("q"));
  } catch {
    return false;
  }
}

function sanitizeSearchTerm(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeBrandDomain(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .toLowerCase();
}

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

function buildOfficialQueries(brandedItems: BrandedItem[], detectedBrand: string, brandDirectUrl: string): string[] {
  const queries = new Set<string>();

  for (const item of brandedItems.slice(0, 8)) {
    if (item.search_query) queries.add(item.search_query);
    if (item.brand && item.item_name) queries.add(`${item.brand} ${item.item_name}`);
  }

  if (detectedBrand && brandedItems.length > 0) {
    queries.add(`${detectedBrand} ${brandedItems[0].item_name}`);
  }

  if (brandDirectUrl) {
    try {
      const parsed = new URL(brandDirectUrl);
      const directQuery = parsed.searchParams.get("q");
      if (directQuery) queries.add(decodeURIComponent(directQuery));
    } catch {
      // Ignore malformed brand direct URLs and continue with other search terms.
    }
  }

  return Array.from(queries).slice(0, 2);
}

// Google Lens visual search — returns visually similar products
async function googleLensProducts(imageUrl: string, apiKey: string, market: SearchMarket): Promise<SearchFetchResult> {
  console.log(`Google Lens search: ${imageUrl.substring(0, 100)}...`);

  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    search_type: "products",
    country: market.country,
    hl: market.hl,
    api_key: apiKey,
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Lens error [${response.status}]:`, errorText);
    return { products: [], error: `Google Lens returned ${response.status}: ${errorText.slice(0, 200)}` };
  }

  const data = await response.json();
  console.log(`Lens: ${(data.shopping_results || []).length} shopping, ${(data.visual_matches || []).length} visual`);
  const products = collectLensProducts(data);
  return { products };
}

async function officialDomainSearch(
  query: string,
  brandDomain: string,
  apiKey: string,
  market: SearchMarket,
): Promise<SearchFetchResult> {
  console.log(`Official domain search: site:${brandDomain} "${query}"`);

  const params = new URLSearchParams({
    engine: "google",
    q: `site:${brandDomain} ${query}`,
    api_key: apiKey,
    num: "10",
    gl: market.gl,
    hl: market.hl,
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Official domain search error [${response.status}] for "${query}":`, errorText);
    return { products: [], error: `Official domain search returned ${response.status} for "${query}": ${errorText.slice(0, 200)}` };
  }

  const data = await response.json();
  return { products: collectOfficialDomainResults(data, brandDomain) };
}

async function googleOrganicSearch(query: string, apiKey: string, market: SearchMarket): Promise<SearchFetchResult> {
  console.log(`Google organic fallback: "${query}"`);

  const params = new URLSearchParams({
    engine: "google",
    q: `${query} buy`,
    api_key: apiKey,
    num: "10",
    gl: market.gl,
    hl: market.hl,
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google organic error [${response.status}] for "${query}":`, errorText);
    return { products: [], error: `Google organic returned ${response.status} for "${query}": ${errorText.slice(0, 200)}` };
  }

  const data = await response.json();
  return { products: collectOrganicProductResults(data) };
}

// Google Shopping search — real store results with fresh URLs and prices
async function googleShoppingSearch(query: string, apiKey: string, market: SearchMarket): Promise<SearchFetchResult> {
  console.log(`Google Shopping: "${query}"`);

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey,
    num: "16",
    gl: market.gl,
    hl: market.hl,
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Shopping error [${response.status}] for "${query}":`, errorText);
    return { products: [], error: `Google Shopping returned ${response.status} for "${query}": ${errorText.slice(0, 200)}` };
  }

  const data = await response.json();
  const products: ProductResult[] = [];

  for (const r of (data.shopping_results || [])) {
    if (products.length >= 10) break;
    const product = toShoppingProduct(r);
    if (!product) continue;
    products.push(product);
  }

  return { products };
}

// Branded search — targets specific brand + item
async function brandedSearch(query: string, apiKey: string, market: SearchMarket): Promise<SearchFetchResult> {
  console.log(`Branded search: "${query}"`);

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query + " buy",
    api_key: apiKey,
    num: "10",
    gl: market.gl,
    hl: market.hl,
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Branded search error [${response.status}] for "${query}":`, errorText);
    return { products: [], error: `Brand search returned ${response.status} for "${query}": ${errorText.slice(0, 200)}` };
  }

  const data = await response.json();
  const products: ProductResult[] = [];

  for (const r of (data.shopping_results || [])) {
    if (products.length >= 6) break;
    const product = toShoppingProduct(r, "Brand match");
    if (!product) continue;
    products.push(product);
  }

  return { products };
}

interface MarketSearchResult {
  upstreamErrors: string[];
  officialResults: SearchFetchResult[];
  brandResults: SearchFetchResult[];
  lensProducts: ProductResult[];
  itemResults: Record<string, ProductResult[]>;
  allProducts: ProductResult[];
}

async function runSearchesForMarket(
  imageUrl: string,
  brandedItemsList: BrandedItem[],
  officialQueries: string[],
  apiKey: string,
  market: SearchMarket,
  normalizedBrandDomain: string,
  normalizedDetectedBrand: string,
): Promise<MarketSearchResult> {
  const officialSearches = officialQueries
    .map((query) => officialDomainSearch(query, normalizedBrandDomain, apiKey, market));

  const brandSearches = brandedItemsList
    .filter((b) => b.brand && b.brand.length > 0)
    .slice(0, 2)
    .map((b) => brandedSearch(`${b.brand} ${b.search_query}`, apiKey, market));

  const queriesPerItem = brandedItemsList.length <= 1
    ? 2
    : brandedItemsList.length <= 2
      ? 2
      : 1;
  const itemSearchPlans = buildItemSearchPlans(brandedItemsList, normalizedDetectedBrand, queriesPerItem);

  const itemShoppingSearches = itemSearchPlans.flatMap((plan) =>
    plan.queries.map((query) =>
      googleShoppingSearch(query, apiKey, market).then((result): ItemSearchFetchResult => ({
        ...result,
        itemName: plan.itemName,
      }))
    )
  );

  const [lensResult, ...otherResults] = await Promise.all([
    googleLensProducts(imageUrl, apiKey, market),
    ...officialSearches,
    ...brandSearches,
    ...itemShoppingSearches,
  ]);

  const officialResults = otherResults.slice(0, officialSearches.length);
  const brandResults = otherResults.slice(officialSearches.length, officialSearches.length + brandSearches.length);
  const shoppingResults = otherResults.slice(
    officialSearches.length + brandSearches.length,
  ) as ItemSearchFetchResult[];

  const upstreamErrors = [
    lensResult.error,
    ...officialResults.map((result) => result.error),
    ...brandResults.map((result) => result.error),
    ...shoppingResults.map((result) => result.error),
  ].filter((error): error is string => Boolean(error));

  let itemResultPayloads = shoppingResults
    .filter((result) => result.products.length > 0)
    .map((result) => ({
      itemName: result.itemName,
      products: result.products,
    }));

  let itemResults = mergeItemResultGroups(
    itemResultPayloads,
    market,
    normalizedBrandDomain,
    12,
  );

  let allProducts = mergeRankedProducts(
    [
      ...officialResults.map((group) => group.products),
      ...brandResults.map((group) => group.products),
      ...Object.values(itemResults),
      lensResult.products,
    ],
    market,
    normalizedBrandDomain,
    market.resultLimit,
  );

  if (allProducts.length === 0 && upstreamErrors.length === 0 && brandedItemsList.length > 0) {
      const expandedItemSearchPlans = buildExpandedItemSearchPlans(
        brandedItemsList,
        normalizedDetectedBrand,
        itemSearchPlans,
        3,
      );

    if (expandedItemSearchPlans.length > 0) {
      const expandedShoppingResults = await Promise.all(
        expandedItemSearchPlans.flatMap((plan) =>
          plan.queries.map((query) =>
            googleShoppingSearch(query, apiKey, market).then((result): ItemSearchFetchResult => ({
              ...result,
              itemName: plan.itemName,
            }))
          )
        ),
      );

      upstreamErrors.push(
        ...expandedShoppingResults.map((result) => result.error).filter((error): error is string => Boolean(error)),
      );

      itemResultPayloads = [
        ...itemResultPayloads,
        ...expandedShoppingResults
          .filter((result) => result.products.length > 0)
          .map((result) => ({
            itemName: result.itemName,
            products: result.products,
          })),
      ];

      itemResults = mergeItemResultGroups(
        itemResultPayloads,
        market,
        normalizedBrandDomain,
        12,
      );

      allProducts = mergeRankedProducts(
        [
          ...officialResults.map((group) => group.products),
          ...brandResults.map((group) => group.products),
          ...Object.values(itemResults),
          lensResult.products,
        ],
        market,
        normalizedBrandDomain,
        market.resultLimit,
      );
    }
  }

  const itemGroupsNeedingResolution = Object.entries(itemResults).filter(([, products]) => {
    const directMerchantCount = products.filter((product) => !isGoogleShoppingProductLink(product.url)).length;
    const googleFallbackCount = products.filter((product) => isGoogleShoppingProductLink(product.url)).length;
    return googleFallbackCount > 0 && directMerchantCount < 2;
  });

  if (itemGroupsNeedingResolution.length > 0) {
    const resolvedEntries = await Promise.all(
      itemGroupsNeedingResolution.map(async ([itemName, products]) => {
        const resolvedProducts = await resolveGoogleShoppingFallbackProducts(
          products,
          apiKey,
          market,
          fetch,
          3,
        );

        return [itemName, resolvedProducts] as const;
      }),
    );

    itemResults = {
      ...itemResults,
      ...Object.fromEntries(resolvedEntries),
    };

    allProducts = mergeRankedProducts(
      [
        ...officialResults.map((group) => group.products),
        ...brandResults.map((group) => group.products),
        ...Object.values(itemResults),
        lensResult.products,
      ],
      market,
      normalizedBrandDomain,
      market.resultLimit,
    );
  }

  return {
    upstreamErrors,
    officialResults,
    brandResults,
    lensProducts: lensResult.products,
    itemResults,
    allProducts,
  };
}

async function buildAiFallbackSearchPlans(
  brandedItemsList: BrandedItem[],
  market: SearchMarket,
  normalizedDetectedBrand: string,
): Promise<ItemSearchPlan[]> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY || brandedItemsList.length === 0) {
    return [];
  }

  const existingPlans = buildItemSearchPlans(brandedItemsList, normalizedDetectedBrand, 6);
  const prompt = buildClaudeShoppingQueryPrompt(brandedItemsList, market.label, normalizedDetectedBrand);

  const response = await callAnthropicWithRetry({
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: "You create concise shopping search fallback queries for product discovery. Output JSON only.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude fallback query generation error:", response.status, errorText);
    return [];
  }

  const claudeResponse = await response.json() as ClaudeResponse;
  const textContent = claudeResponse.content?.find(
    (content): content is { type: "text"; text: string } => content.type === "text",
  )?.text;

  if (!textContent) {
    return [];
  }

  return parseClaudeFallbackItemSearchPlans(
    textContent,
    brandedItemsList,
    existingPlans,
    3,
  );
}

async function attachSignedProxyImageUrls(
  products: ProductResult[],
  origin: string | null,
): Promise<ProductResult[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || products.length === 0) {
    return products;
  }

  const secret = getAppTokenSecret();
  const issuedAt = new Date();

  return await Promise.all(
    products.map(async (product) => {
      if (!product.image || product.proxyImageUrl) {
        return product;
      }

      const token = await createSignedImageProxyToken({
        secret,
        imageUrl: product.image,
        merchantUrl: product.url,
        ttlSeconds: 60 * 60,
        now: issuedAt,
        origin,
      });

      return {
        ...product,
        proxyImageUrl: `${supabaseUrl}/functions/v1/proxy-product-image?token=${encodeURIComponent(token)}`,
      };
    }),
  );
}

serve(async (req) => {
  const origin = getRequestOrigin(req);
  const corsHeaders = buildAppCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tokenCheck = await requireAppToken(req, "search-products");
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
      action: "search-products",
      limit: SEARCH_RATE_LIMIT,
      windowSeconds: 600,
    });

    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many product-search requests. Please wait and try again." }),
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

    const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
    if (!SERPAPI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SERPAPI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl, brandedItems, market, detectedBrand, brandDomain, brandDirectUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Provide an imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const searchMarket = resolveSearchMarket(market);
    const normalizedBrandDomain = normalizeBrandDomain(brandDomain);
    const normalizedDetectedBrand = sanitizeSearchTerm(detectedBrand, 80);
    const normalizedBrandDirectUrl = sanitizeSearchTerm(brandDirectUrl, 300);

    const brandedItemsList: BrandedItem[] = Array.isArray(brandedItems)
      ? brandedItems.slice(0, 10).map((item) => ({
          item_name: sanitizeSearchTerm(item?.item_name, 80),
          brand: sanitizeSearchTerm(item?.brand, 80),
          search_query: sanitizeSearchTerm(item?.search_query, 180),
          color: sanitizeSearchTerm(item?.color, 40),
          material: sanitizeSearchTerm(item?.material, 60),
          style: sanitizeSearchTerm(item?.style, 60),
          category: sanitizeSearchTerm(item?.category, 40),
          gender: sanitizeSearchTerm(item?.gender, 20),
      })).filter((item) => item.search_query.length > 0)
      : [];

    const officialQueries = normalizedBrandDomain
      ? buildOfficialQueries(brandedItemsList, normalizedDetectedBrand, normalizedBrandDirectUrl)
      : [];

    let effectiveMarket = searchMarket;
    let marketSearch = await runSearchesForMarket(
      imageUrl,
      brandedItemsList,
      officialQueries,
      SERPAPI_API_KEY,
      searchMarket,
      normalizedBrandDomain,
      normalizedDetectedBrand,
    );

    let warning: string | undefined;
    if (
      ENABLE_AUTOMATIC_MARKET_FALLBACK
      && shouldExpandSearchFallback(marketSearch.allProducts, brandedItemsList.length)
      && marketSearch.upstreamErrors.length === 0
    ) {
      const fallbackMarket = resolveFallbackSearchMarket(searchMarket);
      if (fallbackMarket) {
        const fallbackSearch = await runSearchesForMarket(
          imageUrl,
          brandedItemsList,
          officialQueries,
          SERPAPI_API_KEY,
          fallbackMarket,
          normalizedBrandDomain,
          normalizedDetectedBrand,
        );

        if (!shouldExpandSearchFallback(fallbackSearch.allProducts, brandedItemsList.length)) {
          effectiveMarket = fallbackMarket;
          marketSearch = fallbackSearch;
          warning = `No strong matches were found for ${searchMarket.label}. Showing broader ${fallbackMarket.label} results instead.`;
        } else if (fallbackSearch.upstreamErrors.length > 0) {
          marketSearch = {
            ...marketSearch,
            upstreamErrors: [...marketSearch.upstreamErrors, ...fallbackSearch.upstreamErrors],
          };
        }
      }
    }

    if (shouldExpandSearchFallback(marketSearch.allProducts, brandedItemsList.length) && marketSearch.upstreamErrors.length === 0 && brandedItemsList.length > 0) {
      try {
        const aiPlans = await buildAiFallbackSearchPlans(
          brandedItemsList,
          effectiveMarket,
          normalizedDetectedBrand,
        );

        if (aiPlans.length > 0) {
          const aiSearchResults = await Promise.all(
            aiPlans.flatMap((plan) =>
              plan.queries.flatMap((query) => [
                googleShoppingSearch(query, SERPAPI_API_KEY, effectiveMarket).then((result): ItemSearchFetchResult => ({
                  ...result,
                  itemName: plan.itemName,
                })),
              ])
            ),
          );

          const aiErrors = aiSearchResults
            .map((result) => result.error)
            .filter((error): error is string => Boolean(error));
          marketSearch.upstreamErrors.push(...aiErrors);

          const aiPayloads = aiSearchResults
            .filter((result) => result.products.length > 0)
            .map((result) => ({
              itemName: result.itemName,
              products: result.products,
            }));

          if (aiPayloads.length > 0) {
            const mergedItemResults = mergeItemResultGroups(
              [
                ...Object.entries(marketSearch.itemResults).map(([itemName, products]) => ({
                  itemName,
                  products,
                })),
                ...aiPayloads,
              ],
              effectiveMarket,
              normalizedBrandDomain,
              12,
            );

            const aiAllProducts = mergeRankedProducts(
              [
                ...marketSearch.officialResults.map((group) => group.products),
                ...marketSearch.brandResults.map((group) => group.products),
                ...Object.values(mergedItemResults),
                marketSearch.lensProducts,
              ],
              effectiveMarket,
              normalizedBrandDomain,
              effectiveMarket.resultLimit,
            );

            if (!shouldExpandSearchFallback(aiAllProducts, brandedItemsList.length)) {
              marketSearch = {
                ...marketSearch,
                itemResults: mergedItemResults,
                allProducts: aiAllProducts,
              };

              warning = effectiveMarket.code === searchMarket.code
                ? `Showing AI-assisted search results for ${effectiveMarket.label}.`
                : `No strong matches were found for ${searchMarket.label}. Showing broader AI-assisted ${effectiveMarket.label} results instead.`;
            }
          }
        }
      } catch (error) {
        console.error("AI-assisted query expansion failed:", error);
      }
    }

    let { upstreamErrors, itemResults, allProducts } = marketSearch;

    if (allProducts.length > 0) {
      allProducts = filterLowValueProducts(
        await enrichProductsWithMerchantPageImages(allProducts),
      );
      allProducts = await attachSignedProxyImageUrls(allProducts, origin);

      const productsByUrl = new Map(
        allProducts.map((product) => [product.url, product] as const),
      );

      itemResults = Object.fromEntries(
        Object.entries(itemResults).map(([itemName, products]) => [
          itemName,
          filterLowValueProducts(products.map((product) => productsByUrl.get(product.url) ?? product)),
        ]).filter(([, products]) => products.length > 0),
      );
    }

    const searchUnavailable = allProducts.length === 0 && upstreamErrors.length > 0;

    console.log(
      `Total: ${allProducts.length} products (${allProducts.filter(p => p.badge).length} brand, ${allProducts.filter(p => !p.badge).length} other) using market ${effectiveMarket.code}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        products: allProducts,
        itemResults,
        searchUnavailable,
        warning: warning ?? (searchUnavailable
          ? "Live product matching is temporarily unavailable. Try again shortly."
          : undefined),
        upstreamErrors: upstreamErrors.length > 0 ? upstreamErrors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-products:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
