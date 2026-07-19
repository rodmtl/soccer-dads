// Persists which Player this browser/device is acting as, since players have
// no login in v1 (see docs/ux/01-player-identity.md's "Persistence" section).
export const CURRENT_PLAYER_STORAGE_KEY = "garageleague.currentPlayerId";

// localStorage access can throw (e.g. Safari private browsing, storage
// disabled, quota exceeded) and this app has no error boundary to catch it —
// treat a storage failure the same as "no current player" rather than
// crashing the identity picker.
export function getCurrentPlayerId(): string | null {
  try {
    return window.localStorage.getItem(CURRENT_PLAYER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setCurrentPlayerId(playerId: string): void {
  try {
    window.localStorage.setItem(CURRENT_PLAYER_STORAGE_KEY, playerId);
  } catch {
    // Swallow: see getCurrentPlayerId's comment above.
  }
}

// Used when a stored player id turns out to be stale (e.g. a Server Action
// rejects it as no longer a real Player row) or when a player explicitly
// switches identity — resets back to "no current player" so the identity
// picker is shown again.
export function clearCurrentPlayerId(): void {
  try {
    window.localStorage.removeItem(CURRENT_PLAYER_STORAGE_KEY);
  } catch {
    // Swallow: see getCurrentPlayerId's comment above.
  }
}
