import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders a heading with the given title", () => {
    render(<EmptyState title="No players yet" />);

    expect(screen.getByRole("heading", { name: "No players yet" })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState
        title="No players yet"
        description="Ask your league organizer to add players."
      />,
    );

    expect(
      screen.getByText("Ask your league organizer to add players."),
    ).toBeInTheDocument();
  });

  it("does not render an action button when no action is provided", () => {
    render(<EmptyState title="No players yet" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders and wires up the action button when provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState title="No players yet" action={{ label: "Add player", onClick }} />,
    );

    await user.click(screen.getByRole("button", { name: "Add player" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
