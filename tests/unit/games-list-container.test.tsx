import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GamesListContainer } from "@/components/GamesListContainer";
import { listGames } from "@/server/actions/listGames";

vi.mock("@/server/actions/listGames", () => ({
  listGames: vi.fn(),
}));

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

function renderContainer(props: Partial<React.ComponentProps<typeof GamesListContainer>> = {}) {
  const defaultProps: React.ComponentProps<typeof GamesListContainer> = {
    playerId: "player-1",
    onSelectGame: vi.fn(),
    onInvalidPlayer: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GamesListContainer {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("GamesListContainer", () => {
  afterEach(() => {
    vi.mocked(listGames).mockReset();
  });

  it("shows loading then the upcoming games once the fetch resolves", async () => {
    vi.mocked(listGames).mockResolvedValue({
      ok: true,
      data: {
        upcoming: [
          { id: "g1", date: "2026-07-20", time: "1970-01-01T18:00:00.000Z", locationName: "Parque Central", myAttendanceStatus: "no_response" },
        ],
        past: [],
      },
    });

    renderContainer();

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Parque Central/ })).toBeInTheDocument(),
    );
  });

  it("switches to the past tab's games when the past tab is activated", async () => {
    const user = userEvent.setup();
    vi.mocked(listGames).mockResolvedValue({
      ok: true,
      data: {
        upcoming: [],
        past: [
          { id: "g2", date: "2026-07-01", time: "1970-01-01T18:00:00.000Z", locationName: "Parque Sur", myAttendanceStatus: "declined" },
        ],
      },
    });

    renderContainer();

    await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByRole("button", { name: /Parque Sur/ })).toBeInTheDocument();
  });

  it("calls onSelectGame with the tapped game's id", async () => {
    const user = userEvent.setup();
    const onSelectGame = vi.fn();
    vi.mocked(listGames).mockResolvedValue({
      ok: true,
      data: {
        upcoming: [
          { id: "g1", date: "2026-07-20", time: "1970-01-01T18:00:00.000Z", locationName: "Parque Central", myAttendanceStatus: "confirmed" },
        ],
        past: [],
      },
    });

    renderContainer({ onSelectGame });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Parque Central/ })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Parque Central/ }));

    expect(onSelectGame).toHaveBeenCalledWith("g1");
  });

  it("shows an error state when the fetch rejects with a genuinely unexpected error", async () => {
    vi.mocked(listGames).mockRejectedValue(new Error("network down"));

    renderContainer();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("calls onInvalidPlayer instead of showing a generic error when the result reports an invalid player", async () => {
    const onInvalidPlayer = vi.fn();
    vi.mocked(listGames).mockResolvedValue({ ok: false, reason: "invalid_player" });

    renderContainer({ onInvalidPlayer });

    await waitFor(() => expect(onInvalidPlayer).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("re-fetches when retry is activated after a failure", async () => {
    const user = userEvent.setup();
    vi.mocked(listGames)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        data: {
          upcoming: [
            { id: "g1", date: "2026-07-20", time: "1970-01-01T18:00:00.000Z", locationName: "Parque Central", myAttendanceStatus: "no_response" },
          ],
          past: [],
        },
      });

    renderContainer();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Parque Central/ })).toBeInTheDocument(),
    );
  });
});
