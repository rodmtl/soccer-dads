import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToggleButton } from "@/components/ToggleButton";

describe("ToggleButton", () => {
  it("renders a button with aria-pressed reflecting the pressed prop", () => {
    render(
      <ToggleButton pressed onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reflects aria-pressed=false when not pressed", () => {
    render(
      <ToggleButton pressed={false} onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToggle when activated via keyboard", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ToggleButton pressed={false} onToggle={onToggle}>
        Confirm
      </ToggleButton>,
    );

    await user.tab();
    await user.keyboard("{Enter}");

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("does not call onToggle when disabled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ToggleButton pressed={false} onToggle={onToggle} disabled>
        Confirm
      </ToggleButton>,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
