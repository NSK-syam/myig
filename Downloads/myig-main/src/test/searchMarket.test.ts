import { describe, expect, it } from "vitest";

import { resolveSearchMarket } from "../../supabase/functions/search-products/market";

describe("resolveSearchMarket", () => {
  it("maps India to the correct SerpAPI locale params", () => {
    expect(resolveSearchMarket("in")).toEqual(
      expect.objectContaining({
        code: "in",
        label: "India",
        gl: "in",
        hl: "en",
        country: "in",
        resultLimit: 36,
      }),
    );
    expect(resolveSearchMarket("in").preferredDomains).toContain("thesouledstore.com");
    expect(resolveSearchMarket("in").suppressedDomains).toContain("nordstrom.com");
  });

  it("falls back to the US locale when the country is unsupported", () => {
    expect(resolveSearchMarket("zz")).toEqual(
      expect.objectContaining({
        code: "us",
        label: "United States",
        gl: "us",
        hl: "en",
        country: "us",
        resultLimit: 36,
      }),
    );
    expect(resolveSearchMarket("zz").preferredDomains).toContain("nordstrom.com");
  });
});
