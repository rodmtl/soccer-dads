import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentPlayerGate } from "@/components/CurrentPlayerGate";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";
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

function renderGate(children: (playerId: string, onInvalidPlayer: () => void) => React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CurrentPlayerGate>{children}</CurrentPlayerGate>
    </NextIntlClientProvider>,
  );
}

describe("CurrentPlayerGate", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.mocked(listPlayers).mockReset();
  });

  it("renders children immediately with the stored player id when one is already present", async () => {
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, "player-1");

    renderGate((playerId) => <div>Signed in as {playerId}</div>);

    await waitFor(() =>
      expect(screen.getByText("Signed in as player-1")).toBeInTheDocument(),
    );
  });

  it("shows the identity picker when no player id is stored", async () => {
    vi.mocked(listPlayers).mockResolvedValue([{ id: "1", name: "Alice" }]);

    renderGate((playerId) => <div>Signed in as {playerId}</div>);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Who are you?" })).toBeInTheDocument(),
    );
  });

  it("renders children with the newly picked id once a player is selected", async () => {
    const user = userEvent.setup();
    vi.mocked(listPlayers).mockResolvedValue([{ id: "42", name: "Alice" }]);

    renderGate((playerId) => <div>Signed in as {playerId}</div>);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Alice" }));

    await waitFor(() =>
      expect(screen.getByText("Signed in as 42")).toBeInTheDocument(),
    );
  });

  it("clears the stored id and shows the picker again when a child reports an invalid player", async () => {
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, "stale-id");
    vi.mocked(listPlayers).mockResolvedValue([{ id: "42", name: "Alice" }]);

    renderGate((playerId, onInvalidPlayer) => (
      <button onClick={onInvalidPlayer}>Report invalid: {playerId}</button>
    ));

    const reportButton = await screen.findByRole("button", {
      name: "Report invalid: stale-id",
    });
    const user = userEvent.setup();
    await user.click(reportButton);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Who are you?" })).toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(CURRENT_PLAYER_STORAGE_KEY)).toBeNull();
  });

  it("does not mount the identity picker (or fetch players) across the server-render/hydrate boundary when a player id is already stored", async () => {
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, "player-1");
    vi.mocked(listPlayers).mockResolvedValue([]);

    const tree = (
      <NextIntlClientProvider locale="en" messages={messages}>
        <CurrentPlayerGate>
          {(playerId) => <div>Signed in as {playerId}</div>}
        </CurrentPlayerGate>
      </NextIntlClientProvider>
    );

    // Simulates this being a Next.js "use client" component: server-rendered
    // to HTML first (no localStorage access possible there), then hydrated
    // on the client — getServerSnapshot must return null for the server
    // pass, matching what CurrentPlayerGate actually returns.
    const html = renderToStaticMarkup(tree);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    await act(async () => {
      hydrateRoot(container, tree);
    });

    await waitFor(() => expect(container).toHaveTextContent("Signed in as player-1"));
    expect(listPlayers).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });
});
