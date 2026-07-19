import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameDetailContainer } from "@/components/GameDetailContainer";
import { getGameAttendance } from "@/server/actions/getGameAttendance";
import { setAttendance } from "@/server/actions/setAttendance";

vi.mock("@/server/actions/getGameAttendance", () => ({
  getGameAttendance: vi.fn(),
}));
vi.mock("@/server/actions/setAttendance", () => ({
  setAttendance: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="locale-aware-link">
      {children}
    </a>
  ),
}));

const messages = {
  Common: { loading: "Loading…", retry: "Retry", saving: "Saving…" },
  Games: {
    gameNotFound: "This game couldn't be found.",
    backToList: "Back to games",
  },
  Attendance: {
    pageTitle: "Game at {locationName}",
    confirmButton: "I'm in",
    declineButton: "Can't make it",
    saved: "Saved",
    saveError: "Couldn't save your response.",
    gameNotFoundOrLoadError: "Couldn't load this game. Try again.",
  },
};

const gameDetails = {
  id: "g1",
  date: "2026-07-20",
  time: "1970-01-01T18:00:00.000Z",
  locationName: "Parque Central",
  address: "123 Main St",
};

function renderContainer(props: Partial<React.ComponentProps<typeof GameDetailContainer>> = {}) {
  const defaultProps: React.ComponentProps<typeof GameDetailContainer> = {
    gameId: "g1",
    playerId: "player-1",
    onInvalidPlayer: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GameDetailContainer {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("GameDetailContainer", () => {
  afterEach(() => {
    vi.mocked(getGameAttendance).mockReset();
    vi.mocked(setAttendance).mockReset();
  });

  it("shows loading then the game's details and current status", async () => {
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: { game: gameDetails, status: "confirmed" },
    });

    renderContainer();

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Game at Parque Central" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the not-found state with no retry when the game genuinely doesn't exist", async () => {
    vi.mocked(getGameAttendance).mockResolvedValue({ ok: false, reason: "not_found" });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("This game couldn't be found."),
    );
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    // Uses next-intl's locale-aware Link (client-side navigation, no full
    // page reload) rather than a plain <a>/window.location navigation.
    expect(screen.getByTestId("locale-aware-link")).toHaveAttribute("href", "/games");
    expect(screen.getByRole("link", { name: "Back to games" })).toBeInTheDocument();
  });

  it("shows a generic retryable error state when the game fetch fails for a genuinely unexpected reason", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameAttendance)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true, data: { game: gameDetails, status: "no_response" } });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load this game. Try again.")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Game at Parque Central" }),
      ).toBeInTheDocument(),
    );
  });

  it("calls onInvalidPlayer instead of showing an error when the result reports an invalid player", async () => {
    const onInvalidPlayer = vi.fn();
    vi.mocked(getGameAttendance).mockResolvedValue({ ok: false, reason: "invalid_player" });

    renderContainer({ onInvalidPlayer });

    await waitFor(() => expect(onInvalidPlayer).toHaveBeenCalledOnce());
  });

  it("optimistically confirms attendance, marks toggles non-interactive while saving, and re-enables on success", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: { game: gameDetails, status: "no_response" },
    });
    let resolveSave: (value: { ok: true; data: { status: "confirmed" } }) => void = () => {};
    vi.mocked(setAttendance).mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "I'm in" }));

    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    resolveSave({ ok: true, data: { status: "confirmed" } });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      ),
    );
  });

  it("reverts to the last known-good status and shows a save error on failure", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: { game: gameDetails, status: "no_response" },
    });
    vi.mocked(setAttendance).mockRejectedValue(new Error("save failed"));

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "I'm in" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("retries the same status change when the save-error retry is activated", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: { game: gameDetails, status: "no_response" },
    });
    vi.mocked(setAttendance)
      .mockRejectedValueOnce(new Error("save failed"))
      .mockResolvedValueOnce({ ok: true, data: { status: "confirmed" } });

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "I'm in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(setAttendance).toHaveBeenLastCalledWith("g1", "player-1", "confirmed");
  });

  it("reverts to no_response when the currently confirmed toggle is tapped again", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: { game: gameDetails, status: "confirmed" },
    });
    vi.mocked(setAttendance).mockResolvedValue({ ok: true, data: { status: "no_response" } });

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );

    await user.click(screen.getByRole("button", { name: "I'm in" }));

    expect(setAttendance).toHaveBeenCalledWith("g1", "player-1", "no_response");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
  });

  it("calls onInvalidPlayer instead of showing a save error when a save reports an invalid player", async () => {
    const user = userEvent.setup();
    const onInvalidPlayer = vi.fn();
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: { game: gameDetails, status: "no_response" },
    });
    vi.mocked(setAttendance).mockResolvedValue({ ok: false, reason: "invalid_player" });

    renderContainer({ onInvalidPlayer });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "I'm in" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "I'm in" }));

    await waitFor(() => expect(onInvalidPlayer).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
