import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RosterContainer } from "@/components/RosterContainer";
import { getGameRoster } from "@/server/actions/getGameRoster";

vi.mock("@/server/actions/getGameRoster", () => ({
  getGameRoster: vi.fn(),
}));

const messages = {
  Common: { loading: "Loading…", retry: "Retry" },
  Roster: {
    loadError: "Couldn't load the roster. Try again.",
    notGeneratedTitle: "Teams haven't been announced yet",
    notGeneratedDescription: "Check back closer to game day.",
    teamHeading: "Team {number}",
    youBadge: "You",
  },
  Position: {
    goalkeeper: "Goalkeeper",
    defender: "Defender",
    midfielder: "Midfielder",
    striker: "Striker",
  },
};

function renderContainer(props: Partial<React.ComponentProps<typeof RosterContainer>> = {}) {
  const defaultProps: React.ComponentProps<typeof RosterContainer> = {
    gameId: "g1",
    playerId: "player-1",
    onInvalidPlayer: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RosterContainer {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("RosterContainer", () => {
  afterEach(() => {
    vi.mocked(getGameRoster).mockReset();
  });

  it("shows loading then the fetched roster", async () => {
    vi.mocked(getGameRoster).mockResolvedValue({
      ok: true,
      data: {
        teams: [
          {
            teamIndex: 0,
            players: [{ id: "p1", name: "Sam Ortiz", assignedPosition: "goalkeeper" }],
          },
        ],
      },
    });

    renderContainer();

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Team 1" })).toBeInTheDocument(),
    );
    expect(screen.getByText("Sam Ortiz")).toBeInTheDocument();
  });

  it("shows the not-generated-yet empty state when there are no team assignments", async () => {
    vi.mocked(getGameRoster).mockResolvedValue({
      ok: true,
      data: { teams: [{ teamIndex: 0, players: [] }, { teamIndex: 1, players: [] }] },
    });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByText("Teams haven't been announced yet")).toBeInTheDocument(),
    );
  });

  it("shows a retryable error state when the fetch rejects", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameRoster)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        data: { teams: [{ teamIndex: 0, players: [] }] },
      });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load the roster. Try again.")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("Teams haven't been announced yet")).toBeInTheDocument(),
    );
    expect(getGameRoster).toHaveBeenCalledTimes(2);
  });

  it("calls onInvalidPlayer instead of showing an error when the result reports an invalid player", async () => {
    const onInvalidPlayer = vi.fn();
    vi.mocked(getGameRoster).mockResolvedValue({ ok: false, reason: "invalid_player" });

    renderContainer({ onInvalidPlayer });

    await waitFor(() => expect(onInvalidPlayer).toHaveBeenCalledOnce());
  });

  it("shows a retryable error state (not a silent blank tab) when the game is not found, e.g. deleted mid-session", async () => {
    const user = userEvent.setup();
    vi.mocked(getGameRoster)
      .mockResolvedValueOnce({ ok: false, reason: "not_found" })
      .mockResolvedValueOnce({
        ok: true,
        data: { teams: [{ teamIndex: 0, players: [] }] },
      });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load the roster. Try again.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("Teams haven't been announced yet")).toBeInTheDocument(),
    );
    expect(getGameRoster).toHaveBeenCalledTimes(2);
  });

  it("passes the current player id through so their own row can be highlighted", async () => {
    vi.mocked(getGameRoster).mockResolvedValue({
      ok: true,
      data: {
        teams: [
          {
            teamIndex: 0,
            players: [{ id: "player-1", name: "Jordan Lee", assignedPosition: "defender" }],
          },
        ],
      },
    });

    renderContainer({ playerId: "player-1" });

    await waitFor(() => expect(screen.getByText("Jordan Lee")).toBeInTheDocument());
    expect(screen.getByText("You")).toBeInTheDocument();
  });
});
