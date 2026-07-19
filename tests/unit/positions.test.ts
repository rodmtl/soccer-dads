import { describe, expect, it } from "vitest";
import { isValidPositionsUpdate, MAX_POSITIONS, POSITION_VALUES } from "@/server/services/positions";

// Server-side boundary for docs/ux/03-player-position.md's position picker:
// the client's PositionPicker only enforces max-2 as a UI convenience, so
// this pure validation function is the real guard against a client calling
// updateOwnPositions directly with an arbitrary body.
describe("isValidPositionsUpdate", () => {
  it("accepts an empty array", () => {
    expect(isValidPositionsUpdate([])).toBe(true);
  });

  it("accepts exactly one valid position", () => {
    expect(isValidPositionsUpdate(["goalkeeper"])).toBe(true);
  });

  it("accepts exactly two distinct valid positions", () => {
    expect(isValidPositionsUpdate(["goalkeeper", "defender"])).toBe(true);
  });

  it("rejects more than two positions", () => {
    expect(isValidPositionsUpdate(["goalkeeper", "defender", "midfielder"])).toBe(false);
  });

  it("rejects a value that isn't one of the four allowed positions", () => {
    expect(isValidPositionsUpdate(["goalkeeper", "sweeper"])).toBe(false);
  });

  it("rejects duplicate positions", () => {
    expect(isValidPositionsUpdate(["goalkeeper", "goalkeeper"])).toBe(false);
  });

  it("rejects a non-array value", () => {
    expect(isValidPositionsUpdate("goalkeeper")).toBe(false);
  });

  it("exposes the four allowed position values in the fixed display order", () => {
    expect(POSITION_VALUES).toEqual(["goalkeeper", "defender", "midfielder", "striker"]);
  });

  it("exposes the max-selectable-positions rule as a single shared constant", () => {
    expect(MAX_POSITIONS).toBe(2);
  });
});
