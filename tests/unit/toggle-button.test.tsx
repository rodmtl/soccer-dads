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

  // docs/ux/02-player-attendance.md's accessibility section: "Focus stays on
  // the toggle button that was pressed through the save cycle (does not
  // jump away)." A native `disabled` button can never hold focus, so
  // disabled state must be conveyed via `aria-disabled` (which doesn't
  // remove the element from the tab order) instead, with the click handler
  // guarded to still be a no-op.
  it("uses aria-disabled rather than the native disabled attribute when disabled, so the button stays focusable", () => {
    render(
      <ToggleButton pressed={false} onToggle={() => {}} disabled>
        Confirm
      </ToggleButton>,
    );

    const button = screen.getByRole("button", { name: "Confirm" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
  });

  it("remains reachable via Tab when disabled (focus isn't lost mid-save)", async () => {
    const user = userEvent.setup();
    render(
      <ToggleButton pressed={false} onToggle={() => {}} disabled>
        Confirm
      </ToggleButton>,
    );

    await user.tab();

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
  });

  it("does not set aria-disabled when not disabled", () => {
    render(
      <ToggleButton pressed={false} onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  // docs/ux/design-tokens.md: "Visual 'selected' state must not rely on
  // color alone — pair with a checkmark glyph, filled vs. outlined style, or
  // equivalent text change." aria-pressed alone is invisible to a sighted
  // user, so the pressed state must be visually distinguishable too.
  it("renders a visible checkmark glyph when pressed, absent when not pressed", () => {
    const { rerender } = render(
      <ToggleButton pressed onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    expect(screen.getByText("✓")).toBeInTheDocument();

    rerender(
      <ToggleButton pressed={false} onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  // docs/ux/design-tokens.md: "3:1 minimum ... for UI component
  // boundaries/focus indicators." Phase 6 QA measured the unpressed state's
  // border-gray-300-on-white at ≈1.47:1 (fails); border-gray-500 measures
  // ≈4.84:1 against white (computed via the CSS Color 4 OKLCH→sRGB
  // conversion of Tailwind's actual token value, not eyeballed), clearing
  // the bar with margin. gray-400 (≈2.60:1) was checked and still fails.
  it("uses an unpressed border shade that clears the 3:1 UI-boundary contrast minimum against a white background", () => {
    render(
      <ToggleButton pressed={false} onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    const className = screen.getByRole("button", { name: "Confirm" }).className;
    expect(className).toContain("border-gray-500");
    expect(className).not.toContain("border-gray-300");
    expect(className).not.toContain("border-gray-400");
  });

  it("renders visually distinct styling when pressed vs. not pressed", () => {
    const { rerender } = render(
      <ToggleButton pressed onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );
    const pressedClassName = screen.getByRole("button", { name: "Confirm" }).className;

    rerender(
      <ToggleButton pressed={false} onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );
    const unpressedClassName = screen.getByRole("button", { name: "Confirm" }).className;

    expect(pressedClassName).not.toBe(unpressedClassName);
  });

  it("the checkmark glyph is hidden from assistive tech (accessible name stays just the label)", () => {
    render(
      <ToggleButton pressed onToggle={() => {}}>
        Confirm
      </ToggleButton>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByText("✓")).toHaveAttribute("aria-hidden", "true");
  });
});
