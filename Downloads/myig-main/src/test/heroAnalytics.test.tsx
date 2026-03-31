import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const toastMock = vi.fn();
const trackAnalyticsEventMock = vi.fn();
const analyzeOutfitFromImageUrlMock = vi.fn();
const analyzeOutfitFromImageMock = vi.fn();
const analyzeOutfitFromBase64Mock = vi.fn();
const extractInstagramImagesMock = vi.fn();
const uploadImageToStorageMock = vi.fn();

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag: string) =>
        ({ children, ...props }: Record<string, unknown>) => createElement(tag, props, children),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => trackAnalyticsEventMock(...args),
  fireAndForgetAnalyticsEvent: (...args: unknown[]) => trackAnalyticsEventMock(...args),
}));

vi.mock("@/lib/outfitApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/outfitApi")>("@/lib/outfitApi");
  return {
    ...actual,
    analyzeOutfitFromImageUrl: (...args: unknown[]) => analyzeOutfitFromImageUrlMock(...args),
    analyzeOutfitFromImage: (...args: unknown[]) => analyzeOutfitFromImageMock(...args),
    analyzeOutfitFromBase64: (...args: unknown[]) => analyzeOutfitFromBase64Mock(...args),
    extractInstagramImages: (...args: unknown[]) => extractInstagramImagesMock(...args),
    uploadImageToStorage: (...args: unknown[]) => uploadImageToStorageMock(...args),
  };
});

const { default: HeroSection } = await import("@/components/HeroSection");

const analysis = {
  items: [
    {
      name: "Urban Warrior Oversized T-Shirt",
      category: "tops",
      color: "black",
      material: "polyester",
      style: "oversized",
      brand: "TSS Originals",
      brand_guess: "",
      price_estimate: "$35",
      confidence: "high" as const,
      search_query: "TSS Originals Urban Warrior Oversized T-Shirt",
      shopping_links: [],
    },
  ],
  overall_style: "Urban streetwear with oversized graphic tees and relaxed denim",
  occasion: "Casual everyday wear",
  season: "Spring/Summer/Fall",
  total_items: 1,
  confidence_score: 85,
  detected_brand: "TSS Originals",
  brand_domain: "thesouledstore.com",
  brand_direct_url: "https://www.thesouledstore.com/",
  celebrity_name: "",
  celebrity_brand: "",
};

describe("HeroSection analytics", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    trackAnalyticsEventMock.mockReset();
    analyzeOutfitFromImageUrlMock.mockReset();
    analyzeOutfitFromImageMock.mockReset();
    analyzeOutfitFromBase64Mock.mockReset();
    extractInstagramImagesMock.mockReset();
    uploadImageToStorageMock.mockReset();
    window.localStorage.clear();
  });

  it("tracks direct link submissions and completed analyses", async () => {
    analyzeOutfitFromImageUrlMock.mockResolvedValue(analysis);

    const { container } = render(<HeroSection />);
    expect(screen.getByText(/By submitting a link or screenshot, you confirm you have the rights or permission to use that content/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://example.com/look.jpg" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(trackAnalyticsEventMock).toHaveBeenCalledWith("search_link_submitted", expect.objectContaining({
        market: "us",
        metadata: expect.objectContaining({
          sourceType: "image_url",
        }),
      }));
    });

    await waitFor(() => {
      expect(trackAnalyticsEventMock).toHaveBeenCalledWith("analysis_completed", expect.objectContaining({
        market: "us",
        metadata: expect.objectContaining({
          sourceType: "image_url",
          totalItems: 1,
        }),
      }));
    });
  });

  it("tracks successful Instagram extraction before analysis completes", async () => {
    extractInstagramImagesMock.mockResolvedValue({
      images: ["https://cdn.example.com/look.jpg"],
      imageBase64: "ZmFrZQ==",
      caption: "summer look",
    });
    analyzeOutfitFromBase64Mock.mockResolvedValue(analysis);

    const { container } = render(<HeroSection />);
    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/ABC123/" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(trackAnalyticsEventMock).toHaveBeenCalledWith("instagram_extract_succeeded", expect.objectContaining({
        market: "us",
        metadata: expect.objectContaining({
          imageCount: 1,
        }),
      }));
    });

    await waitFor(() => {
      expect(trackAnalyticsEventMock).toHaveBeenCalledWith("analysis_completed", expect.objectContaining({
        metadata: expect.objectContaining({
          sourceType: "instagram_url",
        }),
      }));
    });
  });

  it("lets the user choose which Instagram photo to analyze and re-extracts later slides directly to base64", async () => {
    extractInstagramImagesMock.mockResolvedValue({
      images: [
        "https://cdn.example.com/look-1.jpg",
        "https://cdn.example.com/look-2.jpg",
      ],
      imageBase64: "ZmFrZQ==",
      caption: "summer look",
    });
    extractInstagramImagesMock.mockResolvedValueOnce({
      images: [
        "https://cdn.example.com/look-1.jpg",
        "https://cdn.example.com/look-2.jpg",
      ],
      imageBase64: "ZmFrZQ==",
      caption: "summer look",
    });
    extractInstagramImagesMock.mockResolvedValueOnce({
      images: [
        "https://cdn.example.com/look-1.jpg",
        "https://cdn.example.com/look-2-proxied.jpg",
      ],
      imageBase64: "base64-photo-2",
      caption: "summer look",
    });
    analyzeOutfitFromBase64Mock.mockResolvedValue(analysis);

    const { container } = render(<HeroSection />);
    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/CAROUSEL123/" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await screen.findByRole("heading", { name: "Choose the photo to analyze" });
    expect(analyzeOutfitFromBase64Mock).not.toHaveBeenCalled();
    expect(analyzeOutfitFromImageUrlMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Analyze photo 2" }));

    await waitFor(() => {
      expect(extractInstagramImagesMock).toHaveBeenNthCalledWith(2, "https://www.instagram.com/p/CAROUSEL123/?img_index=2");
      expect(analyzeOutfitFromBase64Mock).toHaveBeenCalledWith("base64-photo-2");
      expect(navigateMock).toHaveBeenCalledWith("/results", expect.objectContaining({
        state: expect.objectContaining({
          imageUrl: "https://cdn.example.com/look-2-proxied.jpg",
          source: "https://www.instagram.com/p/CAROUSEL123/?img_index=2",
        }),
      }));
    });

    expect(analyzeOutfitFromImageUrlMock).not.toHaveBeenCalled();
  });

  it("automatically analyzes the requested carousel photo when img_index is present", async () => {
    extractInstagramImagesMock.mockResolvedValue({
      images: [
        "https://cdn.example.com/look-1.jpg",
        "https://cdn.example.com/look-2.jpg",
        "https://cdn.example.com/look-3.jpg",
      ],
      imageBase64: "ZmFrZQ==",
      caption: "summer look",
    });
    analyzeOutfitFromImageUrlMock.mockResolvedValue(analysis);

    const { container } = render(<HeroSection />);
    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/CAROUSEL123/?img_index=2" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(analyzeOutfitFromImageUrlMock).toHaveBeenCalledWith("https://cdn.example.com/look-2.jpg");
    });

    expect(screen.queryByRole("heading", { name: "Choose the photo to analyze" })).not.toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith("/results", expect.objectContaining({
      state: expect.objectContaining({
        imageUrl: "https://cdn.example.com/look-2.jpg",
      }),
    }));
  });

  it("clears a stale Instagram chooser immediately when a new URL is submitted", async () => {
    let resolveSecondExtraction: ((value: {
      images: string[];
      imageBase64?: string;
      caption?: string;
    }) => void) | null = null;

    extractInstagramImagesMock
      .mockResolvedValueOnce({
        images: [
          "https://cdn.example.com/old-1.jpg",
          "https://cdn.example.com/old-2.jpg",
        ],
        imageBase64: "old-base64",
        caption: "old carousel",
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondExtraction = resolve;
          }),
      );

    const { container } = render(<HeroSection />);
    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/OLDCAROUSEL/" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("heading", { name: "Choose the photo to analyze" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/NEWCAROUSEL/" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(screen.queryByRole("heading", { name: "Choose the photo to analyze" })).not.toBeInTheDocument();

    resolveSecondExtraction?.({
      images: ["https://cdn.example.com/new-1.jpg"],
      imageBase64: "new-base64",
      caption: "new carousel",
    });
    analyzeOutfitFromBase64Mock.mockResolvedValue(analysis);

    await waitFor(() => {
      expect(analyzeOutfitFromBase64Mock).toHaveBeenCalledWith("new-base64");
    });
  });

  it("tracks uploaded and pasted screenshots", async () => {
    uploadImageToStorageMock.mockResolvedValue("https://cdn.example.com/uploaded.jpg");
    analyzeOutfitFromImageMock.mockResolvedValue(analysis);

    const file = new File(["fake-image"], "outfit.png", { type: "image/png" });

    const { container, rerender } = render(<HeroSection />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(trackAnalyticsEventMock).toHaveBeenCalledWith("screenshot_uploaded", expect.objectContaining({
        market: "us",
        metadata: expect.objectContaining({
          fileType: "image/png",
        }),
      }));
    });

    trackAnalyticsEventMock.mockClear();
    uploadImageToStorageMock.mockResolvedValue("https://cdn.example.com/pasted.jpg");
    analyzeOutfitFromImageMock.mockResolvedValue(analysis);

    rerender(<HeroSection />);
    fireEvent.paste(container.querySelector("section")!, {
      clipboardData: {
        items: [
          {
            type: "image/png",
            getAsFile: () => file,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(trackAnalyticsEventMock).toHaveBeenCalledWith("screenshot_pasted", expect.objectContaining({
        market: "us",
        metadata: expect.objectContaining({
          fileType: "image/png",
        }),
      }));
    });
  });
});
