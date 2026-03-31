import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceLocationMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();
const verifyOtpMock = vi.fn();
const setSessionMock = vi.fn();
const getSessionMock = vi.fn();
const readAuthReturnToMock = vi.fn();
const clearAuthReturnToMock = vi.fn();
const buildNativeAppUrlMock = vi.fn((path?: string) => `searchoutfit://${String(path ?? "").replace(/^\//, "")}`);

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSessionMock(...args),
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
      setSession: (...args: unknown[]) => setSessionMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  buildNativeAppUrl: (path?: string) => buildNativeAppUrlMock(path),
  readAuthReturnTo: () => readAuthReturnToMock(),
  clearAuthReturnTo: () => clearAuthReturnToMock(),
}));

const { default: AuthCallback } = await import("@/pages/AuthCallback");

describe("AuthCallback", () => {
  beforeEach(() => {
    replaceLocationMock.mockReset();
    navigateMock.mockReset();
    toastMock.mockReset();
    exchangeCodeForSessionMock.mockReset();
    verifyOtpMock.mockReset();
    setSessionMock.mockReset();
    getSessionMock.mockReset();
    readAuthReturnToMock.mockReset();
    clearAuthReturnToMock.mockReset();
    buildNativeAppUrlMock.mockClear();
    readAuthReturnToMock.mockReturnValue("/saved");
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });
    setSessionMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "session-token" } } });
    vi.stubGlobal("location", {
      ...window.location,
      hash: "",
      href: "http://localhost/auth/callback",
      replace: replaceLocationMock,
      search: "",
    });
  });

  it("verifies token-hash magic links before completing sign-in", async () => {
    window.history.replaceState({}, "", "/auth/callback?token_hash=hash-123&type=magiclink");
    vi.stubGlobal("location", {
      ...window.location,
      hash: "",
      href: "http://localhost/auth/callback?token_hash=hash-123&type=magiclink",
      replace: replaceLocationMock,
      search: "?token_hash=hash-123&type=magiclink",
    });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(buildNativeAppUrlMock).toHaveBeenCalledWith("/auth/callback?token_hash=hash-123&type=magiclink");
      expect(replaceLocationMock).toHaveBeenCalledWith("searchoutfit://auth/callback?token_hash=hash-123&type=magiclink");
    });
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("does not report success when the callback has no auth params or session", async () => {
    window.history.replaceState({}, "", "/auth/callback");
    getSessionMock.mockResolvedValue({ data: { session: null } });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: "Could not complete sign-in",
        variant: "destructive",
      }));
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("accepts hash-based access tokens before completing sign-in", async () => {
    window.history.replaceState({}, "", "/auth/callback#access_token=access-123&refresh_token=refresh-456");
    vi.stubGlobal("location", {
      ...window.location,
      hash: "#access_token=access-123&refresh_token=refresh-456",
      href: "http://localhost/auth/callback#access_token=access-123&refresh_token=refresh-456",
      replace: replaceLocationMock,
      search: "",
    });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(buildNativeAppUrlMock).toHaveBeenCalledWith("/auth/callback#access_token=access-123&refresh_token=refresh-456");
      expect(replaceLocationMock).toHaveBeenCalledWith("searchoutfit://auth/callback#access_token=access-123&refresh_token=refresh-456");
    });
    expect(setSessionMock).not.toHaveBeenCalled();
  });
});
