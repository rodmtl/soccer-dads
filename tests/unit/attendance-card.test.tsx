import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceCard } from "@/components/AttendanceCard";

const messages = {
  Common: { loading: "Loading…", retry: "Retry", saving: "Saving…" },
  Attendance: {
    pageTitle: "Game at {locationName}",
    confirmButton: "I'm in",
    declineButton: "Can't make it",
    saved: "Saved",
    saveError: "Couldn't save your response.",
  },
};

const game = {
  id: "g1",
  date: "2026-07-20",
  time: "1970-01-01T18:00:00.000Z",
  locationName: "Parque Central",
  address: "123 Main St",
};

function renderCard(props: Partial<React.ComponentProps<typeof AttendanceCard>> = {}) {
  const defaultProps: React.ComponentProps<typeof AttendanceCard> = {
    game,
    attendanceStatus: "no_response",
    isSaving: false,
    error: null,
    onConfirm: vi.fn(),
    onDecline: vi.fn(),
    onRetry: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AttendanceCard {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("AttendanceCard", () => {
  it("renders the page heading using the game's location name", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "Game at Parque Central" }),
    ).toBeInTheDocument();
  });

  it("renders the game's address as plain text (admin-entered, not translated)", () => {
    renderCard();

    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("renders the game's date and time formatted per-locale, not the raw stored value", () => {
    renderCard();

    expect(screen.getByText(/July 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/6:00 PM/)).toBeInTheDocument();
  });

  it("presses neither toggle when status is no_response", () => {
    renderCard({ attendanceStatus: "no_response" });

    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Can't make it" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("presses only 'I'm in' when confirmed", () => {
    renderCard({ attendanceStatus: "confirmed" });

    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Can't make it" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders the active and inactive toggle with visibly distinct styling, not just aria-pressed", () => {
    renderCard({ attendanceStatus: "confirmed" });

    const confirmButton = screen.getByRole("button", { name: "I'm in" });
    const declineButton = screen.getByRole("button", { name: "Can't make it" });

    expect(confirmButton.className).not.toBe(declineButton.className);
    expect(within(confirmButton).getByText("✓")).toBeInTheDocument();
    expect(within(declineButton).queryByText("✓")).not.toBeInTheDocument();
  });

  it("presses only 'Can't make it' when declined", () => {
    renderCard({ attendanceStatus: "declined" });

    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Can't make it" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onConfirm when 'I'm in' is activated", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderCard({ onConfirm });

    await user.click(screen.getByRole("button", { name: "I'm in" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onDecline when 'Can't make it' is activated", async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();
    renderCard({ onDecline });

    await user.click(screen.getByRole("button", { name: "Can't make it" }));

    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("marks both toggles non-interactive (via aria-disabled, not native disabled) and shows a saving indicator while isSaving", () => {
    renderCard({ isSaving: true });

    // aria-disabled (not the native `disabled` attribute) so the toggle
    // that was just pressed keeps focus through the save cycle — see
    // docs/ux/02-player-attendance.md's accessibility section.
    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Can't make it" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows an alert with a retry button when saving failed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderCard({ error: new Error("boom"), onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your response.");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  describe("save confirmation", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows 'Saved' once isSaving transitions from true to false with no error", () => {
      const { rerender } = renderCard({ isSaving: true });
      rerender(
        <NextIntlClientProvider locale="en" messages={messages}>
          <AttendanceCard
            game={game}
            attendanceStatus="confirmed"
            isSaving={false}
            error={null}
            onConfirm={vi.fn()}
            onDecline={vi.fn()}
            onRetry={vi.fn()}
          />
        </NextIntlClientProvider>,
      );

      expect(screen.getByText("Saved")).toBeInTheDocument();
    });

    it("clears the 'Saved' message after a few seconds", () => {
      const { rerender } = renderCard({ isSaving: true });
      rerender(
        <NextIntlClientProvider locale="en" messages={messages}>
          <AttendanceCard
            game={game}
            attendanceStatus="confirmed"
            isSaving={false}
            error={null}
            onConfirm={vi.fn()}
            onDecline={vi.fn()}
            onRetry={vi.fn()}
          />
        </NextIntlClientProvider>,
      );

      expect(screen.getByText("Saved")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });
  });
});
