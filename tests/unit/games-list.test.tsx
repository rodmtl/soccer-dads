import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { GamesList } from "@/components/GamesList";

const messages = {
  Common: { loading: "Loading…", retry: "Retry" },
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

function renderGamesList(props: Partial<React.ComponentProps<typeof GamesList>> = {}) {
  const defaultProps: React.ComponentProps<typeof GamesList> = {
    activeTab: "upcoming",
    onTabChange: vi.fn(),
    games: [],
    isLoading: false,
    error: null,
    onSelectGame: vi.fn(),
    onRetry: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GamesList {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("GamesList", () => {
  it("shows a loading skeleton while games are loading", () => {
    renderGamesList({ games: null, isLoading: true });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows an error state with retry when the fetch failed", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderGamesList({ games: null, error: new Error("boom"), onRetry });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the no-upcoming-games empty state on the upcoming tab", () => {
    renderGamesList({ activeTab: "upcoming", games: [] });

    expect(screen.getByText("No upcoming games")).toBeInTheDocument();
  });

  it("shows the no-past-games empty state on the past tab", () => {
    renderGamesList({ activeTab: "past", games: [] });

    expect(screen.getByText("No past games yet")).toBeInTheDocument();
  });

  it("renders a tablist with Upcoming and Past tabs reflecting the active tab", () => {
    renderGamesList({ activeTab: "upcoming" });

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onTabChange when the inactive tab is activated", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderGamesList({ activeTab: "upcoming", onTabChange });

    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(onTabChange).toHaveBeenCalledWith("past");
  });

  it("renders each game as a button whose accessible name includes the locale-formatted date, location, and status", () => {
    renderGamesList({
      games: [
        {
          id: "g1",
          date: "2026-07-20",
          time: "1970-01-01T18:00:00.000Z",
          locationName: "Parque Central",
          myAttendanceStatus: "confirmed",
        },
      ],
    });

    const row = screen.getByRole("button", {
      name: "Game on July 20, 2026 at Parque Central, Confirmed",
    });
    expect(row).toBeInTheDocument();
  });

  it("renders the game's date and time formatted per-locale (not the raw stored value) in the visible row text", () => {
    renderGamesList({
      games: [
        {
          id: "g1",
          date: "2026-07-20",
          time: "1970-01-01T18:00:00.000Z",
          locationName: "Parque Central",
          myAttendanceStatus: "no_response",
        },
      ],
    });

    const row = screen.getByRole("button", { name: /Parque Central/ });
    expect(within(row).getByText(/July 20, 2026/)).toBeInTheDocument();
    expect(within(row).getByText(/6:00 PM/)).toBeInTheDocument();
  });

  it("shows the status pill text for each attendance status", () => {
    renderGamesList({
      games: [
        {
          id: "g1",
          date: "2026-07-20",
          time: "1970-01-01T18:00:00.000Z",
          locationName: "Parque Central",
          myAttendanceStatus: "declined",
        },
      ],
    });

    const row = screen.getByRole("button", { name: /Parque Central/ });
    expect(within(row).getByText("Declined")).toBeInTheDocument();
  });

  it("calls onSelectGame with the game id when a row is activated", async () => {
    const user = userEvent.setup();
    const onSelectGame = vi.fn();
    renderGamesList({
      games: [
        {
          id: "g1",
          date: "2026-07-20",
          time: "1970-01-01T18:00:00.000Z",
          locationName: "Parque Central",
          myAttendanceStatus: "no_response",
        },
      ],
      onSelectGame,
    });

    await user.click(screen.getByRole("button", { name: /Parque Central/ }));

    expect(onSelectGame).toHaveBeenCalledWith("g1");
  });
});
