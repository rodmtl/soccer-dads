import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { InvalidPlayerError } from "@/server/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
    },
  },
}));

const findUniqueMock = prisma.player.findUnique as unknown as Mock<
  () => Promise<{ id: string } | null>
>;

describe("assertPlayerExists", () => {
  it("resolves without throwing when the player id exists", async () => {
    findUniqueMock.mockResolvedValue({ id: "42" });

    await expect(assertPlayerExists("42")).resolves.toBeUndefined();
  });

  it("throws InvalidPlayerError when the player id does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(assertPlayerExists("does-not-exist")).rejects.toBeInstanceOf(
      InvalidPlayerError,
    );
  });
});
