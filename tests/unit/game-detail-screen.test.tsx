import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameDetailScreen } from "@/components/GameDetailScreen";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";
import { getGameAttendance } from "@/server/actions/getGameAttendance";
import { listPlayers } from "@/server/actions/listPlayers";

vi.mock("@/server/actions/getGameAttendance", () => ({
  getGameAttendance: vi.fn(),
}));
vi.mock("@/server/actions/listPlayers", () => ({
  listPlayers: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const messages = {
  Common: { loading: "Loading…", retry: "Retry", saving: "Saving…" },
  PlayerIdentity: {
    title: "Who are you?",
    searchLabel: "Search your name",
    noSearchMatches: "No players match '{query}'",
    noPlayersTitle: "No players yet",
    noPlayersDescription: "Ask your league organizer to add players before you can join a game.",
    loadError: "Couldn't load players. Try again.",
  },
  Games: {
    gameNotFound: "This game couldn't be found.",
    backToList: "Back to games",
  },
  Attendance: {
    pageTitle: "Game at {locationName}",
    detailsTab: "Details & Attendance",
    rosterTab: "Roster",
    confirmButton: "I'm in",
    declineButton: "Can't make it",
    saved: "Saved",
    saveError: "Couldn't save your response.",
    gameNotFoundOrLoadError: "Couldn't load this game. Try again.",
  },
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

function renderScreen(gameId: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GameDetailScreen gameId={gameId} />
    </NextIntlClientProvider>,
  );
}

describe("GameDetailScreen", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.mocked(getGameAttendance).mockReset();
    vi.mocked(listPlayers).mockReset();
  });

  it("shows the identity picker when no current player is stored, reaching this game directly by id", async () => {
    vi.mocked(listPlayers).mockResolvedValue([{ id: "1", name: "Alice" }]);

    renderScreen("g1");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Who are you?" })).toBeInTheDocument(),
    );
  });

  it("renders this game's detail once a current player is already resolved", async () => {
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, "player-1");
    vi.mocked(getGameAttendance).mockResolvedValue({
      ok: true,
      data: {
        game: {
          id: "g1",
          date: "2026-07-20",
          time: "1970-01-01T18:00:00.000Z",
          locationName: "Parque Central",
          address: "123 Main St",
        },
        status: "no_response",
      },
    });

    renderScreen("g1");

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Game at Parque Central" }),
      ).toBeInTheDocument(),
    );
    expect(getGameAttendance).toHaveBeenCalledWith("g1", "player-1");
  });
});
