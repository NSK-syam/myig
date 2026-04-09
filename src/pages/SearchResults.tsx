import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Search, Eye, ShoppingBag, Heart } from "lucide-react";
import { useSavedProducts } from "@/hooks/use-saved-products";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import CountrySelect from "@/components/CountrySelect";
import { fireAndForgetAnalyticsEvent } from "@/lib/analytics";
import type { OutfitAnalysis, OutfitItem, ProductResult, ProductSearchResults } from "@/lib/outfitApi";
import { searchProductsByImage } from "@/lib/outfitApi";
import { getPreferredMarket, normalizeMarket, persistPreferredMarket, type SearchMarketCode } from "@/lib/market";
import { buildProductImageUrl } from "@/lib/productImages";
import type { SavedProduct } from "@/lib/savedProducts";
import Navbar from "@/components/Navbar";

const transition = { duration: 0.4, ease: [0.2, 0, 0, 1] as const };
type DecoratedProduct = ProductResult & { _badge?: string };
type DecoratedProductGroups = Record<string, DecoratedProduct[]>;
type CachedItemSearchResult = {
  products: DecoratedProduct[];
  warning: string | null;
  searchUnavailable: boolean;
  error: string | null;
};

const confidenceColor = (c: string) => {
  if (c === "high") return "text-green-700 bg-green-50";
  if (c === "medium") return "text-amber-700 bg-amber-50";
  return "text-muted-foreground bg-warm-100";
};

const AUTHORIZED_RETAILERS = [
  "lyst.com", "farfetch.com", "ssense.com", "net-a-porter.com",
  "mytheresa.com", "nordstrom.com", "neiman marcus", "neimanmarcus.com",
  "bergdorfgoodman.com", "saks.com", "saksfifthavenue.com",
  "matchesfashion.com", "brownsfashion.com",
];

const RESALE_PLATFORMS = [
  "vestiairecollective.com", "therealreal.com", "depop.com",
  "poshmark.com", "grailed.com", "rebag.com",
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "").toLowerCase();
  } catch {
    return "";
  }
}

function matchesAllowedHost(domain: string, allowed: string): boolean {
  return domain === allowed || domain.endsWith(`.${allowed}`);
}

function isGoogleShoppingResultUrl(url?: string): boolean {
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

function filterDirectMerchantProducts<T extends { url: string }>(products: T[]): T[] {
  return products.filter((product) => !isGoogleShoppingResultUrl(product.url));
}

function sortProducts(products: ProductResult[], brandDomain?: string): DecoratedProduct[] {
  const normalized = brandDomain?.replace("www.", "").toLowerCase() || "";

  const official: DecoratedProduct[] = [];
  const authorized: DecoratedProduct[] = [];
  const resale: DecoratedProduct[] = [];
  const rest: DecoratedProduct[] = [];

  for (const p of products) {
    const domain = getDomain(p.url);
    if (normalized && matchesAllowedHost(domain, normalized)) {
      official.push({ ...p, _badge: "Official Store" });
    } else if (AUTHORIZED_RETAILERS.some((allowed) => matchesAllowedHost(domain, allowed))) {
      authorized.push({ ...p, _badge: "Authorized Retailer" });
    } else if (RESALE_PLATFORMS.some((allowed) => matchesAllowedHost(domain, allowed))) {
      resale.push({ ...p, _badge: "Resale" });
    } else {
      rest.push(p);
    }
  }

  return [...official, ...authorized, ...resale, ...rest];
}

const ITEM_MATCH_STOPWORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "women", "womens", "men", "mens", "buy",
  "online", "fashion", "clothing", "outfit", "store", "shop", "look", "style",
]);

const COLOR_ALIASES: Record<string, string[]> = {
  black: ["black", "jet", "charcoal"],
  blue: ["blue", "navy", "cobalt", "indigo"],
  brown: ["brown", "tan", "mocha", "chocolate"],
  burgundy: ["burgundy", "maroon", "wine", "oxblood", "bordeaux", "garnet", "cranberry"],
  camel: ["camel", "tan", "beige"],
  cream: ["cream", "ivory", "ecru", "off white"],
  green: ["green", "emerald", "olive", "sage", "khaki"],
  grey: ["grey", "gray", "charcoal", "slate"],
  orange: ["orange", "rust", "terracotta", "burnt orange"],
  pink: ["pink", "rose", "blush", "fuchsia"],
  purple: ["purple", "violet", "plum", "lavender"],
  red: ["red", "crimson", "scarlet", "ruby", "cherry", "brick"],
  white: ["white", "ivory", "cream", "off white"],
  yellow: ["yellow", "mustard", "gold"],
};

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function inferColorTokens(color: string): string[] {
  const normalized = normalizeMatchText(color);
  if (!normalized) return [];

  const matchedAliases = Object.entries(COLOR_ALIASES)
    .filter(([key, values]) => normalized.includes(key) || values.some((value) => normalized.includes(value)))
    .flatMap(([, values]) => values);

  const directTokens = normalized.split(" ").filter((token) => token.length >= 3);
  return Array.from(new Set([...matchedAliases, ...directTokens]));
}

function inferColorFamilies(value: string): string[] {
  const normalized = normalizeMatchText(value);
  if (!normalized) return [];

  return Object.entries(COLOR_ALIASES)
    .filter(([key, values]) => normalized.includes(key) || values.some((token) => normalized.includes(token)))
    .map(([key]) => key);
}

function productMatchesTargetColor(product: DecoratedProduct, item: OutfitItem): boolean {
  const targetFamilies = inferColorFamilies(item.color);
  if (targetFamilies.length === 0) return true;

  const productFamilies = inferColorFamilies(`${product.title} ${product.source ?? ""}`);
  if (productFamilies.length === 0) return true;

  return productFamilies.some((family) => targetFamilies.includes(family));
}

function tokenizeItem(item: OutfitItem): string[] {
  return Array.from(
    new Set(
      normalizeMatchText(
        `${item.name} ${item.brand} ${item.brand_guess} ${item.search_query} ${item.color} ${item.material} ${item.style}`,
      )
        .split(" ")
        .filter((token) => token.length >= 3 && !ITEM_MATCH_STOPWORDS.has(token)),
    ),
  );
}

function scoreProductForItem(product: DecoratedProduct, item: OutfitItem): number {
  const haystack = normalizeMatchText(`${product.title} ${product.source ?? ""}`);
  const title = normalizeMatchText(product.title);
  let score = 0;

  const normalizedName = normalizeMatchText(item.name);
  if (normalizedName && title.includes(normalizedName)) score += 14;
  if (item.brand && haystack.includes(normalizeMatchText(item.brand))) score += 8;
  if (item.brand_guess && haystack.includes(normalizeMatchText(item.brand_guess))) score += 5;
  if (item.category && haystack.includes(normalizeMatchText(item.category.replace(/s$/, "")))) score += 2;

  const colorTokens = inferColorTokens(item.color);
  if (colorTokens.length > 0 && colorTokens.some((token) => haystack.includes(token))) {
    score += 10;
  }
  if (colorTokens.length > 0 && !productMatchesTargetColor(product, item)) {
    score -= 18;
  }

  if (item.material && haystack.includes(normalizeMatchText(item.material))) score += 3;
  if (item.style && haystack.includes(normalizeMatchText(item.style))) score += 2;
  if (isGoogleShoppingResultUrl(product.url)) score -= 6;

  for (const token of tokenizeItem(item)) {
    if (haystack.includes(token)) {
      score += token.length >= 6 ? 2 : 1;
    }
  }

  return score;
}

function buildVisualPreviewProducts(products: DecoratedProduct[], item: OutfitItem): DecoratedProduct[] {
  const imageBearing = products.filter((product) => Boolean(product.image));
  if (imageBearing.length === 0) return [];

  const targetFamilies = inferColorFamilies(item.color);
  if (targetFamilies.length === 0) {
    return [...imageBearing].sort(
      (left, right) => scoreProductForItem(right, item) - scoreProductForItem(left, item),
    );
  }

  const explicitColorMatches = imageBearing.filter((product) => {
    const productFamilies = inferColorFamilies(`${product.title} ${product.source ?? ""}`);
    return productFamilies.some((family) => targetFamilies.includes(family));
  });

  if (explicitColorMatches.length > 0) {
    return [...explicitColorMatches].sort(
      (left, right) => scoreProductForItem(right, item) - scoreProductForItem(left, item),
    );
  }

  const textOnlyColorMatchesExist = products.some((product) => {
    const productFamilies = inferColorFamilies(`${product.title} ${product.source ?? ""}`);
    return productFamilies.some((family) => targetFamilies.includes(family));
  });

  if (textOnlyColorMatchesExist) {
    return [];
  }

  return [...imageBearing].sort(
    (left, right) => scoreProductForItem(right, item) - scoreProductForItem(left, item),
  );
}

function buildItemProductGroups(
  items: OutfitItem[],
  products: DecoratedProduct[],
  itemResults: DecoratedProductGroups,
): DecoratedProductGroups {
  const groups: DecoratedProductGroups = {};

  for (const item of items) {
    const explicit = itemResults[item.name];
    if (explicit && explicit.length > 0) {
      groups[item.name] = [...explicit].sort(
        (left, right) => scoreProductForItem(right, item) - scoreProductForItem(left, item),
      );
      continue;
    }

    const matched = products
      .map((product) => ({ product, score: scoreProductForItem(product, item) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);

    groups[item.name] = matched;
  }

  return groups;
}

function buildItemSummary(item: OutfitItem): string {
  const parts = [item.color, item.material, item.style, item.name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!parts) return "Use the comparison panel below to compare prices, shipping, and offers across stores.";

  const brandText = item.brand || item.brand_guess;
  return `${brandText ? `${brandText} ` : ""}${parts} matched across stores so you can compare pricing, delivery, and deal quality before you click out.`;
}

function hasComparisonSignals(product: DecoratedProduct): boolean {
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

function buildComparisonKey(product: DecoratedProduct): string {
  return `${getDomain(product.url)}::${normalizeMatchText(product.title)}`;
}

function comparisonSignalScore(product: DecoratedProduct): number {
  let score = 0;
  if (product.image) score += 4;
  if (product.price) score += 3;
  if (product.originalPrice) score += 1;
  if (product.discount || product.offer) score += 2;
  if (product.shipping) score += 1;
  if (product.availability) score += 1;
  return score;
}

function pickRicherComparisonProduct(current: DecoratedProduct, incoming: DecoratedProduct): DecoratedProduct {
  return comparisonSignalScore(incoming) > comparisonSignalScore(current) ? incoming : current;
}

function buildComparisonProducts(products: DecoratedProduct[]): DecoratedProduct[] {
  const directMerchantProducts = filterDirectMerchantProducts(products);
  const deduped = new Map<string, DecoratedProduct>();

  for (const product of directMerchantProducts) {
    const key = buildComparisonKey(product);
    const existing = deduped.get(key);
    deduped.set(key, existing ? pickRicherComparisonProduct(existing, product) : product);
  }

  const ranked = Array.from(deduped.values());
  const useful = ranked.filter((product) => hasComparisonSignals(product));
  return (useful.length > 0 ? useful : ranked).slice(0, 12);
}

const badgeStyle = (badge?: string) => {
  if (badge === "Official Store") return "bg-foreground text-background";
  if (badge === "Authorized Retailer") return "bg-blue-50 text-blue-700";
  if (badge === "Resale") return "bg-amber-50 text-amber-700";
  if (badge === "Brand match") return "bg-green-50 text-green-700";
  if (badge === "Search results") return "bg-warm-100 text-foreground";
  return "bg-muted text-muted-foreground";
};

const ComparisonStat = ({
  label,
  primary,
  secondary,
  fallback,
}: {
  label: string;
  primary?: string;
  secondary?: string;
  fallback: string;
}) => (
  <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">
      {label}
    </p>
    {primary ? (
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">{primary}</span>
        {secondary && <span className="text-xs text-muted-foreground line-through">{secondary}</span>}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">{fallback}</p>
    )}
  </div>
);

const ProductImageFrame = ({
  image,
  merchantUrl,
  proxyImageUrl,
  title,
  className,
  iconClassName = "w-8 h-8",
  onUnavailable,
}: {
  image?: string;
  merchantUrl?: string;
  proxyImageUrl?: string;
  title: string;
  className: string;
  iconClassName?: string;
  onUnavailable?: () => void;
}) => {
  const proxiedImage = buildProductImageUrl(image, merchantUrl, proxyImageUrl);
  const [attemptedRawFallback, setAttemptedRawFallback] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(proxiedImage ?? image);

  useEffect(() => {
    setAttemptedRawFallback(false);
    setImageSrc(proxiedImage ?? image);
  }, [image, proxiedImage]);

  if (!image || !imageSrc) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-warm-100 text-center ${className}`}>
        <ShoppingBag className={`${iconClassName} text-muted-foreground/35`} />
        <span className="px-4 text-xs font-medium text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={title}
      className={className}
      loading="lazy"
      onError={() => {
        if (!attemptedRawFallback && image && imageSrc !== image) {
          setAttemptedRawFallback(true);
          setImageSrc(image);
          return;
        }

        setImageSrc(undefined);
        onUnavailable?.();
      }}
    />
  );
};

const ProductCard = ({
  product,
  index,
  saved,
  onToggleSave,
  onImageUnavailable,
}: {
  product: DecoratedProduct;
  index: number;
  saved: boolean;
  onToggleSave: () => void;
  onImageUnavailable?: () => void;
}) => {
  const badge = product._badge || product.badge;
  const isOfficial = product._badge === "Official Store";

  return (
    <motion.div
      className={`group flex flex-col rounded-sm border overflow-hidden bg-card transition-all ${
        isOfficial
          ? "border-foreground/40 ring-1 ring-foreground/10 shadow-md"
          : "border-border hover:border-foreground/20 hover:shadow-sm"
      }`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: index * 0.04 }}
    >
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        className="aspect-[3/4] bg-warm-100 overflow-hidden relative flex items-center justify-center"
      >
        <ProductImageFrame
          image={product.image}
          merchantUrl={product.url}
          proxyImageUrl={product.proxyImageUrl}
          title={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onUnavailable={onImageUnavailable}
        />
        {badge && (
          <span className={`absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm ${badgeStyle(product._badge)}`}>
            {badge}
          </span>
        )}
      </a>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <a href={product.url} target="_blank" rel="noopener noreferrer">
          <span className="text-sm font-medium text-foreground line-clamp-2 leading-snug hover:underline">{product.title}</span>
        </a>
        {product.source && (
          <span className="text-xs text-muted-foreground">{product.source}</span>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          {product.price && (
            <span className="text-base font-semibold text-foreground">{product.price}</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave();
              }}
              className="p-1 rounded-sm hover:bg-warm-100 transition-colors"
              aria-label={saved ? "Remove from saved" : "Save product"}
            >
              <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"}`} />
            </button>
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ItemChip = ({
  item,
  selected,
  resultCount,
  hasHiddenFallbacks,
  hasLoaded,
  searching,
  searchUnavailable,
  onSelect,
}: {
  item: OutfitItem;
  selected: boolean;
  resultCount: number;
  hasHiddenFallbacks: boolean;
  hasLoaded: boolean;
  searching: boolean;
  searchUnavailable: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={`w-full text-left flex flex-col gap-2 px-4 py-3 rounded-sm border transition-colors ${
      selected
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-card hover:border-foreground/25 hover:bg-warm-100"
    }`}
  >
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{item.name}</span>
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${
        selected ? "bg-background/10 text-background" : confidenceColor(item.confidence)
      }`}>
        {item.confidence === "high" ? "✓" : item.confidence === "medium" ? "~" : "?"}
      </span>
    </div>
    <div className={`flex flex-wrap items-center gap-2 text-xs ${selected ? "text-background/80" : "text-muted-foreground"}`}>
      {(item.brand || item.brand_guess) && <span>{item.brand || item.brand_guess}</span>}
      <span>{item.price_estimate}</span>
      <span>
        {searching
          ? "Searching…"
          : !hasLoaded
            ? "Tap to search"
          : searchUnavailable
          ? "Search unavailable"
          : resultCount > 0
            ? `${resultCount} store${resultCount === 1 ? "" : "s"}`
            : hasHiddenFallbacks
              ? "No direct links yet"
              : "No matches yet"}
      </span>
    </div>
  </button>
);

const ComparisonRow = ({
  product,
  saved,
  onToggleSave,
}: {
  product: DecoratedProduct;
  saved: boolean;
  onToggleSave: () => void;
}) => {
  const visitLabel = isGoogleShoppingResultUrl(product.url) ? "Google Shopping" : "Visit";

  return (
  <div className="grid gap-4 rounded-sm border border-border bg-card p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.35fr)_auto]">
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-warm-100">
          <ProductImageFrame
            image={product.image}
            merchantUrl={product.url}
            proxyImageUrl={product.proxyImageUrl}
            title={product.title}
            className="h-full w-full object-cover"
            iconClassName="w-4 h-4"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground line-clamp-2">{product.title}</span>
            {product._badge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${badgeStyle(product._badge)}`}>
                {product._badge}
              </span>
            )}
          </div>
          {product.source && <p className="text-sm text-muted-foreground">{product.source}</p>}
        </div>
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      <ComparisonStat
        label="Price"
        primary={product.price}
        secondary={product.originalPrice}
        fallback="Price not listed"
      />
      <ComparisonStat
        label="Offer"
        primary={product.discount || product.offer}
        fallback="Offer not listed"
      />
      <ComparisonStat
        label="Shipping"
        primary={product.shipping}
        fallback="Shipping not listed"
      />
      <ComparisonStat
        label="Availability"
        primary={product.availability}
        fallback="Availability not listed"
      />
    </div>
    <div className="flex items-start justify-end gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave();
        }}
        className="p-2 rounded-sm border border-border hover:bg-warm-100 transition-colors"
        aria-label={saved ? "Remove from saved" : "Save product"}
      >
        <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"}`} />
      </button>
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium text-foreground hover:bg-warm-100 transition-colors"
      >
        {visitLabel}
      </a>
    </div>
  </div>
  );
};

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysis = location.state?.analysis as OutfitAnalysis | undefined;
  const source = location.state?.source as string | undefined;
  const imageUrl = location.state?.imageUrl as string | undefined;
  const [market, setMarket] = useState<SearchMarketCode>(() =>
    normalizeMarket(location.state?.market ?? getPreferredMarket()),
  );

  const [itemSearchCache, setItemSearchCache] = useState<Record<string, CachedItemSearchResult>>({});
  const [searchingKey, setSearchingKey] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(analysis?.items[0]?.name ?? null);
  const [failedVisualProductUrls, setFailedVisualProductUrls] = useState<Set<string>>(new Set());
  const { savedUrls, toggleProduct } = useSavedProducts();
  const { toast } = useToast();
  const buildItemCacheKey = useCallback((itemName: string, currentMarket: SearchMarketCode) => {
    const base = imageUrl || source || "unknown-image";
    return `${base}::${currentMarket}::${itemName}`;
  }, [imageUrl, source]);

  useEffect(() => {
    persistPreferredMarket(market);
  }, [market]);

  const toggleSave = useCallback((url: string, product: ProductResult & { _badge?: string }) => {
    void toggleProduct(product as SavedProduct)
      .then((result) => {
        toast({ description: result === "saved" ? "Saved to favorites ♥" : "Removed from saved" });
      })
      .catch((error) => {
        toast({
          title: "Could not update saved items",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      });
  }, [toast, toggleProduct]);

  useEffect(() => {
    if (!selectedItemName || !analysis?.items.some((item) => item.name === selectedItemName)) {
      setSelectedItemName(analysis?.items[0]?.name ?? null);
    }
  }, [analysis?.items, selectedItemName]);

  const selectedItem = analysis?.items.find((item) => item.name === selectedItemName) ?? analysis?.items[0];
  const selectedItemCacheKey = selectedItem ? buildItemCacheKey(selectedItem.name, market) : null;

  useEffect(() => {
    if (!analysis || !imageUrl || !selectedItem) return;
    if (imageUrl.startsWith("data:")) {
      console.warn("Cannot run Google Lens on data: URI — need a public image URL");
      return;
    }

    const cacheKey = buildItemCacheKey(selectedItem.name, market);
    if (itemSearchCache[cacheKey]) return;

    let cancelled = false;
    setSearchingKey(cacheKey);
    setFailedVisualProductUrls(new Set());

    searchProductsByImage(imageUrl, [selectedItem], market, {
      detectedBrand: analysis.detected_brand,
      brandDomain: analysis.brand_domain,
      brandDirectUrl: analysis.brand_direct_url,
    })
      .then((response) => {
        if (cancelled) return;

        const fallbackSorted = sortProducts(response.products, analysis.brand_domain);
        const explicitGroups = Object.fromEntries(
          Object.entries(response.itemResults ?? {}).map(([itemName, group]) => [
            itemName,
            sortProducts(group, analysis.brand_domain),
          ]),
        ) as DecoratedProductGroups;

        const nextEntries: Record<string, CachedItemSearchResult> = {};
        for (const [itemName, group] of Object.entries(explicitGroups)) {
          nextEntries[buildItemCacheKey(itemName, market)] = {
            products: group,
            warning: response.warning ?? null,
            searchUnavailable: response.searchUnavailable === true,
            error: null,
          };
        }

        if (!nextEntries[cacheKey]) {
          nextEntries[cacheKey] = {
            products: fallbackSorted,
            warning: response.warning ?? null,
            searchUnavailable: response.searchUnavailable === true,
            error: null,
          };
        }

        setItemSearchCache((current) => ({ ...current, ...nextEntries }));
        fireAndForgetAnalyticsEvent("product_results_loaded", {
          market,
          page: "/results",
          metadata: {
            itemName: selectedItem.name,
            resultCount: nextEntries[cacheKey]?.products.length ?? fallbackSorted.length,
            searchUnavailable: response.searchUnavailable === true,
            warning: response.warning ?? null,
          },
        });
      })
      .catch((error) => {
        console.error(error);
        if (cancelled) return;

        setItemSearchCache((current) => ({
          ...current,
          [cacheKey]: {
            products: [],
            warning: null,
            searchUnavailable: false,
            error: error instanceof Error ? error.message : "Visual product search failed.",
          },
        }));
      })
      .finally(() => {
        setSearchingKey((current) => (current === cacheKey ? null : current));
      });

    return () => {
      cancelled = true;
    };
  }, [analysis, buildItemCacheKey, imageUrl, itemSearchCache, market, selectedItem]);

  if (!analysis || !analysis.items) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 text-center">
          <p className="text-muted-foreground">No analysis data. Go back and analyze an outfit first.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-foreground underline">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const brandName = analysis.detected_brand;
  const brandDirectUrl = analysis.brand_direct_url;
  const groupedProducts = Object.fromEntries(
    analysis.items.map((item) => [
      item.name,
      itemSearchCache[buildItemCacheKey(item.name, market)]?.products ?? [],
    ]),
  ) as DecoratedProductGroups;
  const directMerchantGroups = Object.fromEntries(
    Object.entries(groupedProducts).map(([itemName, products]) => [
      itemName,
      filterDirectMerchantProducts(products),
    ]),
  ) as DecoratedProductGroups;
  const selectedSearchState = selectedItemCacheKey ? itemSearchCache[selectedItemCacheKey] : undefined;
  const productSearchError = selectedSearchState?.error ?? null;
  const productSearchWarning = selectedSearchState?.warning ?? null;
  const searchUnavailable = selectedSearchState?.searchUnavailable ?? false;
  const searching = Boolean(selectedItemCacheKey && searchingKey === selectedItemCacheKey);
  const rawCurrentProducts = selectedItem ? groupedProducts[selectedItem.name] ?? [] : [];
  const currentProducts = selectedItem ? directMerchantGroups[selectedItem.name] ?? [] : [];
  const hasHiddenGoogleFallbacks = rawCurrentProducts.length > 0 && currentProducts.length === 0;
  const rankedSelectedProducts = selectedItem
    ? [...currentProducts].sort(
        (left, right) => scoreProductForItem(right, selectedItem) - scoreProductForItem(left, selectedItem),
      )
    : [];
  const availableVisualProducts = rankedSelectedProducts.filter(
    (product) => !failedVisualProductUrls.has(product.url),
  );
  const visualPreviewProducts = selectedItem
    ? buildVisualPreviewProducts(availableVisualProducts, selectedItem)
    : [];
  const exactMatch = visualPreviewProducts[0];
  const comparisonProducts = buildComparisonProducts(rankedSelectedProducts);
  const additionalMatches = visualPreviewProducts.slice(1, 9);
  const markVisualImageUnavailable = useCallback((productUrl: string) => {
    setFailedVisualProductUrls((current) => {
      if (current.has(productUrl)) return current;
      return new Set(current).add(productUrl);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
          >
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to search
            </button>

            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
              {imageUrl && !imageUrl.startsWith("data:") && (
                <motion.div
                  className="w-36 aspect-[4/5] md:w-44 lg:w-48 flex-shrink-0 rounded-xl overflow-hidden border border-border/80 bg-warm-100 shadow-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={transition}
                >
                  <img
                    src={imageUrl}
                    alt="Analyzed outfit"
                    className="w-full h-full object-cover object-top"
                  />
                </motion.div>
              )}

              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm">🎯</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {analysis.total_items} items detected
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {analysis.confidence_score}% confidence
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    Outfit Analysis
                  </h1>
                  {source && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                      Source: {source}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {analysis.detected_brand && (
                    <span className="px-2.5 py-1 bg-foreground text-background rounded-sm font-medium">
                      🏷 {analysis.detected_brand}
                    </span>
                  )}
                  {analysis.celebrity_brand && (
                    <span className="px-2.5 py-1 bg-foreground text-background rounded-sm font-medium">
                      ⭐ {analysis.celebrity_brand}
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-warm-100 text-muted-foreground rounded-sm">
                    {analysis.overall_style}
                  </span>
                  <span className="px-2.5 py-1 bg-warm-100 text-muted-foreground rounded-sm">
                    {analysis.occasion}
                  </span>
                  <span className="px-2.5 py-1 bg-warm-100 text-muted-foreground rounded-sm">
                    {analysis.season}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Brand CTA */}
          {brandName && brandDirectUrl && (
            <motion.a
              href={brandDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 mb-8 px-5 py-4 bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: 0.08 }}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  Shop on {brandName} →
                </span>
              </div>
              <span className="text-xs opacity-70 hidden sm:inline truncate max-w-[250px]">
                {analysis.brand_domain}
              </span>
            </motion.a>
          )}

          {/* Detected items */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.1 }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Detected items
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.items.map((item, i) => (
                <ItemChip
                  key={`${item.name}-${i}`}
                  item={item}
                  selected={item.name === selectedItem?.name}
                  resultCount={(directMerchantGroups[item.name] ?? []).length}
                  hasHiddenFallbacks={(groupedProducts[item.name] ?? []).length > 0 && (directMerchantGroups[item.name] ?? []).length === 0}
                  hasLoaded={Boolean(itemSearchCache[buildItemCacheKey(item.name, market)])}
                  searching={Boolean(searchingKey && searchingKey === buildItemCacheKey(item.name, market))}
                  searchUnavailable={itemSearchCache[buildItemCacheKey(item.name, market)]?.searchUnavailable ?? false}
                  onSelect={() => setSelectedItemName(item.name)}
                />
              ))}
            </div>
          </motion.div>

          {/* Visual product matches */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.2 }}
          >
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Shop similar products
                </p>
                {searching && (
                  <div className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    Visual product search…
                  </div>
                )}
              </div>
              <CountrySelect value={market} onChange={setMarket} />
            </div>

            <div className="mb-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                Merchant labels like Official Store, Authorized Retailer, and Resale are automated best-effort classifications.
              </p>
              <p className="text-xs text-muted-foreground">
                Shop in biases results toward your selected market but does not guarantee local availability, shipping, or merchant status.
              </p>
            </div>

            {productSearchWarning && !searching && (
              <p className="text-xs text-muted-foreground mb-4">
                {productSearchWarning}
              </p>
            )}

            {searching ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex flex-col rounded-sm border border-border overflow-hidden">
                    <Skeleton className="aspect-[3/4]" />
                    <div className="p-3 flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/3" />
                      <Skeleton className="h-4 w-16 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : currentProducts.length > 0 && selectedItem ? (
              comparisonProducts.length > 0 ? (
                <div className="space-y-6">
                  <div className={`grid gap-5 rounded-xl border border-border bg-card p-5 ${exactMatch ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]" : "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"}`}>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
                          Selected item
                        </p>
                        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                          {selectedItem.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-3">
                          {buildItemSummary(selectedItem)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {(selectedItem.brand || selectedItem.brand_guess) && (
                          <span className="px-2.5 py-1 rounded-sm bg-warm-100">{selectedItem.brand || selectedItem.brand_guess}</span>
                        )}
                        {selectedItem.color && <span className="px-2.5 py-1 rounded-sm bg-warm-100">{selectedItem.color}</span>}
                        {selectedItem.material && <span className="px-2.5 py-1 rounded-sm bg-warm-100">{selectedItem.material}</span>}
                        {selectedItem.style && <span className="px-2.5 py-1 rounded-sm bg-warm-100">{selectedItem.style}</span>}
                        <span className="px-2.5 py-1 rounded-sm bg-warm-100">{comparisonProducts.length} store comparisons</span>
                      </div>
                    </div>

                    {exactMatch && (
                      <div className="rounded-xl border border-border bg-background overflow-hidden">
                        <div className="p-5 border-b border-border">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
                            Closest match to your exact look
                          </p>
                          <div className="grid gap-4 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                            <div className="rounded-lg overflow-hidden bg-warm-100 aspect-[3/4]">
                  <ProductImageFrame
                    image={exactMatch.image}
                    merchantUrl={exactMatch.url}
                    proxyImageUrl={exactMatch.proxyImageUrl}
                    title={exactMatch.title}
                    className="w-full h-full object-cover"
                    onUnavailable={() => markVisualImageUnavailable(exactMatch.url)}
                              />
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="text-2xl font-semibold text-foreground">{exactMatch.title}</h3>
                                  {(exactMatch._badge || exactMatch.badge) && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${badgeStyle(exactMatch._badge || exactMatch.badge)}`}>
                                      {exactMatch._badge || exactMatch.badge}
                                    </span>
                                  )}
                                </div>
                                {exactMatch.source && <p className="text-sm text-muted-foreground">{exactMatch.source}</p>}
                              </div>
                              <div className="flex items-baseline gap-2">
                                {exactMatch.price && <span className="text-2xl font-semibold text-foreground">{exactMatch.price}</span>}
                                {exactMatch.originalPrice && <span className="text-lg text-muted-foreground line-through">{exactMatch.originalPrice}</span>}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {exactMatch.discount && <p>{exactMatch.discount}</p>}
                                {exactMatch.offer && <p>{exactMatch.offer}</p>}
                                {exactMatch.availability && <p>{exactMatch.availability}</p>}
                                {exactMatch.shipping && <p>{exactMatch.shipping}</p>}
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => toggleSave(exactMatch.url, exactMatch)}
                                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-warm-100 transition-colors"
                                >
                                  <Heart className={`w-4 h-4 ${savedUrls.has(exactMatch.url) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                                  {savedUrls.has(exactMatch.url) ? "Saved" : "Save"}
                                </button>
                                <a
                                  href={exactMatch.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
                                >
                                  Visit
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!exactMatch && (
                      <div className="rounded-xl border border-dashed border-border bg-background/60 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
                          Visual preview
                        </p>
                        <p className="text-sm font-medium text-foreground mb-1">
                          No working product image yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Store matches are available below, but this merchant set did not include a usable product photo for the selected item.
                        </p>
                      </div>
                    )}
                  </div>

                  {additionalMatches.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground">More visual matches</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {additionalMatches.map((product, i) => (
                          <ProductCard
                            key={`${product.url}-${i}`}
                            product={product}
                            index={i}
                            saved={savedUrls.has(product.url)}
                            onToggleSave={() => toggleSave(product.url, product)}
                            onImageUnavailable={() => markVisualImageUnavailable(product.url)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-semibold text-foreground">
                        Compare stores for {selectedItem.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Compare price, listed offers, shipping, and stock signals across stores before you click out.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {comparisonProducts.map((product, index) => (
                        <ComparisonRow
                          key={`${product.url}-${index}`}
                          product={product}
                          saved={savedUrls.has(product.url)}
                          onToggleSave={() => toggleSave(product.url, product)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-border bg-card px-5 py-6 text-center">
                  <p className="text-sm font-medium text-foreground mb-1">
                    No store comparisons for {selectedItem.name} yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try another detected item to compare prices, offers, and delivery details across stores.
                  </p>
                </div>
              )
            ) : productSearchError ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {productSearchError}
              </p>
            ) : searchUnavailable ? (
              <div className="rounded-sm border border-border bg-card px-5 py-6 text-center">
                <p className="text-sm font-medium text-foreground mb-1">
                  Product search is temporarily unavailable
                </p>
                <p className="text-sm text-muted-foreground">
                  The outfit analysis worked, but live merchant matching is not responding right now.
                </p>
              </div>
            ) : imageUrl?.startsWith("data:") ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Visual product search requires a public image URL. Try using an Instagram link instead of uploading directly.
              </p>
            ) : hasHiddenGoogleFallbacks ? (
              <div className="rounded-sm border border-border bg-card px-5 py-6 text-center">
                <p className="text-sm font-medium text-foreground mb-1">
                  No direct store links found yet
                </p>
                <p className="text-sm text-muted-foreground">
                  We found Google Shopping aggregator links for this item, but hid them so you only see direct merchant pages.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No visual product matches found.
              </p>
            )}
          </motion.div>

          {/* CTA */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...transition, delay: 0.5 }}
          >
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Analyze another outfit
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
