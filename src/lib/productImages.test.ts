import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  SUPABASE_URL: "https://uqrxaffgnmnaewaaqmmh.supabase.co",
}));

const { buildProductImageUrl } = await import("./productImages");

describe("buildProductImageUrl", () => {
  it("builds a proxy URL for normal merchant-hosted product images", () => {
    const result = buildProductImageUrl(
      "https://cdn.example.com/trench-primary.jpg",
      "https://shop.example.com/products/trench-primary",
    );

    expect(result).toContain("/functions/v1/proxy-product-image?");
    expect(result).toContain(encodeURIComponent("https://cdn.example.com/trench-primary.jpg"));
    expect(result).toContain(encodeURIComponent("https://shop.example.com/products/trench-primary"));
  });

  it("bypasses the proxy for Google Shopping thumbnails", () => {
    const imageUrl =
      "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSI3okww6ppLRJ118y8rTdoNy5jO_VqJ9ApI3DHYIGnRCdF8bsOKYyF59F44dqmgNksdMTi_2OlwOlUgK4LStsjdFxXz_0EBdtmhw5KbsfXaG1UV5xr4i9T";

    const result = buildProductImageUrl(
      imageUrl,
      "https://www.google.com/search?ibp=oshop&q=burgundy%20fitted%20ribbed%20long%20sleeve%20top&prds=catalogid:9269742327697936986",
    );

    expect(result).toBe(imageUrl);
  });

  it("bypasses the proxy for googleusercontent commerce images", () => {
    const imageUrl = "https://lh3.googleusercontent.com/shopping-api/product/abc123=s600";

    const result = buildProductImageUrl(
      imageUrl,
      "https://www.google.com/search?ibp=oshop&q=burgundy%20ribbed%20top&prds=catalogid:123",
    );

    expect(result).toBe(imageUrl);
  });
});
