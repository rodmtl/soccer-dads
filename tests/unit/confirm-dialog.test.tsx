import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function TestHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open dialog
      </button>
      <ConfirmDialog
        isOpen={isOpen}
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
      />
    </div>
  );
}

describe("ConfirmDialog", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a labeled, described modal dialog when open", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Regenerate roster?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription(
      "This replaces the current team assignments.",
    );
  });

  it("moves focus to the cancel button on open", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByTestId("confirm-dialog-backdrop"));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when the confirm button is activated", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("traps Tab focus within the dialog's buttons", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen
        title="Regenerate roster?"
        description="This replaces the current team assignments."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Regenerate" });
    expect(cancelButton).toHaveFocus();

    await user.tab();
    expect(confirmButton).toHaveFocus();

    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  it("returns focus to the element that opened the dialog after it closes", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    const openButton = screen.getByRole("button", { name: "Open dialog" });
    await user.click(openButton);

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(openButton).toHaveFocus();
  });
});
