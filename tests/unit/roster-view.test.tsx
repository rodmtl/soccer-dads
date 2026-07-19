import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { RosterView } from "@/components/RosterView";

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

function renderRosterView(props: Partial<React.ComponentProps<typeof RosterView>> = {}) {
  const defaultProps: React.ComponentProps<typeof RosterView> = {
    teams: null,
    isLoading: false,
    error: null,
    currentPlayerId: "viewer",
    onRetry: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RosterView {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("RosterView", () => {
  it("shows a loading skeleton while teams is null", () => {
    renderRosterView({ teams: null, isLoading: true });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with retry when loading failed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderRosterView({ teams: null, error: new Error("boom"), onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load the roster. Try again.",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the not-generated-yet empty state when teams is an empty array", () => {
    renderRosterView({ teams: [] });

    expect(screen.getByText("Teams haven't been announced yet")).toBeInTheDocument();
    expect(screen.getByText("Check back closer to game day.")).toBeInTheDocument();
  });

  it("shows the not-generated-yet empty state when every team has zero players", () => {
    renderRosterView({
      teams: [
        { teamIndex: 0, players: [] },
        { teamIndex: 1, players: [] },
      ],
    });

    expect(screen.getByText("Teams haven't been announced yet")).toBeInTheDocument();
  });

  it("renders one section per team, 1-indexed in the heading text", () => {
    renderRosterView({
      teams: [
        {
          teamIndex: 0,
          players: [{ id: "p1", name: "Sam Ortiz", assignedPosition: "goalkeeper" }],
        },
        {
          teamIndex: 1,
          players: [{ id: "p2", name: "Alex Kim", assignedPosition: "striker" }],
        },
      ],
    });

    expect(screen.getByRole("heading", { name: "Team 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team 2" })).toBeInTheDocument();
  });

  it("renders each player's name and translated position within their team's list", () => {
    renderRosterView({
      teams: [
        {
          teamIndex: 0,
          players: [
            { id: "p1", name: "Sam Ortiz", assignedPosition: "goalkeeper" },
            { id: "p2", name: "Jordan Lee", assignedPosition: "defender" },
          ],
        },
      ],
      currentPlayerId: "someone-else",
    });

    const team1 = screen.getByRole("heading", { name: "Team 1" }).closest("section");
    expect(team1).not.toBeNull();
    const list = within(team1 as HTMLElement).getByRole("list");
    expect(within(list).getByText("Sam Ortiz")).toBeInTheDocument();
    expect(within(list).getByText("Goalkeeper")).toBeInTheDocument();
    expect(within(list).getByText("Jordan Lee")).toBeInTheDocument();
    expect(within(list).getByText("Defender")).toBeInTheDocument();
  });

  it("shows a 'You' badge on the current player's own row, without hiding their name", () => {
    renderRosterView({
      teams: [
        {
          teamIndex: 0,
          players: [
            { id: "p1", name: "Sam Ortiz", assignedPosition: "goalkeeper" },
            { id: "viewer", name: "Jordan Lee", assignedPosition: "defender" },
          ],
        },
      ],
      currentPlayerId: "viewer",
    });

    const rows = screen.getAllByRole("listitem");
    const ownRow = rows.find((row) => within(row).queryByText("Jordan Lee") !== null);
    expect(ownRow).toBeDefined();
    expect(within(ownRow as HTMLElement).getByText("Jordan Lee")).toBeInTheDocument();
    expect(within(ownRow as HTMLElement).getByText("You")).toBeInTheDocument();

    const otherRow = rows.find((row) => within(row).queryByText("Sam Ortiz") !== null);
    expect(otherRow).toBeDefined();
    expect(within(otherRow as HTMLElement).queryByText("You")).not.toBeInTheDocument();
  });

  it("matches the 'You' badge by player id, not by name, when two players share a name", () => {
    renderRosterView({
      teams: [
        {
          teamIndex: 0,
          players: [
            { id: "viewer", name: "Jordan Lee", assignedPosition: "defender" },
            { id: "other-jordan-lee", name: "Jordan Lee", assignedPosition: "midfielder" },
          ],
        },
      ],
      currentPlayerId: "viewer",
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    const rowsWithYouBadge = rows.filter((row) => within(row).queryByText("You") !== null);
    expect(rowsWithYouBadge).toHaveLength(1);
    // Distinguishes the two same-named rows by their (distinct) position,
    // proving the badge landed on the viewer's own row (defender), not the
    // other same-named player's row (midfielder) — an id match, not a name
    // match.
    expect(within(rowsWithYouBadge[0]).getByText("Defender")).toBeInTheDocument();
  });
});
