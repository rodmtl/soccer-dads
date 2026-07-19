import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerIdentityPickerContainer } from "@/components/PlayerIdentityPickerContainer";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";
import { listPlayers } from "@/server/actions/listPlayers";

vi.mock("@/server/actions/listPlayers", () => ({
  listPlayers: vi.fn(),
}));

const messages = {
  PlayerIdentity: {
    title: "Who are you?",
    searchLabel: "Search your name",
    noSearchMatches: "No players match '{query}'",
    noPlayersTitle: "No players yet",
    noPlayersDescription:
      "Ask your league organizer to add players before you can join a game.",
    loadError: "Couldn't load players. Try again.",
  },
  Common: {
    loading: "Loading…",
    retry: "Retry",
  },
};

function renderContainer() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PlayerIdentityPickerContainer />
    </NextIntlClientProvider>,
  );
}

describe("PlayerIdentityPickerContainer", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.mocked(listPlayers).mockReset();
  });

  it("shows loading, then the populated list once the fetch resolves", async () => {
    vi.mocked(listPlayers).mockResolvedValue([{ id: "1", name: "Alice" }]);

    renderContainer();

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument(),
    );
  });

  it("shows the error state when the fetch rejects", async () => {
    vi.mocked(listPlayers).mockRejectedValue(new Error("network down"));

    renderContainer();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("re-fetches when retry is activated after a failure", async () => {
    const user = userEvent.setup();
    vi.mocked(listPlayers)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce([{ id: "1", name: "Alice" }]);

    renderContainer();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument(),
    );
  });

  it("persists the selected player's id to localStorage under the current-player key", async () => {
    const user = userEvent.setup();
    vi.mocked(listPlayers).mockResolvedValue([{ id: "42", name: "Alice" }]);

    renderContainer();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Alice" }));

    expect(window.localStorage.getItem(CURRENT_PLAYER_STORAGE_KEY)).toBe("42");
  });

  it("calls the optional onPlayerSelected callback with the selected player's id", async () => {
    const user = userEvent.setup();
    const onPlayerSelected = vi.fn();
    vi.mocked(listPlayers).mockResolvedValue([{ id: "42", name: "Alice" }]);

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PlayerIdentityPickerContainer onPlayerSelected={onPlayerSelected} />
      </NextIntlClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Alice" }));

    expect(onPlayerSelected).toHaveBeenCalledWith("42");
  });
});
