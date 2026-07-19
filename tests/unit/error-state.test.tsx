import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "@/components/ErrorState";

describe("ErrorState", () => {
  it("renders the message inside an alert region", () => {
    render(<ErrorState message="Couldn't load players." retryLabel="Retry" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load players.");
  });

  it("does not render a retry button when onRetry is not provided", () => {
    render(<ErrorState message="Couldn't load players." retryLabel="Retry" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a retry button with the given label and calls onRetry when activated", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState
        message="Couldn't load players."
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
