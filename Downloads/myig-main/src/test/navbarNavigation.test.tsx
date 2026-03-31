import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Navbar from "@/components/Navbar";

const authState = vi.hoisted(() => ({
  signOut: vi.fn(),
  user: null as null | { email?: string | null; id: string },
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    loading: false,
    session: null,
    signInWithMagicLink: vi.fn(),
    signOut: authState.signOut,
    user: authState.user,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Navbar navigation", () => {
  it("links back to the homepage sections from non-home routes", () => {
    render(
      <MemoryRouter initialEntries={["/account"]}>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /go to searchoutfit home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("href", "/#discover");
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/#how-it-works");
    expect(screen.getByRole("link", { name: "Outfit Detail" })).toHaveAttribute("href", "/#products");
  });
});
