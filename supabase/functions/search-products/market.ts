export type SearchMarketCode = "us" | "in" | "uk" | "ca" | "ae" | "au";

export interface SearchMarket {
  code: SearchMarketCode;
  label: string;
  gl: string;
  hl: string;
  country: string;
  preferredDomains: string[];
  suppressedDomains: string[];
  resultLimit: number;
}

const SEARCH_MARKETS: Record<SearchMarketCode, SearchMarket> = {
  in: {
    code: "in",
    label: "India",
    gl: "in",
    hl: "en",
    country: "in",
    preferredDomains: [
      "thesouledstore.com",
      "myntra.com",
      "ajio.com",
      "tatacliq.com",
      "nykaafashion.com",
      "shoppersstop.com",
      "hm.com",
      "zara.com",
      "uniqlo.com",
      "puma.com",
    ],
    suppressedDomains: [
      "nordstrom.com",
      "neimanmarcus.com",
      "bergdorfgoodman.com",
      "saks.com",
      "saksfifthavenue.com",
      "bloomingdales.com",
      "macys.com",
      "target.com",
      "walmart.com",
      "tjmaxx.com",
      "6pm.com",
    ],
    resultLimit: 36,
  },
  us: {
    code: "us",
    label: "United States",
    gl: "us",
    hl: "en",
    country: "us",
    preferredDomains: [
      "nordstrom.com",
      "neimanmarcus.com",
      "bergdorfgoodman.com",
      "saks.com",
      "bloomingdales.com",
      "macys.com",
      "revolve.com",
      "target.com",
      "walmart.com",
      "zappos.com",
    ],
    suppressedDomains: [],
    resultLimit: 36,
  },
  uk: {
    code: "uk",
    label: "United Kingdom",
    gl: "uk",
    hl: "en",
    country: "uk",
    preferredDomains: [
      "selfridges.com",
      "harrods.com",
      "libertylondon.com",
      "asos.com",
      "johnlewis.com",
      "next.co.uk",
      "marksandspencer.com",
      "brownsfashion.com",
      "reiss.com",
    ],
    suppressedDomains: [
      "nordstrom.com",
      "neimanmarcus.com",
      "bergdorfgoodman.com",
      "saks.com",
      "saksfifthavenue.com",
      "bloomingdales.com",
      "macys.com",
      "target.com",
      "walmart.com",
      "tjmaxx.com",
      "6pm.com",
    ],
    resultLimit: 36,
  },
  ca: {
    code: "ca",
    label: "Canada",
    gl: "ca",
    hl: "en",
    country: "ca",
    preferredDomains: [
      "ssense.com",
      "simons.ca",
      "thebay.com",
      "holtrenfrew.com",
      "aritzia.com",
      "sportinglife.ca",
    ],
    suppressedDomains: [
      "target.com",
      "tjmaxx.com",
      "6pm.com",
    ],
    resultLimit: 36,
  },
  ae: {
    code: "ae",
    label: "United Arab Emirates",
    gl: "ae",
    hl: "en",
    country: "ae",
    preferredDomains: [
      "namshi.com",
      "noon.com",
      "ounass.com",
      "levelshoes.com",
      "6thstreet.com",
      "amazon.ae",
    ],
    suppressedDomains: [
      "nordstrom.com",
      "neimanmarcus.com",
      "bergdorfgoodman.com",
      "saks.com",
      "saksfifthavenue.com",
      "bloomingdales.com",
      "macys.com",
      "target.com",
      "walmart.com",
      "tjmaxx.com",
      "6pm.com",
    ],
    resultLimit: 36,
  },
  au: {
    code: "au",
    label: "Australia",
    gl: "au",
    hl: "en",
    country: "au",
    preferredDomains: [
      "theiconic.com.au",
      "myer.com.au",
      "davidjones.com",
      "gluestore.com.au",
      "cottonon.com",
    ],
    suppressedDomains: [
      "nordstrom.com",
      "neimanmarcus.com",
      "bergdorfgoodman.com",
      "saks.com",
      "saksfifthavenue.com",
      "bloomingdales.com",
      "macys.com",
      "target.com",
      "walmart.com",
      "tjmaxx.com",
      "6pm.com",
    ],
    resultLimit: 36,
  },
};

export function resolveSearchMarket(value: unknown): SearchMarket {
  if (typeof value !== "string") return SEARCH_MARKETS.us;

  const normalized = value.trim().toLowerCase() as SearchMarketCode;
  return SEARCH_MARKETS[normalized] ?? SEARCH_MARKETS.us;
}

export function resolveFallbackSearchMarket(market: SearchMarket): SearchMarket | null {
  if (market.code === "us") return null;
  return SEARCH_MARKETS.us;
}
