import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileContainer } from "@/components/ProfileContainer";
import { getOwnProfile, type OwnProfileData } from "@/server/actions/getOwnProfile";
import {
  updateOwnPositions,
  type UpdateOwnPositionsResult,
} from "@/server/actions/updateOwnPositions";

vi.mock("@/server/actions/getOwnProfile", () => ({
  getOwnProfile: vi.fn(),
}));
vi.mock("@/server/actions/updateOwnPositions", () => ({
  updateOwnPositions: vi.fn(),
}));

const messages = {
  Common: { loading: "Loading…", retry: "Retry", saving: "Saving…" },
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

const profile: OwnProfileData = {
  name: "Jordan Lee",
  age: 34,
  positions: ["defender"],
};

function renderContainer(props: Partial<React.ComponentProps<typeof ProfileContainer>> = {}) {
  const defaultProps: React.ComponentProps<typeof ProfileContainer> = {
    playerId: "player-1",
    onInvalidPlayer: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProfileContainer {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ProfileContainer", () => {
  afterEach(() => {
    vi.mocked(getOwnProfile).mockReset();
    vi.mocked(updateOwnPositions).mockReset();
  });

  it("shows loading then the player's own name, age, and positions", async () => {
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });

    renderContainer();

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "My Profile" })).toBeInTheDocument(),
    );
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Defender" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // docs/adr/0002-player-rating-privacy-deferred.md: rating is withheld from
  // every player-facing screen, including the player's own profile, until a
  // real identity/session mechanism exists.
  it("never renders a rating label or value, even though other numeric fields (age) are shown", async () => {
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "My Profile" })).toBeInTheDocument(),
    );
    // Regex (not an exact "Rating" match) so this also catches a stray
    // missing-translation-key fallback string (e.g. "Profile.ratingLabel")
    // rendering literally, not just a properly-translated label.
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it("shows a retryable error state when the profile fetch fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnProfile)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true, data: profile });

    renderContainer();

    await waitFor(() =>
      expect(screen.getByText("Couldn't load your profile. Try again.")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "My Profile" })).toBeInTheDocument(),
    );
  });

  it("calls onInvalidPlayer instead of showing an error when the load reports an invalid player", async () => {
    const onInvalidPlayer = vi.fn();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: false, reason: "invalid_player" });

    renderContainer({ onInvalidPlayer });

    await waitFor(() => expect(onInvalidPlayer).toHaveBeenCalledOnce());
  });

  it("saves a newly selected position and reflects the server's returned list", async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });
    vi.mocked(updateOwnPositions).mockResolvedValue({
      ok: true,
      data: { positions: ["defender", "goalkeeper"] },
    });

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    expect(updateOwnPositions).toHaveBeenCalledWith("player-1", ["defender", "goalkeeper"]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });

  it("disables the position toggles while a save is in flight", async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });
    let resolveSave: (value: UpdateOwnPositionsResult) => void = () => {};
    vi.mocked(updateOwnPositions).mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    resolveSave({ ok: true, data: { positions: ["defender", "goalkeeper"] } });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      ),
    );
  });

  it("reverts the optimistic selection and shows a save error when the save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });
    vi.mocked(updateOwnPositions).mockRejectedValue(new Error("save failed"));

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reverts and shows a save error when the server rejects the positions as invalid (defense in depth)", async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });
    vi.mocked(updateOwnPositions).mockResolvedValue({ ok: false, reason: "invalid_positions" });

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onInvalidPlayer instead of showing a save error when a save reports an invalid player", async () => {
    const user = userEvent.setup();
    const onInvalidPlayer = vi.fn();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });
    vi.mocked(updateOwnPositions).mockResolvedValue({ ok: false, reason: "invalid_player" });

    renderContainer({ onInvalidPlayer });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Goalkeeper" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Goalkeeper" }));

    await waitFor(() => expect(onInvalidPlayer).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deselects a position that is already selected", async () => {
    const user = userEvent.setup();
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, data: profile });
    vi.mocked(updateOwnPositions).mockResolvedValue({ ok: true, data: { positions: [] } });

    renderContainer();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Defender" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Defender" }));

    expect(updateOwnPositions).toHaveBeenCalledWith("player-1", []);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Defender" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
  });
});
