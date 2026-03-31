import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag: string) =>
        ({ children, ...props }: Record<string, unknown>) => createElement(tag, props, children),
    },
  ),
}));

const { default: HowItWorks } = await import("@/components/HowItWorks");

describe("HowItWorks mini demos", () => {
  it("renders visible mini-demo overlays for each step", () => {
    render(<HowItWorks />);

    expect(screen.getByText("Paste URL")).toBeInTheDocument();
    expect(screen.getByText("Public post detected")).toBeInTheDocument();

    expect(screen.getByText("5 pieces detected")).toBeInTheDocument();
    expect(screen.getByText("Blazer")).toBeInTheDocument();
    expect(screen.getByText("Trousers")).toBeInTheDocument();

    expect(screen.getByText("Closest match")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(screen.getByText("Kohl's")).toBeInTheDocument();
  });
});
