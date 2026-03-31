import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAnalyticsSummaryMock = vi.fn();
const signInWithMagicLinkMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analytics")>("@/lib/analytics");
  return {
    ...actual,
    fetchAnalyticsSummary: (...args: unknown[]) => fetchAnalyticsSummaryMock(...args),
  };
});

const { useAuth } = await import("@/components/AuthProvider");
const { default: AnalyticsPage } = await import("@/pages/AnalyticsPage");

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/analytics"]}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AnalyticsPage", () => {
  beforeEach(() => {
    fetchAnalyticsSummaryMock.mockReset();
    signInWithMagicLinkMock.mockReset();
    signOutMock.mockReset();
  });

  it("shows a sign-in gate to signed-out users", () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      signInWithMagicLink: signInWithMagicLinkMock,
      signOut: signOutMock,
    });

    renderPage();

    expect(screen.getByText("Sign in to view analytics")).toBeInTheDocument();
  });

  it("renders event totals and market counts for signed-in users", async () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: {
        id: "user-1",
        email: "syam31158@gmail.com",
      } as never,
      signInWithMagicLink: signInWithMagicLinkMock,
      signOut: signOutMock,
    });

    fetchAnalyticsSummaryMock.mockResolvedValue({
      totals: {
        search_link_submitted: 18,
        screenshot_uploaded: 4,
        screenshot_pasted: 7,
        instagram_extract_succeeded: 9,
        analysis_completed: 16,
        product_results_loaded: 11,
      },
      last24h: {
        search_link_submitted: 3,
        screenshot_uploaded: 1,
        screenshot_pasted: 2,
        instagram_extract_succeeded: 2,
        analysis_completed: 3,
        product_results_loaded: 2,
      },
      topMarkets: [
        { market: "in", count: 12 },
        { market: "us", count: 5 },
      ],
      recentEvents: [
        {
          eventName: "analysis_completed",
          market: "in",
          createdAt: "2026-03-20T12:00:00.000Z",
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("18")).toBeInTheDocument();
    });

    expect(screen.getByText("Link submits")).toBeInTheDocument();
    expect(screen.getByText("Screenshot uploads")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("syam31158@gmail.com")).toBeInTheDocument();
    expect(fetchAnalyticsSummaryMock).toHaveBeenCalledTimes(1);
  });

  it("blocks non-admin signed-in users from loading analytics", async () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: {
        id: "user-2",
        email: "viewer@example.com",
      } as never,
      signInWithMagicLink: signInWithMagicLinkMock,
      signOut: signOutMock,
    });

    fetchAnalyticsSummaryMock.mockRejectedValue(new Error("Analytics access is restricted to the owner account."));

    renderPage();

    expect(await screen.findByText("Analytics access is restricted")).toBeInTheDocument();
    expect(screen.getByText("Sign in with the owner account to view SearchOutfit production analytics.")).toBeInTheDocument();
    expect(fetchAnalyticsSummaryMock).toHaveBeenCalledTimes(1);
  });
});
