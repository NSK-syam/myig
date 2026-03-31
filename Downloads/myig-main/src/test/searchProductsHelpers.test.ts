import { describe, expect, it } from "vitest";

import {
  buildExpandedItemSearchPlans,
  buildItemSearchPlans,
  buildClaudeShoppingQueryPrompt,
  buildShoppingQueries,
  filterLowValueProducts,
  collectLensProducts,
  collectOrganicProductResults,
  collectOfficialDomainResults,
  enrichProductsWithMerchantPageImages,
  extractProductImageFromHtml,
  getMarketDomainBucket,
  isRetailDomain,
  mergeItemResultGroups,
  mergeRankedProducts,
  parseClaudeFallbackItemSearchPlans,
  shouldExpandSearchFallback,
  toShoppingProduct,
} from "../../supabase/functions/search-products/helpers";
import { resolveFallbackSearchMarket, resolveSearchMarket } from "../../supabase/functions/search-products/market";

describe("collectLensProducts", () => {
  it("accepts The Souled Store official product URLs as retail domains", () => {
    expect(
      isRetailDomain("https://www.thesouledstore.com/product/tss-originals-urban-warrior-oversized-tshirt?gte=1"),
    ).toBe(true);
  });

  it("keeps official organic results on the detected brand domain", () => {
    const products = collectOfficialDomainResults(
      {
        organic_results: [
          {
            title: "TSS Originals: Urban Warrior Oversized T-Shirt",
            link: "https://www.thesouledstore.com/product/tss-originals-urban-warrior-oversized-tshirt?gte=1",
            thumbnail: "https://cdn.example.com/urban-warrior.jpg",
          },
          {
            title: "Urban Warrior Oversized Tee | Marketplace",
            link: "https://marketplace.example.com/urban-warrior-tee",
          },
        ],
      },
      "thesouledstore.com",
    );

    expect(products).toEqual([
      expect.objectContaining({
        title: "TSS Originals: Urban Warrior Oversized T-Shirt",
        url: "https://www.thesouledstore.com/product/tss-originals-urban-warrior-oversized-tshirt?gte=1",
        badge: "Official Store",
      }),
    ]);
  });

  it("collects retail organic results as fallback product cards when shopping results are empty", () => {
    const products = collectOrganicProductResults({
      organic_results: [
        {
          title: "Women's Ribbed Square Neck Top",
          link: "https://www.asos.com/us/product/example",
          thumbnail: "https://cdn.example.com/top.jpg",
          source: "ASOS",
        },
        {
          title: "Style guide article",
          link: "https://www.vogue.com/article/example",
          thumbnail: "https://cdn.example.com/editorial.jpg",
          source: "Vogue",
        },
      ],
    });

    expect(products).toEqual([
      expect.objectContaining({
        title: "Women's Ribbed Square Neck Top",
        url: "https://www.asos.com/us/product/example",
        image: "https://cdn.example.com/top.jpg",
        source: "ASOS",
      }),
    ]);
  });

  it("drops non-product organic URLs like live videos and search pages", () => {
    const products = collectOrganicProductResults({
      organic_results: [
        {
          title: "Watch How to style a ribbed top",
          link: "https://www.amazon.com/live/video/0afbc63437414ec686d81501f6682a0e",
          source: "Amazon.com",
        },
        {
          title: "Women's Ribbed Square Neck Top",
          link: "https://www.amazon.com/s?k=ribbed+top",
          source: "Amazon.com",
        },
        {
          title: "Women's Ribbed Square Neck Top",
          link: "https://www.asos.com/us/product/example",
          source: "ASOS",
        },
      ],
    });

    expect(products).toEqual([
      expect.objectContaining({
        title: "Women's Ribbed Square Neck Top",
        url: "https://www.asos.com/us/product/example",
      }),
    ]);
  });

  it("suppresses US-only department stores for India results", () => {
    const market = resolveSearchMarket("in");

    expect(getMarketDomainBucket("https://www.nordstrom.com/s/example", market)).toBe("suppressed");
    expect(getMarketDomainBucket("https://www.thesouledstore.com/product/example", market)).toBe("preferred");
  });

  it("prefers local retailers for each supported shopping country", () => {
    const expectations = [
      ["us", "https://www.nordstrom.com/s/example"],
      ["uk", "https://www.selfridges.com/GB/en/product/example"],
      ["ca", "https://www.simons.ca/en/product/example"],
      ["ae", "https://www.namshi.com/uae-en/product/example"],
      ["au", "https://www.theiconic.com.au/product/example"],
    ] as const;

    for (const [marketCode, url] of expectations) {
      expect(getMarketDomainBucket(url, resolveSearchMarket(marketCode))).toBe("preferred");
    }
  });

  it("ranks official and local retailers ahead of neutral matches for the chosen country", () => {
    const products = mergeRankedProducts(
      [
        [
          {
            title: "Official Souled Store Tee",
            url: "https://www.thesouledstore.com/product/urban-warrior",
            badge: "Official Store",
          },
        ],
        [
          {
            title: "Nordstrom Pink Top",
            url: "https://www.nordstrom.com/s/example",
          },
          {
            title: "Myntra Pink Top",
            url: "https://www.myntra.com/top/example",
          },
          {
            title: "ASOS Pink Top",
            url: "https://www.asos.com/product/example",
          },
        ],
      ],
      resolveSearchMarket("in"),
      "thesouledstore.com",
      36,
    );

    expect(products.map((product) => product.url)).toEqual([
      "https://www.thesouledstore.com/product/urban-warrior",
      "https://www.myntra.com/top/example",
      "https://www.asos.com/product/example",
    ]);
  });

  it("returns more than twenty unique results when the market limit allows it", () => {
    const manyProducts = Array.from({ length: 30 }, (_, index) => ({
      title: `Result ${index + 1}`,
      url: `https://www.asos.com/product/${index + 1}`,
    }));

    const products = mergeRankedProducts([manyProducts], resolveSearchMarket("uk"), "", 36);

    expect(products).toHaveLength(30);
  });

  it("merges duplicate merchant products by canonical identity and keeps the richest record", () => {
    const products = mergeRankedProducts(
      [
        [
          {
            title: "Burgundy Women's Tops | Crop Tops & Going Out",
            url: "https://www2.hm.com/en_in/productpage.12345.html?utm_source=google",
            source: "H&M",
          },
          {
            title: "Burgundy Women's Tops | Crop Tops & Going Out",
            url: "https://www2.hm.com/en_in/productpage.12345.html?utm_medium=cpc",
            source: "H&M",
            image: "https://image.hm.com/product-12345.jpg",
            price: "₹1,299",
            shipping: "Delivery by Apr 2",
          },
        ],
      ],
      resolveSearchMarket("in"),
      "",
      12,
    );

    expect(products).toEqual([
      expect.objectContaining({
        title: "Burgundy Women's Tops | Crop Tops & Going Out",
        image: "https://image.hm.com/product-12345.jpg",
        price: "₹1,299",
        shipping: "Delivery by Apr 2",
      }),
    ]);
  });

  it("treats non-empty but metadata-poor results as fallback candidates", () => {
    expect(
      shouldExpandSearchFallback(
        [
          {
            title: "Burgundy Women's Tops | Crop Tops & Going Out",
            url: "https://www2.hm.com/en_in/productpage.12345.html",
            source: "H&M",
          },
        ],
        1,
      ),
    ).toBe(true);

    expect(
      shouldExpandSearchFallback(
        [
          {
            title: "Burgundy Women's Tops | Crop Tops & Going Out",
            url: "https://www2.hm.com/en_in/productpage.12345.html",
            source: "H&M",
            image: "https://image.hm.com/product-12345.jpg",
            price: "₹1,299",
          },
        ],
        1,
      ),
    ).toBe(false);
  });

  it("drops low-value rows once richer visual or commerce-backed results exist", () => {
    const products = filterLowValueProducts([
      {
        title: "Metadata poor row",
        url: "https://www2.hm.com/en_in/productpage.11111.html",
        source: "H&M",
      },
      {
        title: "Richer row",
        url: "https://www2.hm.com/en_in/productpage.22222.html",
        source: "H&M",
        image: "https://image.hm.com/product-22222.jpg",
      },
    ]);

    expect(products).toEqual([
      expect.objectContaining({
        title: "Richer row",
      }),
    ]);
  });

  it("falls back to the broader US market when a non-US market returns no results", () => {
    expect(resolveFallbackSearchMarket(resolveSearchMarket("in"))?.code).toBe("us");
    expect(resolveFallbackSearchMarket(resolveSearchMarket("uk"))?.code).toBe("us");
    expect(resolveFallbackSearchMarket(resolveSearchMarket("us"))).toBeNull();
  });

  it("builds a strict JSON-only Claude fallback prompt with market context", () => {
    const prompt = buildClaudeShoppingQueryPrompt(
      [
        {
          item_name: "Fitted Ribbed Long Sleeve Top",
          brand: "H&M",
          search_query: "fitted ribbed long sleeve top hm",
          color: "burgundy",
          material: "ribbed knit",
          style: "fitted",
          category: "tops",
        },
      ],
      "India",
      "",
    );

    expect(prompt).toContain("Target shopping market: India.");
    expect(prompt).toContain("\"itemName\":\"Fitted Ribbed Long Sleeve Top\"");
    expect(prompt).toContain("\"color\":\"burgundy\"");
    expect(prompt).toContain("Return only JSON");
  });

  it("builds color-aware item search plans when item attributes are available", () => {
    const plans = buildItemSearchPlans(
      [
        {
          item_name: "Fitted V-Neck Ribbed Long Sleeve Top",
          brand: "H&M",
          search_query: "fitted v-neck ribbed long sleeve top",
          color: "burgundy",
          material: "ribbed knit",
          style: "fitted",
          category: "tops",
        },
      ],
      "",
      8,
    );

    expect(plans[0]?.queries).toEqual(
      expect.arrayContaining([
        "burgundy fitted v neck ribbed long sleeve top",
        "burgundy ribbed knit fitted v neck ribbed long sleeve top",
        "H&M burgundy fitted v neck ribbed long sleeve top",
      ]),
    );
  });

  it("expands a small item list into enough shopping queries to target ten-plus results", () => {
    const queries = buildShoppingQueries(
      [
        {
          item_name: "Pink knit crop top",
          brand: "",
          search_query: "pink knit crop top",
        },
        {
          item_name: "Drawstring lounge shorts",
          brand: "",
          search_query: "pink lounge shorts",
        },
      ],
      "ASOS",
      10,
    );

    expect(queries.length).toBeGreaterThanOrEqual(10);
    expect(queries).toContain("pink knit crop top");
    expect(queries).toContain("ASOS Pink knit crop top");
    expect(queries).toContain("Pink knit crop top women");
  });

  it("filters non-fashion visual matches even on allowed retail domains", () => {
    const products = collectLensProducts({
      visual_matches: [
        {
          title: "A Little More (Amazon Music Songline)",
          link: "https://www.amazon.com/A-Little-More/dp/example",
          source: "Amazon",
        },
        {
          title: "Relaxed Linen Blazer",
          link: "https://www.ssense.com/en-us/women/product/example",
          source: "SSENSE",
        },
      ],
    });

    expect(products).toEqual([
      expect.objectContaining({
        title: "Relaxed Linen Blazer",
        url: "https://www.ssense.com/en-us/women/product/example",
      }),
    ]);
  });

  it("filters shopping results from non-retail domains", () => {
    const products = collectLensProducts({
      shopping_results: [
        {
          title: "Classic Crew Neck T-Shirt",
          link: "https://www.youtube.com/watch?v=example",
          source: "YouTube",
        },
        {
          title: "Classic Crew Neck T-Shirt",
          link: "https://www.uniqlo.com/us/en/products/example",
          source: "UNIQLO",
        },
      ],
    });

    expect(products).toEqual([
      expect.objectContaining({
        title: "Classic Crew Neck T-Shirt",
        url: "https://www.uniqlo.com/us/en/products/example",
      }),
    ]);
  });

  it("captures price, discount, offer, shipping, and availability metadata for store comparison", () => {
    const product = toShoppingProduct({
      title: "Anna-Kaci Women's Ribbed Knit Lounge Set",
      link: "https://www.target.com/p/lounge-set",
      thumbnail: "https://cdn.example.com/lounge-set.jpg",
      price: "$70.99",
      old_price: "$89.99",
      source: "Target",
      delivery: "Free delivery between Mar 25 - 31",
      extensions: ["In stock online", "21% off", "Target Circle offer"],
    });

    expect(product).toEqual(
      expect.objectContaining({
        title: "Anna-Kaci Women's Ribbed Knit Lounge Set",
        price: "$70.99",
        originalPrice: "$89.99",
        discount: "21% off",
        offer: "Target Circle offer",
        availability: "In stock online",
        shipping: "Free delivery between Mar 25 - 31",
        source: "Target",
      }),
    );
  });

  it("keeps google shopping product_link results when the merchant link is missing", () => {
    const product = toShoppingProduct({
      title: "H&M Ladies Ribbed Cotton Top",
      link: null,
      product_link:
        "https://www.google.com/search?ibp=oshop&q=women+burgundy+fitted+ribbed+long+sleeve+top&prds=catalogid:9269742327697936986",
      thumbnail: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:example",
      price: "$14.99",
      source: "H&M",
      delivery: "Free delivery on $60+",
    });

    expect(product).toEqual(
      expect.objectContaining({
        title: "H&M Ladies Ribbed Cotton Top",
        url:
          "https://www.google.com/search?ibp=oshop&q=women+burgundy+fitted+ribbed+long+sleeve+top&prds=catalogid:9269742327697936986",
        image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:example",
        price: "$14.99",
        shipping: "Free delivery on $60+",
        source: "H&M",
      }),
    );
  });

  it("rejects non-product shopping links like Amazon Live URLs", () => {
    const product = toShoppingProduct({
      title: "Watch How to connect your Google account to XGIMI Horizon ...",
      link: "https://www.amazon.com/live/video/0afbc63437414ec686d81501f6682a0e?ref_=asvh_vdp",
      source: "Amazon.com",
    });

    expect(product).toBeNull();
  });

  it("builds per-item search plans so every detected item keeps its own store search intent", () => {
    const plans = buildItemSearchPlans(
      [
        {
          item_name: "Tiger Print Oversized Blazer",
          brand: "Zara",
          search_query: "tiger print oversized blazer zara",
        },
        {
          item_name: "Black Crop Top/Bralette",
          brand: "",
          search_query: "black crop top bralette",
        },
      ],
      "Zara",
      2,
    );

    expect(plans).toEqual([
      {
        itemName: "Tiger Print Oversized Blazer",
        queries: ["tiger print oversized blazer zara", "Zara Tiger Print Oversized Blazer"],
      },
      {
        itemName: "Black Crop Top/Bralette",
        queries: ["black crop top bralette", "Black Crop Top/Bralette"],
      },
    ]);
  });

  it("builds expanded per-item fallback queries after the initial narrow search plan is exhausted", () => {
    const initialPlans = buildItemSearchPlans(
      [
        {
          item_name: "Fitted Ribbed Long Sleeve Top",
          brand: "H&M",
          search_query: "fitted ribbed long sleeve top hm",
        },
        {
          item_name: "Mid-Rise Straight Leg Jeans",
          brand: "Levi's",
          search_query: "mid rise straight leg jeans levis",
        },
      ],
      "",
      2,
    );

    const expanded = buildExpandedItemSearchPlans(
      [
        {
          item_name: "Fitted Ribbed Long Sleeve Top",
          brand: "H&M",
          search_query: "fitted ribbed long sleeve top hm",
        },
        {
          item_name: "Mid-Rise Straight Leg Jeans",
          brand: "Levi's",
          search_query: "mid rise straight leg jeans levis",
        },
      ],
      "",
      initialPlans,
      6,
    );

    expect(expanded).toEqual([
      {
        itemName: "Fitted Ribbed Long Sleeve Top",
        queries: [
          "Fitted Ribbed Long Sleeve Top",
          "Fitted Ribbed Long Sleeve Top women",
          "Fitted Ribbed Long Sleeve Top buy online",
          "Fitted Ribbed Long Sleeve Top fashion",
        ],
      },
      {
        itemName: "Mid-Rise Straight Leg Jeans",
        queries: [
          "Mid-Rise Straight Leg Jeans",
          "Mid-Rise Straight Leg Jeans women",
          "Mid-Rise Straight Leg Jeans buy online",
          "Mid-Rise Straight Leg Jeans fashion",
        ],
      },
    ]);
  });

  it("parses Claude fallback queries and filters already-used searches", () => {
    const initialPlans = buildItemSearchPlans(
      [
        {
          item_name: "Fitted Ribbed Long Sleeve Top",
          brand: "H&M",
          search_query: "fitted ribbed long sleeve top hm",
        },
      ],
      "",
      6,
    );

    const plans = parseClaudeFallbackItemSearchPlans(
      JSON.stringify({
        items: [
          {
            itemName: "Fitted Ribbed Long Sleeve Top",
            queries: [
              "fitted ribbed long sleeve top hm",
              "burgundy ribbed square neck long sleeve top women",
              "women's fitted ribbed burgundy long sleeve top square neck",
            ],
          },
        ],
      }),
      [
        {
          item_name: "Fitted Ribbed Long Sleeve Top",
          brand: "H&M",
          search_query: "fitted ribbed long sleeve top hm",
        },
      ],
      initialPlans,
      3,
    );

    expect(plans).toEqual([
      {
        itemName: "Fitted Ribbed Long Sleeve Top",
        queries: [
          "burgundy ribbed square neck long sleeve top women",
          "women's fitted ribbed burgundy long sleeve top square neck",
        ],
      },
    ]);
  });

  it("keeps explicit per-item store groups even when returned titles do not literally match the detected item name", () => {
    const grouped = mergeItemResultGroups(
      [
        {
          itemName: "Tiger Print Oversized Blazer",
          products: [
            {
              title: "Leopard jacquard jacket",
              url: "https://www.zara.com/us/en/leopard-jacquard-jacket-p123.html",
              source: "Zara",
            },
          ],
        },
        {
          itemName: "Black Crop Top/Bralette",
          products: [
            {
              title: "Minimal triangle bralette",
              url: "https://www.hm.com/en_us/productpage.123.html",
              source: "H&M",
            },
          ],
        },
      ],
      resolveSearchMarket("us"),
      "zara.com",
      12,
    );

    expect(grouped["Tiger Print Oversized Blazer"]).toHaveLength(1);
    expect(grouped["Black Crop Top/Bralette"]).toHaveLength(1);
    expect(grouped["Tiger Print Oversized Blazer"][0]).toEqual(
      expect.objectContaining({
        title: "Leopard jacquard jacket",
      }),
    );
  });

  it("extracts an og:image fallback from merchant html", () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://cdn.example.com/products/top-burgundy.jpg" />
        </head>
      </html>
    `;

    expect(
      extractProductImageFromHtml(html, "https://www.example.com/product/top-burgundy"),
    ).toBe("https://cdn.example.com/products/top-burgundy.jpg");
  });

  it("extracts a schema.org product image fallback from merchant html", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Burgundy Ribbed Top",
              "image": ["/images/burgundy-top.jpg"]
            }
          </script>
        </head>
      </html>
    `;

    expect(
      extractProductImageFromHtml(html, "https://www.example.com/product/top-burgundy"),
    ).toBe("https://www.example.com/images/burgundy-top.jpg");
  });

  it("enriches missing product images from merchant pages", async () => {
    const products = await enrichProductsWithMerchantPageImages(
      [
        {
          title: "Burgundy Ribbed Top",
          url: "https://shop.mango.com/product/top-burgundy",
          source: "Example",
        },
        {
          title: "Already has image",
          url: "https://shop.mango.com/product/existing-image",
          image: "https://cdn.example.com/existing.jpg",
        },
      ],
      async (input) => {
        const url = typeof input === "string" ? input : input.toString();
        if (!url.includes("top-burgundy")) {
          throw new Error("Unexpected fetch");
        }

        return new Response(
          '<meta property="og:image" content="https://cdn.example.com/products/top-burgundy.jpg" />',
          {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      },
    );

    expect(products).toEqual([
      expect.objectContaining({
        title: "Burgundy Ribbed Top",
        image: "https://cdn.example.com/products/top-burgundy.jpg",
      }),
      expect.objectContaining({
        title: "Already has image",
        image: "https://cdn.example.com/existing.jpg",
      }),
    ]);
  });
});
