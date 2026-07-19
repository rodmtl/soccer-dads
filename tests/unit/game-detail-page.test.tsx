import { describe, expect, it, vi } from "vitest";
import GameDetailPage from "@/app/[locale]/games/[gameId]/page";
import { GameDetailScreen } from "@/components/GameDetailScreen";

// GameDetailContainer (rendered by GameDetailScreen) imports next-intl's
// Link from @/i18n/navigation at module scope — that module can't be
// resolved for real under this project's current Vitest/Next.js version
// combination (a pre-existing tooling gap, unrelated to this test), so it's
// always mocked directly here rather than left to resolve for real.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// GameDetailPage is an async Server Component (Next.js App Router) — it
// can't be rendered client-side via React Testing Library (React has no way
// to client-render an async function component in jsdom). Since its only
// job is resolving the `gameId` route param and wiring it into
// GameDetailScreen, it's tested the same way a Server Action is: called
// directly as a function, asserting on what it returns. See
// docs/ux/02-player-attendance.md's WhatsApp deep-link entry point — this is
// what makes `/{locale}/games/{gameId}` reachable directly by id.
describe("GameDetailPage", () => {
  it("resolves the gameId route param and passes it to GameDetailScreen", async () => {
    const element = await GameDetailPage({
      params: Promise.resolve({ locale: "en", gameId: "g1" }),
    });

    expect(element.type).toBe(GameDetailScreen);
    expect(element.props).toEqual({ gameId: "g1" });
  });
});
