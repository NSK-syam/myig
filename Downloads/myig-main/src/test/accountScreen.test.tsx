import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
  user: null as null | { email?: string | null; id: string },
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    deleteAccount: authState.deleteAccount,
    loading: false,
    session: null,
    signInWithMagicLink: authState.signInWithMagicLink,
    signOut: authState.signOut,
    user: authState.user,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import AccountScreen from "@/components/app/AccountScreen";

function renderAccountScreen() {
  return render(
    <MemoryRouter>
      <AccountScreen />
    </MemoryRouter>,
  );
}

describe("AccountScreen", () => {
  beforeEach(() => {
    authState.deleteAccount.mockReset();
    authState.signInWithMagicLink.mockReset();
    authState.signOut.mockReset();
    authState.user = null;
  });

  it("shows sign-in guidance and legal links for guests", () => {
    renderAccountScreen();

    expect(screen.getAllByText(/sign in to sync saved items and unlock unlimited searches/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /terms of use/i })).toHaveAttribute("href", "/terms");
  });

  it("shows account actions for signed-in users", async () => {
    authState.user = {
      email: "stylist@example.com",
      id: "user-123",
    };

    renderAccountScreen();

    expect(screen.getAllByText("stylist@example.com").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(authState.signOut).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete account/i }));
    expect(authState.deleteAccount).toHaveBeenCalledTimes(1);
  });
});
