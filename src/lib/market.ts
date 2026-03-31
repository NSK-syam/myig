export type SearchMarketCode = "us" | "in" | "uk" | "ca" | "ae" | "au";

export interface SearchMarketOption {
  code: SearchMarketCode;
  label: string;
}

export const MARKET_STORAGE_KEY = "searchoutfit-market";
const LEGACY_MARKET_STORAGE_KEYS = ["findfit-market"];

export const SEARCH_MARKETS: SearchMarketOption[] = [
  { code: "in", label: "India" },
  { code: "us", label: "United States" },
  { code: "uk", label: "United Kingdom" },
  { code: "ca", label: "Canada" },
  { code: "ae", label: "United Arab Emirates" },
  { code: "au", label: "Australia" },
];

const MARKET_CODES = new Set<SearchMarketCode>(SEARCH_MARKETS.map((market) => market.code));

export function normalizeMarket(value: unknown): SearchMarketCode {
  if (typeof value !== "string") return "us";
  const normalized = value.trim().toLowerCase() as SearchMarketCode;
  return MARKET_CODES.has(normalized) ? normalized : "us";
}

export function inferMarketFromLocale(locale?: string): SearchMarketCode {
  const normalized = locale?.toLowerCase() ?? "";
  if (normalized.includes("-in")) return "in";
  if (normalized.includes("-gb") || normalized.includes("-uk")) return "uk";
  if (normalized.includes("-ca")) return "ca";
  if (normalized.includes("-ae")) return "ae";
  if (normalized.includes("-au")) return "au";
  return "us";
}

export function getPreferredMarket(): SearchMarketCode {
  if (typeof window === "undefined") return "us";

  const stored = window.localStorage.getItem(MARKET_STORAGE_KEY);
  if (stored) {
    return normalizeMarket(stored);
  }

  for (const legacyKey of LEGACY_MARKET_STORAGE_KEYS) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    if (legacyValue) {
      return normalizeMarket(legacyValue);
    }
  }

  return inferMarketFromLocale(window.navigator.language);
}

export function persistPreferredMarket(market: SearchMarketCode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MARKET_STORAGE_KEY, market);
  for (const legacyKey of LEGACY_MARKET_STORAGE_KEYS) {
    window.localStorage.removeItem(legacyKey);
  }
}
