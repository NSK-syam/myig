import { describe, expect, it } from "vitest";
import { buildProductImageUrl } from "./productImages";

describe("buildProductImageUrl", () => {
  it("prefers the proxy URL when available", () => {
    const result = buildProductImageUrl(
      "https://cdn.example.com/trench-primary.jpg",
      "https://shop.example.com/products/trench-primary",
      "https://uqrxaffgnmnaewaaqmmh.supabase.co/functions/v1/proxy-product-image?token=abc",
    );

    expect(result).toBe(
      "https://uqrxaffgnmnaewaaqmmh.supabase.co/functions/v1/proxy-product-image?token=abc",
    );
  });

  it("falls back to the raw image URL when no proxy URL is available", () => {
    const result = buildProductImageUrl(
      "https://cdn.example.com/trench-primary.jpg",
      "https://shop.example.com/products/trench-primary",
    );

    expect(result).toBe("https://cdn.example.com/trench-primary.jpg");
  });

  it("returns the raw image for Google Shopping thumbnails", () => {
    const imageUrl =
      "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSI3okww6ppLRJ118y8rTdoNy5jO_VqJ9ApI3DHYIGnRCdF8bsOKYyF59F44dqmgNksdMTi_2OlwOlUgK4LStsjdFxXz_0EBdtmhw5KbsfXaG1UV5xr4i9T";

    const result = buildProductImageUrl(
      imageUrl,
      "https://www.google.com/search?ibp=oshop&q=burgundy%20fitted%20ribbed%20long%20sleeve%20top&prds=catalogid:9269742327697936986",
    );

    expect(result).toBe(imageUrl);
  });

  it("returns undefined when no image URL is provided", () => {
    const result = buildProductImageUrl(undefined, "https://shop.example.com/products/item");
    expect(result).toBeUndefined();
  });
});
