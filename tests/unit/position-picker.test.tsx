import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { PositionPicker } from "@/components/PositionPicker";
import type { Position } from "@/server/services/positions";

const messages = {
  Common: { saving: "Saving…" },
  Position: {
    goalkeeper: "Goalkeeper",
    defender: "Defender",
    midfielder: "Midfielder",
    striker: "Striker",
  },
};

const MAX_REACHED_MESSAGE = "You can choose up to 2 positions.";
const SELECTED_COUNT_MESSAGE = "0 of 2 selected";
const SAVE_ERROR_MESSAGE = "Couldn't update your positions.";

function renderPicker(
  props: Partial<React.ComponentProps<typeof PositionPicker>> = {},
) {
  const defaultProps: React.ComponentProps<typeof PositionPicker> = {
    selectedPositions: [],
    maxSelected: 2,
    maxReachedMessage: MAX_REACHED_MESSAGE,
    selectedCountMessage: SELECTED_COUNT_MESSAGE,
    saveErrorMessage: SAVE_ERROR_MESSAGE,
    isSaving: false,
    error: null,
    onToggle: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PositionPicker {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("PositionPicker", () => {
  it("renders the four positions in fixed order with distinct accessible names", () => {
    renderPicker();

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Goalkeeper",
      "Defender",
      "Midfielder",
      "Striker",
    ]);
  });

  it("marks selected positions as pressed via aria-pressed, not the accessible name", () => {
    renderPicker({ selectedPositions: ["defender"] });

    expect(screen.getByRole("button", { name: "Defender" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("always shows the caller-supplied persistent selected-count helper text", () => {
    renderPicker({ selectedPositions: ["defender"], selectedCountMessage: "1 of 2 selected" });

    expect(screen.getByText("1 of 2 selected")).toBeInTheDocument();
  });

  it("calls onToggle when tapping an unselected position under the max", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderPicker({ selectedPositions: ["defender"], onToggle });

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    expect(onToggle).toHaveBeenCalledWith("goalkeeper");
  });

  it("calls onToggle to deselect a pressed position even when at the max", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderPicker({ selectedPositions: ["defender", "midfielder"], onToggle });

    await user.click(screen.getByRole("button", { name: "Defender" }));

    expect(onToggle).toHaveBeenCalledWith("defender");
  });

  it("rejects tapping a 3rd unselected position: does not call onToggle, and announces the max-reached message", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderPicker({ selectedPositions: ["defender", "midfielder"], onToggle });

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    expect(onToggle).not.toHaveBeenCalled();
    const liveRegion = screen.getByText(MAX_REACHED_MESSAGE);
    expect(liveRegion.closest('[aria-live="polite"]')).toBeInTheDocument();
  });

  it("shows the caller-supplied role=alert save-error message when the error prop is set", () => {
    renderPicker({ error: new Error("save failed") });

    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_ERROR_MESSAGE);
  });

  it("does not show a save-error message when there is no error", () => {
    renderPicker({ error: null });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables all four buttons while saving, without removing them from the tab order", () => {
    renderPicker({ isSaving: true });

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toHaveAttribute("disabled");
    }
  });

  it("announces a saving message via an aria-live region while a save is in flight", () => {
    renderPicker({ isSaving: true });

    const savingMessage = screen.getByText("Saving…");
    expect(savingMessage.closest('[aria-live="polite"]')).toBeInTheDocument();
  });

  it("does not announce a saving message when no save is in flight", () => {
    renderPicker({ isSaving: false });

    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
  });

  it("disables only the positions listed in disabledPositions", () => {
    const disabledPositions: Position[] = ["goalkeeper"];
    renderPicker({ disabledPositions });

    expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Defender" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("supports Tab/Enter keyboard operation in the documented reading order", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderPicker({ onToggle });

    await user.tab();
    expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Defender" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith("defender");
  });
});
