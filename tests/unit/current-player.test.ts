import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_PLAYER_STORAGE_KEY,
  getCurrentPlayerId,
  setCurrentPlayerId,
} from "@/lib/currentPlayer";

describe("currentPlayer", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when no player id has been stored", () => {
    expect(getCurrentPlayerId()).toBeNull();
  });

  it("persists the player id under a single, clearly-named key", () => {
    setCurrentPlayerId("player-123");

    expect(window.localStorage.getItem(CURRENT_PLAYER_STORAGE_KEY)).toBe("player-123");
  });

  it("returns the previously stored player id", () => {
    setCurrentPlayerId("player-123");

    expect(getCurrentPlayerId()).toBe("player-123");
  });

  it("does not throw when localStorage.setItem fails (e.g. private browsing, quota exceeded)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => setCurrentPlayerId("player-123")).not.toThrow();
  });

  it("returns null when localStorage.getItem fails", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => getCurrentPlayerId()).not.toThrow();
    expect(getCurrentPlayerId()).toBeNull();
  });
});
