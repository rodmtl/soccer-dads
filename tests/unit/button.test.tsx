import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("renders a native button with the given accessible name", () => {
    render(<Button variant="primary">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClick when activated", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps visible text as the accessible name while isLoading", () => {
    render(
      <Button variant="primary" isLoading>
        Saving…
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
  });

  it("disables the button and removes it from interaction when disabled", () => {
    render(
      <Button variant="primary" disabled>
        Save
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
