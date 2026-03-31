import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Navbar from "@/components/Navbar";

const authStateMock = vi.fn();

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

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => authStateMock(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Navbar", () => {
  it("uses the premium marketing navigation on the homepage", () => {
    authStateMock.mockReturnValue({
      loading: false,
      signOut: vi.fn(),
      user: null,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /go to searchoutfit home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /discover/i })).toHaveAttribute("href", "#discover");
    expect(screen.getByRole("link", { name: /^search$/i })).toHaveAttribute("href", "#how-it-works");
    expect(screen.getByRole("link", { name: /outfit detail/i })).toHaveAttribute("href", "#products");
    expect(screen.getByRole("button", { name: /saved/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^account$/i })).not.toBeInTheDocument();
  });

  it("keeps the utility account controls on inner pages", () => {
    authStateMock.mockReturnValue({
      loading: false,
      signOut: vi.fn(),
      user: { email: "syam31158@gmail.com" },
    });

    render(
      <MemoryRouter initialEntries={["/saved"]}>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^search$/i })).toHaveAttribute("href", "/#how-it-works");
  });
});
