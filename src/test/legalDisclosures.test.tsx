import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag: string) =>
        ({ children, ...props }: Record<string, unknown>) => createElement(tag, props, children),
    },
  ),
}));

vi.mock("@/components/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: App } = await import("@/App");
const { default: ComplianceSection } = await import("@/components/ComplianceSection");
const { default: Footer } = await import("@/components/Footer");
const { default: StyleBoardSection } = await import("@/components/StyleBoardSection");

describe("legal disclosures", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders footer links to privacy policy and terms", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
  });

  it("serves the privacy policy route", async () => {
    window.history.pushState({}, "", "/privacy");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(/We collect email auth data, analytics events, saved items, and submitted images/i)).toBeInTheDocument();
  });

  it("serves the terms route", async () => {
    window.history.pushState({}, "", "/terms");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Terms of Use" })).toBeInTheDocument();
    expect(screen.getByText(/You represent that you have the right or permission to submit any link, screenshot, or image/i)).toBeInTheDocument();
  });

  it("removes the compliance-safe claim and explains synced saved items", () => {
    render(<ComplianceSection />);

    expect(screen.queryByText(/Compliance-safe/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Signed-in saved items sync to your account/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated merchant badges and country preferences are best-effort signals/i)).toBeInTheDocument();
  });

  it("describes saved looks without claiming they only stay local", () => {
    render(<StyleBoardSection />);

    expect(screen.queryByText(/Saved locally — no account required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/everything lives locally on your device/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Save product matches to your style board and sync them when you sign in/i)).toBeInTheDocument();
  });
});
