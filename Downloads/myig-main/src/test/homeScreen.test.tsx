import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Index from "@/pages/Index";

const navigateMock = vi.fn();
const analyzeOutfitFromImageUrlMock = vi.fn();
const analyzeOutfitFromBase64Mock = vi.fn();
const extractInstagramImagesMock = vi.fn();
const trackAnalyticsEventMock = vi.fn();
const toastMock = vi.fn();

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

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    loading: false,
    session: null,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    user: null,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => toastMock(...args),
  }),
}));

vi.mock("@/hooks/use-search-access", () => ({
  useSearchAccess: () => ({
    consumeLocalGuestSearch: vi.fn(),
    consumeSignedInSearch: vi.fn(),
    refresh: vi.fn(),
    remainingSearches: 3,
    resetAccessState: vi.fn(),
    state: { reason: "guest_remaining", status: "allowed" },
    usage: {
      guestSearchesUsed: 0,
      hasActiveSubscription: false,
      isSignedIn: false,
      signedInSearchesUsed: 0,
    },
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
    analyzeOutfitFromBase64: (...args: unknown[]) => analyzeOutfitFromBase64Mock(...args),
    analyzeOutfitFromImageUrl: (...args: unknown[]) => analyzeOutfitFromImageUrlMock(...args),
    extractInstagramImages: (...args: unknown[]) => extractInstagramImagesMock(...args),
  };
});

function renderIndex() {
  return render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>,
  );
}

describe("Index mobile home screen", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    analyzeOutfitFromBase64Mock.mockReset();
    analyzeOutfitFromImageUrlMock.mockReset();
    extractInstagramImagesMock.mockReset();
    trackAnalyticsEventMock.mockReset();
    toastMock.mockReset();
    window.localStorage.clear();
  });

  it("renders the restored premium homepage hero with link and upload entry points", () => {
    renderIndex();

    expect(screen.getByRole("heading", { name: /find the exact look you saw/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste any image URL or Instagram link...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /find the look/i })).toBeInTheDocument();
    expect(screen.getByText(/drop screenshot here/i)).toBeInTheDocument();
    expect(screen.getByLabelText("SearchOutfit mobile preview")).toBeInTheDocument();
  });

  it("keeps the mobile hero preview stable instead of auto-sliding", () => {
    vi.useFakeTimers();
    renderIndex();

    expect(screen.getAllByAltText("Street style outfit with neutral tones, blazer and wide-leg trousers")).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getAllByAltText("Street style outfit with neutral tones, blazer and wide-leg trousers")).toHaveLength(2);
    expect(
      screen.queryByAltText("Elegant pink flowing midi dress in Mediterranean garden"),
    ).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("re-resolves the selected Instagram carousel photo and analyzes it directly by base64", async () => {
    extractInstagramImagesMock
      .mockResolvedValueOnce({
        images: [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
        ],
        imageBase64: "base64-first-photo",
        caption: "carousel caption",
      })
      .mockResolvedValueOnce({
        images: [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2-proxied.jpg",
        ],
        imageBase64: "base64-second-photo",
        caption: "carousel caption",
      });
    analyzeOutfitFromBase64Mock.mockResolvedValue({
      items: [],
      overall_style: "minimal",
      occasion: "casual",
      season: "spring",
      total_items: 0,
      confidence_score: 88,
      detected_brand: "",
      brand_domain: "",
      brand_direct_url: "",
      celebrity_name: "",
      celebrity_brand: "",
    });

    renderIndex();

    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/CAROUSEL123/" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find the look/i }));

    expect(await screen.findByRole("heading", { name: /choose the photo to analyze/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /analyze photo 2/i }));

    await waitFor(() => {
      expect(extractInstagramImagesMock).toHaveBeenNthCalledWith(2, "https://www.instagram.com/p/CAROUSEL123/?img_index=2");
      expect(analyzeOutfitFromBase64Mock).toHaveBeenCalledWith("base64-second-photo");
      expect(navigateMock).toHaveBeenCalledWith("/results", expect.objectContaining({
        state: expect.objectContaining({
          imageUrl: "https://cdn.example.com/look-2-proxied.jpg",
          source: "https://www.instagram.com/p/CAROUSEL123/?img_index=2",
        }),
      }));
    });

    expect(analyzeOutfitFromImageUrlMock).not.toHaveBeenCalled();
  });

  it("analyzes the selected Instagram carousel photo from the extracted image list when re-extraction fails", async () => {
    extractInstagramImagesMock
      .mockResolvedValueOnce({
        images: [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
        ],
        imageBase64: "base64-first-photo",
        caption: "carousel caption",
      })
      .mockRejectedValueOnce(new Error("Failed to send a request to the Edge Function"));
    analyzeOutfitFromImageUrlMock.mockResolvedValue({
      items: [],
      overall_style: "minimal",
      occasion: "casual",
      season: "spring",
      total_items: 0,
      confidence_score: 88,
      detected_brand: "",
      brand_domain: "",
      brand_direct_url: "",
      celebrity_name: "",
      celebrity_brand: "",
    });

    renderIndex();

    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/p/CAROUSEL123/" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find the look/i }));

    expect(await screen.findByRole("heading", { name: /choose the photo to analyze/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /analyze photo 2/i }));

    await waitFor(() => {
      expect(analyzeOutfitFromImageUrlMock).toHaveBeenCalledWith("https://cdn.example.com/look-2.jpg");
      expect(navigateMock).toHaveBeenCalledWith("/results", expect.objectContaining({
        state: expect.objectContaining({
          imageUrl: "https://cdn.example.com/look-2.jpg",
          source: "https://www.instagram.com/p/CAROUSEL123/?img_index=2",
        }),
      }));
    });
  });

  it("shows the friendly Instagram extraction error instead of a generic edge-function failure", async () => {
    extractInstagramImagesMock.mockRejectedValue(
      new Error("Could not extract images from this Instagram post. Please try uploading a screenshot instead."),
    );

    renderIndex();

    fireEvent.change(screen.getByPlaceholderText("Paste any image URL or Instagram link..."), {
      target: { value: "https://www.instagram.com/reel/ABC123/" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find the look/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: "Analysis Failed",
        description: "Could not extract images from this Instagram post. Please try uploading a screenshot instead.",
        variant: "destructive",
      }));
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
