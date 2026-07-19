import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/[locale]/profile/page";
import { listPlayers } from "@/server/actions/listPlayers";

vi.mock("@/server/actions/listPlayers", () => ({
  listPlayers: vi.fn(),
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
};

describe("ProfilePage", () => {
  it("renders the profile screen (identity gate first, since no player is stored)", async () => {
    vi.mocked(listPlayers).mockResolvedValue([{ id: "1", name: "Alice" }]);

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ProfilePage />
      </NextIntlClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Who are you?" })).toBeInTheDocument();
  });
});
