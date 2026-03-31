import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeAppFunctionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("@/lib/appAccess", () => ({
  invokeAppFunction: (...args: unknown[]) => invokeAppFunctionMock(...args),
}));

const {
  analyzeOutfitFromImageUrl,
  extractInstagramImages,
  isInstagramUrl,
  searchProductsByImage,
  uploadBase64ToStorage,
} = await import("./outfitApi");

describe("isInstagramUrl", () => {
  beforeEach(() => {
    invokeAppFunctionMock.mockReset();
  });

  it("accepts canonical Instagram post URLs", () => {
    expect(isInstagramUrl("https://www.instagram.com/p/ABC123/")).toBe(true);
    expect(isInstagramUrl("https://instagram.com/reel/XYZ987/?utm_source=test")).toBe(true);
  });

  it("rejects non-Instagram hosts that only contain instagram.com in the path", () => {
    expect(isInstagramUrl("https://evil.example/instagram.com/p/ABC123/")).toBe(false);
    expect(isInstagramUrl("https://instagram.com.evil.example/p/ABC123/")).toBe(false);
  });

  it("rejects non-https Instagram URLs", () => {
    expect(isInstagramUrl("http://www.instagram.com/p/ABC123/")).toBe(false);
  });

  it("sends market and brand context with the product-search request", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: {
        success: true,
        products: [],
      },
      error: null,
    });

    await searchProductsByImage(
      "https://example.com/outfit.jpg",
      [
        {
          name: "Urban Warrior Oversized T-Shirt",
          category: "tops",
          color: "black",
          material: "polyester",
          style: "oversized",
          brand: "TSS Originals",
          brand_guess: "",
          price_estimate: "$35",
          confidence: "high",
          search_query: "TSS Originals Urban Warrior Oversized T-Shirt",
          shopping_links: [],
        },
      ],
      "in",
      {
        detectedBrand: "TSS Originals",
        brandDomain: "thesouledstore.com",
        brandDirectUrl: "https://www.thesouledstore.com/search?q=urban%20warrior",
      },
    );

    expect(invokeAppFunctionMock).toHaveBeenCalledWith("search-products", {
      body: {
        imageUrl: "https://example.com/outfit.jpg",
        brandedItems: [
          {
            item_name: "Urban Warrior Oversized T-Shirt",
            brand: "TSS Originals",
            search_query: "TSS Originals Urban Warrior Oversized T-Shirt",
            color: "black",
            material: "polyester",
            style: "oversized",
            category: "tops",
          },
        ],
        market: "in",
        detectedBrand: "TSS Originals",
        brandDomain: "thesouledstore.com",
        brandDirectUrl: "https://www.thesouledstore.com/search?q=urban%20warrior",
      },
    });
  });

  it("routes upload-image calls through the protected app-function helper", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: {
        success: true,
        signedUrl: "https://cdn.example.com/upload.jpg",
      },
      error: null,
    });

    await expect(uploadBase64ToStorage("base64-image")).resolves.toBe("https://cdn.example.com/upload.jpg");

    expect(invokeAppFunctionMock).toHaveBeenCalledWith("upload-image", {
      body: {
        imageBase64: "base64-image",
        contentType: "image/jpeg",
      },
    });
  });

  it("routes instagram extraction through the protected app-function helper", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: {
        success: true,
        images: ["https://cdn.example.com/look.jpg"],
        imageBase64: "abc123",
        caption: "caption",
      },
      error: null,
    });

    await expect(extractInstagramImages("https://www.instagram.com/p/ABC123/")).resolves.toEqual({
      images: ["https://cdn.example.com/look.jpg"],
      imageBase64: "abc123",
      caption: "caption",
    });

    expect(invokeAppFunctionMock).toHaveBeenCalledWith("extract-instagram", {
      body: {
        instagramUrl: "https://www.instagram.com/p/ABC123/",
      },
    });
  });

  it("surfaces a friendly Instagram extraction message when the edge client only returns a generic non-2xx error", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
      },
    });

    await expect(extractInstagramImages("https://www.instagram.com/reel/ABC123/")).rejects.toThrow(
      "Could not extract images from this Instagram post. Please try uploading a screenshot instead.",
    );
  });

  it("routes image-url analysis through the protected app-function helper", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [],
          overall_style: "minimal",
          occasion: "casual",
          season: "spring",
          total_items: 0,
          confidence_score: 0.75,
          detected_brand: "",
          brand_domain: "",
          brand_direct_url: "",
          celebrity_name: "",
          celebrity_brand: "",
        },
      },
      error: null,
    });

    await analyzeOutfitFromImageUrl("https://example.com/look.jpg");

    expect(invokeAppFunctionMock).toHaveBeenCalledWith("analyze-outfit", {
      body: {
        imageUrl: "https://example.com/look.jpg",
      },
    });
  });

  it("surfaces a friendly busy message when analysis is temporarily overloaded", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({
            details: '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
            error: "AI analysis error: 529",
          }),
          { status: 529, headers: { "Content-Type": "application/json" } },
        ),
        message: "Edge Function returned a non-2xx status code",
      },
    });

    await expect(analyzeOutfitFromImageUrl("https://example.com/look.jpg")).rejects.toThrow(
      "SearchOutfit is busy right now. Please try again in a few seconds.",
    );
  });

  it("surfaces a friendly busy message when upload is temporarily overloaded", async () => {
    invokeAppFunctionMock.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({
            details: '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
            error: "Upload failed: 529",
          }),
          { status: 529, headers: { "Content-Type": "application/json" } },
        ),
        message: "Edge Function returned a non-2xx status code",
      },
    });

    await expect(uploadBase64ToStorage("base64-image")).rejects.toThrow(
      "SearchOutfit is busy right now. Please try again in a few seconds.",
    );
  });
});
