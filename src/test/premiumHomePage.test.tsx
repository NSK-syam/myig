import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Index from "@/pages/Index";
import PremiumHomePage from "@/components/app/PremiumHomePage";

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

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  fireAndForgetAnalyticsEvent: vi.fn(),
}));

vi.mock("@/lib/outfitApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/outfitApi")>("@/lib/outfitApi");
  return {
    ...actual,
    analyzeOutfitFromBase64: vi.fn(),
    analyzeOutfitFromImage: vi.fn(),
    analyzeOutfitFromImageUrl: vi.fn(),
    extractInstagramImages: vi.fn(),
    uploadBase64ToStorage: vi.fn(),
    uploadImageToStorage: vi.fn(),
  };
});

describe("PremiumHomePage", () => {
  it("renders the restored premium homepage sections", () => {
    render(
      <MemoryRouter>
        <PremiumHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /find the exact look you saw/i })).toBeInTheDocument();
    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /save looks, shop later/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /transparent/i })).toBeInTheDocument();
  });

  it("uses the premium homepage on the default route", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
    expect(screen.queryByText(/what ships in v1/i)).not.toBeInTheDocument();
  });

  it("keeps the hero-to-how-it-works spacing tight on desktop", () => {
    const { container } = render(
      <MemoryRouter>
        <PremiumHomePage />
      </MemoryRouter>,
    );

    const heroSection = container.querySelector("section");
    const howItWorksSection = container.querySelector("#how-it-works");

    expect(heroSection?.className).toContain("md:pb-8");
    expect(howItWorksSection?.className).toContain("md:pt-16");
  });
});
