import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("announces the given label once via a polite live region", () => {
    render(<LoadingSkeleton label="Loading…" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading…");
  });

  it("renders the default number of placeholder rows", () => {
    const { container } = render(<LoadingSkeleton label="Loading…" />);

    expect(container.querySelectorAll("[data-skeleton-row]")).toHaveLength(3);
  });

  it("renders the requested number of placeholder rows", () => {
    const { container } = render(<LoadingSkeleton label="Loading…" rows={6} />);

    expect(container.querySelectorAll("[data-skeleton-row]")).toHaveLength(6);
  });
});
