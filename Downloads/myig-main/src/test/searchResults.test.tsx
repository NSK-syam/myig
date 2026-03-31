import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSearchProductsByImage = vi.fn();
const mockTrackAnalyticsEvent = vi.fn();

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    loading: false,
    session: null,
    user: null,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/outfitApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/outfitApi")>("@/lib/outfitApi");
  return {
    ...actual,
    searchProductsByImage: (...args: unknown[]) => mockSearchProductsByImage(...args),
  };
});

vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => mockTrackAnalyticsEvent(...args),
  fireAndForgetAnalyticsEvent: (...args: unknown[]) => mockTrackAnalyticsEvent(...args),
}));

const { default: SearchResults } = await import("@/pages/SearchResults");

const analysis = {
  items: [
    {
      name: "Classic Crew Neck T-Shirt",
      category: "tops",
      color: "white",
      material: "cotton",
      style: "classic",
      brand: "",
      brand_guess: "",
      price_estimate: "$15",
      confidence: "medium" as const,
      search_query: "classic white crew neck t-shirt",
      shopping_links: [],
    },
  ],
  overall_style: "Casual, minimalist portrait style with focus on classic basics",
  occasion: "Casual everyday wear, portrait photography",
  season: "Any season - basic layering piece",
  total_items: 1,
  confidence_score: 65,
  detected_brand: "",
  brand_domain: "",
  brand_direct_url: "",
  celebrity_name: "",
  celebrity_brand: "",
};

const multiItemAnalysis = {
  ...analysis,
  items: [
    {
      name: "Urban Warrior Oversized T-Shirt",
      category: "tops",
      color: "black",
      material: "polyester",
      style: "oversized streetwear",
      brand: "TSS Originals",
      brand_guess: "The Souled Store",
      price_estimate: "₹1099",
      confidence: "high" as const,
      search_query: "Urban Warrior oversized t-shirt black",
      shopping_links: [],
    },
    {
      name: "Light Wash Relaxed Jeans",
      category: "bottoms",
      color: "light wash blue",
      material: "denim",
      style: "relaxed fit",
      brand: "",
      brand_guess: "",
      price_estimate: "₹1499",
      confidence: "medium" as const,
      search_query: "light wash relaxed jeans",
      shopping_links: [],
    },
  ],
  total_items: 2,
  detected_brand: "TSS Originals",
  brand_domain: "thesouledstore.com",
  brand_direct_url: "https://www.thesouledstore.com/search?q=urban%20warrior",
};

function renderResults(overrides?: {
  analysis?: typeof analysis;
  source?: string;
  imageUrl?: string;
  market?: string;
}) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/results",
          state: {
            analysis: overrides?.analysis ?? analysis,
            source: overrides?.source ?? "https://www.instagram.com/p/DRZ66oTDdZa/?igsh=MXlyZ2M4ODh4dQ==",
            imageUrl: overrides?.imageUrl ?? "https://example.com/outfit.jpg",
            market: overrides?.market ?? "in",
          },
        },
      ]}
    >
      <Routes>
        <Route path="/results" element={<SearchResults />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SearchResults", () => {
  beforeEach(() => {
    mockSearchProductsByImage.mockReset();
    mockTrackAnalyticsEvent.mockReset();
    window.localStorage.clear();
  });

  it("renders the analyzed image preview and product cards when search succeeds", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Classic White Crew Tee",
          url: "https://shop.example.com/products/crew-tee",
          image: "https://shop.example.com/products/crew-tee.jpg",
          price: "$18",
          source: "Shop Example",
        },
      ],
    });

    renderResults();

    expect(screen.getByAltText("Analyzed outfit")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("Classic White Crew Tee").length).toBeGreaterThan(0);
    });

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("product_results_loaded", expect.objectContaining({
      market: "in",
      metadata: expect.objectContaining({
        resultCount: 1,
        searchUnavailable: false,
      }),
    }));
  });

  it("shows the provider warning when product search is unavailable", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [],
      searchUnavailable: true,
      warning: "Live product matching is temporarily unavailable. Try again shortly.",
    });

    renderResults();

    await waitFor(() => {
      expect(screen.getByText("Live product matching is temporarily unavailable. Try again shortly.")).toBeInTheDocument();
    });
    expect(screen.queryByText("No visual product matches found.")).not.toBeInTheDocument();
  });

  it("shows a broader-results warning when fallback matches are returned from another market", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Classic White Crew Tee",
          url: "https://shop.example.com/products/crew-tee",
          image: "https://shop.example.com/products/crew-tee.jpg",
          price: "$18",
          source: "Shop Example",
        },
      ],
      warning: "No strong matches were found for India. Showing broader United States results instead.",
      searchUnavailable: false,
    });

    renderResults();

    expect(
      await screen.findByText("No strong matches were found for India. Showing broader United States results instead."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Classic White Crew Tee").length).toBeGreaterThan(0);
  });

  it("does not show misleading zero-store counts on detected items when product search is unavailable", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [],
      searchUnavailable: true,
      warning: "Live product matching is temporarily unavailable. Try again shortly.",
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          analysis.items[0],
          {
            name: "Tailored Trousers",
            category: "bottoms",
            color: "camel",
            material: "wool",
            style: "tailored",
            brand: "",
            brand_guess: "",
            price_estimate: "$90",
            confidence: "medium" as const,
            search_query: "camel tailored trousers",
            shopping_links: [],
          },
        ],
        total_items: 2,
      },
    });

    expect(await screen.findByText("Live product matching is temporarily unavailable. Try again shortly.")).toBeInTheDocument();
    expect(screen.getAllByText("Search unavailable").length).toBeGreaterThan(0);
    expect(screen.queryByText("0 stores")).not.toBeInTheDocument();
  });

  it("shows 'No matches yet' instead of zero-store counts when the search returns no products", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [],
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          analysis.items[0],
          {
            name: "Mid-Rise Straight Leg Jeans",
            category: "bottoms",
            color: "blue",
            material: "denim",
            style: "classic",
            brand: "Levi's",
            brand_guess: "",
            price_estimate: "$60",
            confidence: "medium" as const,
            search_query: "mid rise straight leg jeans levis",
            shopping_links: [],
          },
        ],
        total_items: 2,
      },
    });

    expect(await screen.findByText("No visual product matches found.")).toBeInTheDocument();
    expect(screen.getAllByText("No matches yet").length).toBeGreaterThan(0);
    expect(screen.queryByText("0 stores")).not.toBeInTheDocument();
  });

  it("shows merchant-label and market-availability disclaimers with results", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Classic White Crew Tee",
          url: "https://shop.example.com/products/crew-tee",
          image: "https://shop.example.com/products/crew-tee.jpg",
          price: "$18",
          source: "Shop Example",
        },
      ],
    });

    renderResults();

    expect(await screen.findByText(/Merchant labels like Official Store, Authorized Retailer, and Resale are automated best-effort classifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop in biases results toward your selected market but does not guarantee local availability, shipping, or merchant status/i)).toBeInTheDocument();
  });

  it("passes the selected country into product search", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [],
    });

    renderResults();

    await waitFor(() => {
      expect(mockSearchProductsByImage).toHaveBeenCalledWith(
        "https://example.com/outfit.jpg",
        [analysis.items[0]],
        "in",
        {
          detectedBrand: "",
          brandDomain: "",
          brandDirectUrl: "",
        },
      );
    });
  });

  it("searches only the selected detected item for multi-item analyses", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [],
    });

    renderResults({ analysis: multiItemAnalysis });

    await waitFor(() => {
      expect(mockSearchProductsByImage).toHaveBeenCalledWith(
        "https://example.com/outfit.jpg",
        [multiItemAnalysis.items[0]],
        "in",
        {
          detectedBrand: "TSS Originals",
          brandDomain: "thesouledstore.com",
          brandDirectUrl: "https://www.thesouledstore.com/search?q=urban%20warrior",
        },
      );
    });
  });

  it("reuses the cached result when switching back to an already searched item", async () => {
    mockSearchProductsByImage
      .mockResolvedValueOnce({
        products: [
          {
            title: "Urban Warrior Oversized T-Shirt",
            url: "https://www.thesouledstore.com/product/urban-warrior",
            image: "https://cdn.example.com/urban-warrior.jpg",
            price: "₹1099",
            source: "The Souled Store",
          },
        ],
      })
      .mockResolvedValueOnce({
        products: [
          {
            title: "Relaxed Light Wash Jeans",
            url: "https://www.myntra.com/relaxed-jeans",
            image: "https://cdn.example.com/relaxed-jeans.jpg",
            price: "₹1499",
            source: "Myntra",
          },
        ],
      });

    renderResults({ analysis: multiItemAnalysis });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Urban Warrior Oversized T-Shirt/i })).toHaveTextContent("1 store");
    });

    fireEvent.click(screen.getByRole("button", { name: /Light Wash Relaxed Jeans/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Light Wash Relaxed Jeans/i })).toHaveTextContent("1 store");
    });
    expect(screen.getAllByText("Relaxed Light Wash Jeans").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Urban Warrior Oversized T-Shirt/i }));

    await waitFor(() => {
      expect(mockSearchProductsByImage).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: /Urban Warrior Oversized T-Shirt/i })).toHaveTextContent("1 store");
    });
  });

  it("shows detected item chips and rich store metadata for multi-item searches", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Urban Warrior Oversized T-Shirt",
          url: "https://www.thesouledstore.com/product/urban-warrior",
          image: "https://cdn.example.com/urban-warrior.jpg",
          price: "₹1099",
          originalPrice: "₹1199",
          discount: "8% off",
          offer: "Member price",
          availability: "In stock online",
          shipping: "Free delivery between Mar 25 - 31",
          source: "The Souled Store",
          badge: "Official Store",
        },
        {
          title: "Oversized Black Jersey Tee",
          url: "https://www.ajio.com/urban-tee",
          image: "https://cdn.example.com/ajio-tee.jpg",
          price: "₹999",
          offer: "Extra 10% off on checkout",
          availability: "Limited stock",
          shipping: "Free shipping",
          source: "AJIO",
        },
        {
          title: "Relaxed Light Wash Jeans",
          url: "https://www.myntra.com/relaxed-jeans",
          image: "https://cdn.example.com/relaxed-jeans.jpg",
          price: "₹1499",
          availability: "In stock online",
          shipping: "Delivery by Mar 26",
          source: "Myntra",
        },
      ],
    });

    renderResults({ analysis: multiItemAnalysis });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Urban Warrior Oversized T-Shirt/i })).toHaveTextContent("3 stores");
    });
    expect(screen.getByRole("button", { name: /Light Wash Relaxed Jeans/i })).toBeInTheDocument();
    expect(screen.getByText("Shop similar products")).toBeInTheDocument();
    expect(screen.getAllByText("Official Store").length).toBeGreaterThan(0);
    expect(screen.getAllByText("The Souled Store").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AJIO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Urban Warrior Oversized T-Shirt").length).toBeGreaterThan(0);
    expect(screen.getByText("Oversized Black Jersey Tee")).toBeInTheDocument();
  });

  it("shows explicit per-item store counts even when store titles do not literally match the detected item name", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Leopard jacquard jacket",
          url: "https://www.zara.com/leopard-jacquard-jacket",
          image: "https://cdn.example.com/leopard-jacquard-jacket.jpg",
          price: "€129",
          source: "Zara",
        },
        {
          title: "Minimal triangle bralette",
          url: "https://www.brandy.com/minimal-triangle-bralette",
          image: "https://cdn.example.com/minimal-triangle-bralette.jpg",
          price: "$25",
          source: "Brandy Melville",
        },
      ],
      itemResults: {
        "Tiger Print Oversized Blazer": [
          {
            title: "Leopard jacquard jacket",
            url: "https://www.zara.com/leopard-jacquard-jacket",
            image: "https://cdn.example.com/leopard-jacquard-jacket.jpg",
            price: "€129",
            source: "Zara",
          },
          {
            title: "Animal print blazer",
            url: "https://www.stories.com/animal-print-blazer",
            image: "https://cdn.example.com/animal-print-blazer.jpg",
            price: "€119",
            source: "& Other Stories",
          },
        ],
        "Black Crop Top/Bralette": [
          {
            title: "Minimal triangle bralette",
            url: "https://www.brandy.com/minimal-triangle-bralette",
            image: "https://cdn.example.com/minimal-triangle-bralette.jpg",
            price: "$25",
            source: "Brandy Melville",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Tiger Print Oversized Blazer",
            category: "outerwear",
            color: "animal print",
            material: "woven",
            style: "oversized",
            brand: "Zara",
            brand_guess: "& Other Stories",
            price_estimate: "$120",
            confidence: "high" as const,
            search_query: "tiger print oversized blazer",
            shopping_links: [],
          },
          {
            name: "Black Crop Top/Bralette",
            category: "tops",
            color: "black",
            material: "knit",
            style: "minimal",
            brand: "",
            brand_guess: "Brandy Melville",
            price_estimate: "$25",
            confidence: "medium" as const,
            search_query: "black crop top bralette",
            shopping_links: [],
          },
        ],
        total_items: 2,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Tiger Print Oversized Blazer/i })).toHaveTextContent("2 stores");
    });
    expect(screen.getByRole("button", { name: /Black Crop Top\/Bralette/i })).toHaveTextContent("Tap to search");

    fireEvent.click(screen.getByRole("button", { name: /Black Crop Top\/Bralette/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Black Crop Top\/Bralette/i })).toHaveTextContent("1 store");
    });
  });

  it("shows more visual matches before the store comparison list for the selected item", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Steve Madden Women's Sunday Cotton Belted Trench Coat",
          url: "https://www.macys.com/trench-one",
          image: "https://cdn.example.com/trench-one.jpg",
          price: "$169",
          source: "Macy's",
          availability: "In stock online",
        },
        {
          title: "Oversized trench coat with lapels",
          url: "https://shop.mango.com/trench-two",
          image: "https://cdn.example.com/trench-two.jpg",
          price: "$149",
          source: "Mango",
        },
        {
          title: "ZW Collection belted trench coat",
          url: "https://www.zara.com/trench-three",
          image: "https://cdn.example.com/trench-three.jpg",
          price: "$199",
          source: "Zara",
        },
      ],
      itemResults: {
        "Oversized Belted Trench Coat": [
          {
            title: "Steve Madden Women's Sunday Cotton Belted Trench Coat",
            url: "https://www.macys.com/trench-one",
            image: "https://cdn.example.com/trench-one.jpg",
            price: "$169",
            source: "Macy's",
            availability: "In stock online",
          },
          {
            title: "Oversized trench coat with lapels",
            url: "https://shop.mango.com/trench-two",
            image: "https://cdn.example.com/trench-two.jpg",
            price: "$149",
            source: "Mango",
          },
          {
            title: "ZW Collection belted trench coat",
            url: "https://www.zara.com/trench-three",
            image: "https://cdn.example.com/trench-three.jpg",
            price: "$199",
            source: "Zara",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Oversized Belted Trench Coat",
            category: "outerwear",
            color: "beige",
            material: "cotton",
            style: "oversized belted",
            brand: "",
            brand_guess: "COS",
            price_estimate: "$300-600",
            confidence: "high" as const,
            search_query: "oversized belted trench coat women",
            shopping_links: [],
          },
        ],
        total_items: 1,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Oversized Belted Trench Coat/i })).toHaveTextContent("3 stores");
    });
    const comparisonHeading = screen.getByText("Compare stores for Oversized Belted Trench Coat");
    const visualHeading = screen.getByRole("heading", { name: "More visual matches" });

    expect(
      visualHeading.compareDocumentPosition(comparisonHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows explicit comparison placeholders instead of a generic unavailable message", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Oversized trench coat with lapels",
          url: "https://shop.mango.com/trench-two",
          image: "https://cdn.example.com/trench-two.jpg",
          source: "Mango",
        },
      ],
      itemResults: {
        "Oversized Belted Trench Coat": [
          {
            title: "Oversized trench coat with lapels",
            url: "https://shop.mango.com/trench-two",
            image: "https://cdn.example.com/trench-two.jpg",
            source: "Mango",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Oversized Belted Trench Coat",
            category: "outerwear",
            color: "beige",
            material: "cotton",
            style: "oversized belted",
            brand: "",
            brand_guess: "COS",
            price_estimate: "$300-600",
            confidence: "high" as const,
            search_query: "oversized belted trench coat women",
            shopping_links: [],
          },
        ],
        total_items: 1,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Oversized Belted Trench Coat/i })).toHaveTextContent("1 store");
    });
    expect(screen.getByText("Price not listed")).toBeInTheDocument();
    expect(screen.getByText("Offer not listed")).toBeInTheDocument();
    expect(screen.getByText("Shipping not listed")).toBeInTheDocument();
    expect(screen.getByText("Availability not listed")).toBeInTheDocument();
    expect(screen.queryByText("Comparison details unavailable")).not.toBeInTheDocument();
  });

  it("drops failed visual-match images and falls back to the next working visual result", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Primary trench coat match",
          url: "https://shop.example.com/trench-primary",
          image: "https://cdn.example.com/trench-primary.jpg",
          price: "$199",
          source: "Example Shop",
        },
        {
          title: "Secondary trench coat match",
          url: "https://shop.example.com/trench-secondary",
          image: "https://cdn.example.com/trench-secondary.jpg",
          price: "$179",
          source: "Example Shop",
        },
      ],
      itemResults: {
        "Oversized Belted Trench Coat": [
          {
            title: "Primary trench coat match",
            url: "https://shop.example.com/trench-primary",
            image: "https://cdn.example.com/trench-primary.jpg",
            price: "$199",
            source: "Example Shop",
          },
          {
            title: "Secondary trench coat match",
            url: "https://shop.example.com/trench-secondary",
            image: "https://cdn.example.com/trench-secondary.jpg",
            price: "$179",
            source: "Example Shop",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Oversized Belted Trench Coat",
            category: "outerwear",
            color: "beige",
            material: "cotton",
            style: "oversized belted",
            brand: "",
            brand_guess: "COS",
            price_estimate: "$300-600",
            confidence: "high" as const,
            search_query: "oversized belted trench coat women",
            shopping_links: [],
          },
        ],
        total_items: 1,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Oversized Belted Trench Coat/i })).toHaveTextContent("2 stores");
    });
    expect(screen.getByRole("heading", { name: "Primary trench coat match" })).toBeInTheDocument();
    const failedImages = await screen.findAllByAltText("Primary trench coat match");
    fireEvent.error(failedImages[0]);
    fireEvent.error(failedImages[0]);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Primary trench coat match" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Secondary trench coat match" }),
    ).toBeInTheDocument();
  });

  it("loads visual-match images through the product image proxy instead of the raw merchant URL", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Primary trench coat match",
          url: "https://shop.example.com/trench-primary",
          image: "https://cdn.example.com/trench-primary.jpg",
          price: "$199",
          source: "Example Shop",
        },
      ],
      itemResults: {
        "Oversized Belted Trench Coat": [
          {
            title: "Primary trench coat match",
            url: "https://shop.example.com/trench-primary",
            image: "https://cdn.example.com/trench-primary.jpg",
            price: "$199",
            source: "Example Shop",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Oversized Belted Trench Coat",
            category: "outerwear",
            color: "beige",
            material: "cotton",
            style: "oversized belted",
            brand: "",
            brand_guess: "COS",
            price_estimate: "$300-600",
            confidence: "high" as const,
            search_query: "oversized belted trench coat women",
            shopping_links: [],
          },
        ],
        total_items: 1,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Oversized Belted Trench Coat/i })).toHaveTextContent("1 store");
    });
    expect(screen.getByRole("heading", { name: "Primary trench coat match" })).toBeInTheDocument();
    const images = await screen.findAllByAltText("Primary trench coat match");
    expect(images.length).toBeGreaterThan(0);

    for (const image of images) {
      expect(image).toHaveAttribute(
        "src",
        expect.stringContaining("/functions/v1/proxy-product-image?"),
      );
      expect(image).toHaveAttribute(
        "src",
        expect.stringContaining(encodeURIComponent("https://cdn.example.com/trench-primary.jpg")),
      );
    }
  });

  it("uses raw Google Shopping thumbnails instead of the merchant image proxy", async () => {
    const googleShoppingImage =
      "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSI3okww6ppLRJ118y8rTdoNy5jO_VqJ9ApI3DHYIGnRCdF8bsOKYyF59F44dqmgNksdMTi_2OlwOlUgK4LStsjdFxXz_0EBdtmhw5KbsfXaG1UV5xr4i9T";
    const googleShoppingUrl =
      "https://www.google.com/search?ibp=oshop&q=burgundy%20fitted%20ribbed%20long%20sleeve%20top&prds=catalogid:9269742327697936986";

    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "H&M Ladies Ribbed Cotton Top",
          url: googleShoppingUrl,
          image: googleShoppingImage,
          price: "$14.99",
          source: "H&M",
        },
      ],
      itemResults: {
        "Oversized Belted Trench Coat": [
          {
            title: "H&M Ladies Ribbed Cotton Top",
            url: googleShoppingUrl,
            image: googleShoppingImage,
            price: "$14.99",
            source: "H&M",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Oversized Belted Trench Coat",
            category: "outerwear",
            color: "beige",
            material: "cotton",
            style: "oversized belted",
            brand: "",
            brand_guess: "COS",
            price_estimate: "$300-600",
            confidence: "high" as const,
            search_query: "oversized belted trench coat women",
            shopping_links: [],
          },
        ],
        total_items: 1,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Oversized Belted Trench Coat/i })).toHaveTextContent("1 store");
    });
    expect(screen.getByRole("heading", { name: "H&M Ladies Ribbed Cotton Top" })).toBeInTheDocument();
    const images = await screen.findAllByAltText("H&M Ladies Ribbed Cotton Top");
    expect(images.length).toBeGreaterThan(0);

    for (const image of images) {
      expect(image).toHaveAttribute("src", googleShoppingImage);
      expect(image).not.toHaveAttribute(
        "src",
        expect.stringContaining("/functions/v1/proxy-product-image?"),
      );
    }
  });

  it("prefers burgundy visual matches over black ones for a burgundy top", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "No Boundaries V-Neck Ribbed Top with Long Sleeves",
          url: "https://www.walmart.com/black-top",
          image: "https://cdn.example.com/black-top.jpg",
          price: "$14",
          source: "Walmart",
        },
        {
          title: "Topshop rib v-neck long sleeve curved hem top in burgundy",
          url: "https://www.asos.com/burgundy-top",
          image: "https://cdn.example.com/burgundy-top.jpg",
          price: "$24",
          source: "ASOS",
        },
      ],
      itemResults: {
        "Fitted V-Neck Ribbed Long Sleeve Top": [
          {
            title: "No Boundaries V-Neck Ribbed Top with Long Sleeves",
            url: "https://www.walmart.com/black-top",
            image: "https://cdn.example.com/black-top.jpg",
            price: "$14",
            source: "Walmart",
          },
          {
            title: "Topshop rib v-neck long sleeve curved hem top in burgundy",
            url: "https://www.asos.com/burgundy-top",
            image: "https://cdn.example.com/burgundy-top.jpg",
            price: "$24",
            source: "ASOS",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Fitted V-Neck Ribbed Long Sleeve Top",
            category: "tops",
            color: "burgundy",
            material: "ribbed knit",
            style: "fitted",
            brand: "H&M",
            brand_guess: "",
            price_estimate: "$25",
            confidence: "high" as const,
            search_query: "fitted v-neck ribbed long sleeve top burgundy",
            shopping_links: [],
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Fitted V-Neck Ribbed Long Sleeve Top/i })).toHaveTextContent("2 stores");
    });
    expect(screen.getByText(/Closest match to your exact look/i)).toBeInTheDocument();
    expect(screen.getAllByText("Topshop rib v-neck long sleeve curved hem top in burgundy").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Topshop rib v-neck long sleeve curved hem top in burgundy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No Boundaries V-Neck Ribbed Top with Long Sleeves").length).toBeGreaterThan(0);
  });

  it("does not use a wrong-color image-only product as the visual exact match", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "No Boundaries V-Neck Ribbed Top with Long Sleeves",
          url: "https://www.walmart.com/black-top",
          image: "https://cdn.example.com/black-top.jpg",
          price: "$14",
          source: "Walmart",
        },
        {
          title: "Women's Burgundy Ribbed Top",
          url: "https://www2.hm.com/en_in/productpage.1260555015.html",
          price: "$24",
          source: "H&M",
        },
      ],
      itemResults: {
        "Fitted V-Neck Ribbed Long Sleeve Top": [
          {
            title: "No Boundaries V-Neck Ribbed Top with Long Sleeves",
            url: "https://www.walmart.com/black-top",
            image: "https://cdn.example.com/black-top.jpg",
            price: "$14",
            source: "Walmart",
          },
          {
            title: "Women's Burgundy Ribbed Top",
            url: "https://www2.hm.com/en_in/productpage.1260555015.html",
            price: "$24",
            source: "H&M",
          },
        ],
      },
    });

    renderResults({
      analysis: {
        ...analysis,
        items: [
          {
            name: "Fitted V-Neck Ribbed Long Sleeve Top",
            category: "tops",
            color: "burgundy",
            material: "ribbed knit",
            style: "fitted",
            brand: "H&M",
            brand_guess: "",
            price_estimate: "$25",
            confidence: "high" as const,
            search_query: "fitted v-neck ribbed long sleeve top burgundy",
            shopping_links: [],
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Fitted V-Neck Ribbed Long Sleeve Top/i })).toHaveTextContent("2 stores");
    });
    expect(screen.getByText("Compare stores for Fitted V-Neck Ribbed Long Sleeve Top")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "No Boundaries V-Neck Ribbed Top with Long Sleeves" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("More visual matches")).not.toBeInTheDocument();
  });

  it("dedupes comparison rows and drops sparse duplicates without image or commerce details", async () => {
    mockSearchProductsByImage.mockResolvedValue({
      products: [
        {
          title: "Burgundy Women's Tops | Crop Tops & Going Out",
          url: "https://www2.hm.com/en_in/productpage.12345.html?utm_source=google",
          source: "H&M",
        },
        {
          title: "Burgundy Women's Tops | Crop Tops & Going Out",
          url: "https://www2.hm.com/en_in/productpage.12345.html?utm_medium=cpc",
          source: "H&M",
          price: "₹1,299",
          shipping: "Delivery by Apr 2",
        },
        {
          title: "Low-quality Merchant Row",
          url: "https://merchant.example.com/empty",
          source: "Merchant Example",
        },
      ],
      itemResults: {
        "Classic Crew Neck T-Shirt": [
          {
            title: "Burgundy Women's Tops | Crop Tops & Going Out",
            url: "https://www2.hm.com/en_in/productpage.12345.html?utm_source=google",
            source: "H&M",
          },
          {
            title: "Burgundy Women's Tops | Crop Tops & Going Out",
            url: "https://www2.hm.com/en_in/productpage.12345.html?utm_medium=cpc",
            source: "H&M",
            price: "₹1,299",
            shipping: "Delivery by Apr 2",
          },
          {
            title: "Low-quality Merchant Row",
            url: "https://merchant.example.com/empty",
            source: "Merchant Example",
          },
        ],
      },
    });

    renderResults();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Classic Crew Neck T-Shirt/i })).toHaveTextContent("3 stores");
    });
    expect(screen.getByText("Compare stores for Classic Crew Neck T-Shirt")).toBeInTheDocument();
    expect(screen.getAllByText("Burgundy Women's Tops | Crop Tops & Going Out")).toHaveLength(1);
    expect(screen.queryByText("Low-quality Merchant Row")).not.toBeInTheDocument();
    expect(screen.getByText("₹1,299")).toBeInTheDocument();
    expect(screen.getByText("Delivery by Apr 2")).toBeInTheDocument();
  });
});
