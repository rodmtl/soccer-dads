import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { PlayerIdentityPicker } from "@/components/PlayerIdentityPicker";
import messages from "../../messages/en.json";

function renderPicker(
  props: Partial<React.ComponentProps<typeof PlayerIdentityPicker>> = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PlayerIdentityPicker
        players={null}
        isLoading={false}
        error={null}
        onSelectPlayer={vi.fn()}
        onRetry={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("PlayerIdentityPicker", () => {
  it("shows a loading skeleton while isLoading is true", () => {
    renderPicker({ isLoading: true, players: null });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading…");
  });

  it("shows an error state with a working retry button when the fetch failed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderPicker({
      isLoading: false,
      error: new Error("network down"),
      players: null,
      onRetry,
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load players. Try again.",
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty state when the fetch succeeded with zero players", () => {
    renderPicker({ isLoading: false, error: null, players: [] });

    expect(screen.getByRole("heading", { name: "No players yet" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ask your league organizer to add players before you can join a game.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a page heading and a searchable list of player names when populated", () => {
    renderPicker({
      isLoading: false,
      error: null,
      players: [
        { id: "1", name: "Bob" },
        { id: "2", name: "Alice" },
      ],
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Who are you?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bob" })).toBeInTheDocument();
  });

  it("renders player names alphabetically regardless of fetch order", () => {
    renderPicker({
      isLoading: false,
      error: null,
      players: [
        { id: "1", name: "Zara" },
        { id: "2", name: "Amir" },
      ],
    });

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Amir", "Zara"]);
  });

  it("calls onSelectPlayer with the chosen player's id", async () => {
    const user = userEvent.setup();
    const onSelectPlayer = vi.fn();
    renderPicker({
      isLoading: false,
      error: null,
      players: [{ id: "42", name: "Alice" }],
      onSelectPlayer,
    });

    await user.click(screen.getByRole("button", { name: "Alice" }));

    expect(onSelectPlayer).toHaveBeenCalledWith("42");
  });

  it("renders the translated no-search-matches copy with the search term interpolated", async () => {
    const user = userEvent.setup();
    renderPicker({
      isLoading: false,
      error: null,
      players: [{ id: "1", name: "Alice" }],
    });

    await user.type(screen.getByLabelText("Search your name"), "zzz");

    expect(screen.getByText("No players match 'zzz'")).toBeInTheDocument();
  });
});
