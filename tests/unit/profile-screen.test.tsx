import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileScreen } from "@/components/ProfileScreen";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";
import { getOwnProfile } from "@/server/actions/getOwnProfile";
import { listPlayers } from "@/server/actions/listPlayers";

vi.mock("@/server/actions/getOwnProfile", () => ({
  getOwnProfile: vi.fn(),
}));
vi.mock("@/server/actions/listPlayers", () => ({
  listPlayers: vi.fn(),
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
  Position: {
    goalkeeper: "Goalkeeper",
    defender: "Defender",
    midfielder: "Midfielder",
    striker: "Striker",
  },
  Profile: {
    title: "My Profile",
    ageLabel: "Age",
    positionsLabel: "Preferred positions",
    positionsSelectedCount: "{count} of 2 selected",
    maxPositionsMessage: "You can choose up to 2 positions.",
    saveError: "Couldn't update your positions.",
    loadError: "Couldn't load your profile. Try again.",
  },
};

function renderScreen() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProfileScreen />
    </NextIntlClientProvider>,
  );
}

describe("ProfileScreen", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.mocked(getOwnProfile).mockReset();
    vi.mocked(listPlayers).mockReset();
  });

  it("shows the identity picker when no current player is stored", async () => {
    vi.mocked(listPlayers).mockResolvedValue([{ id: "1", name: "Alice" }]);

    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Who are you?" })).toBeInTheDocument(),
    );
  });

  it("renders the profile once a current player is already resolved", async () => {
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, "player-1");
    vi.mocked(getOwnProfile).mockResolvedValue({
      ok: true,
      data: { name: "Jordan Lee", age: 34, positions: ["defender"] },
    });

    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "My Profile" })).toBeInTheDocument(),
    );
    expect(getOwnProfile).toHaveBeenCalledWith("player-1");
  });
});
