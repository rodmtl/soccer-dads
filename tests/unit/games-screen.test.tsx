import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GamesScreen } from "@/components/GamesScreen";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";
import { listGames } from "@/server/actions/listGames";
import { listPlayers } from "@/server/actions/listPlayers";
import { useRouter } from "@/i18n/navigation";

vi.mock("@/server/actions/listGames", () => ({
  listGames: vi.fn(),
}));

vi.mock("@/server/actions/listPlayers", () => ({
  listPlayers: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: vi.fn(),
}));

const messages = {
  Common: { loading: "Loading…", retry: "Retry" },
  PlayerIdentity: {
    title: "Who are you?",
    searchLabel: "Search your name",
    noSearchMatches: "No players match '{query}'",
    noPlayersTitle: "No players yet",
    noPlayersDescription: "Ask your league organizer to add players before you can join a game.",
    loadError: "Couldn't load players. Try again.",
  },
  Games: {
    title: "Games",
    upcomingTab: "Upcoming",
    pastTab: "Past",
    loadError: "Couldn't load games. Try again.",
    noUpcomingTitle: "No upcoming games",
    noUpcomingDescription: "Check back once your organizer schedules one.",
    noPastTitle: "No past games yet",
    gameRowLabel: "Game on {date} at {locationName}, {status}",
  },
  Attendance: {
    statusConfirmed: "Confirmed",
    statusDeclined: "Declined",
    statusNoResponse: "No response yet",
  },
};

function renderScreen() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GamesScreen />
    </NextIntlClientProvider>,
  );
}

describe("GamesScreen", () => {
  vi.mocked(useRouter).mockReturnValue({
    push: pushMock,
  } as unknown as ReturnType<typeof useRouter>);

  afterEach(() => {
    window.localStorage.clear();
    vi.mocked(listGames).mockReset();
    vi.mocked(listPlayers).mockReset();
    pushMock.mockReset();
  });

  it("shows the identity picker when no current player is stored", async () => {
    vi.mocked(listPlayers).mockResolvedValue([{ id: "1", name: "Alice" }]);

    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Who are you?" })).toBeInTheDocument(),
    );
  });

  it("navigates to the game's detail route when a row is selected", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, "player-1");
    vi.mocked(listGames).mockResolvedValue({
      ok: true,
      data: {
        upcoming: [
          {
            id: "g1",
            date: "2026-07-20",
            time: "1970-01-01T18:00:00.000Z",
            locationName: "Parque Central",
            myAttendanceStatus: "no_response",
          },
        ],
        past: [],
      },
    });

    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Parque Central/ })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Parque Central/ }));

    expect(pushMock).toHaveBeenCalledWith("/games/g1");
  });
});
