"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PlayerIdentityPickerContainer } from "@/components/PlayerIdentityPickerContainer";
import { clearCurrentPlayerId, getCurrentPlayerId } from "@/lib/currentPlayer";

export interface CurrentPlayerGateProps {
  // Render prop rather than a plain ReactNode: since the resolved player id
  // isn't known until the client re-syncs past the server snapshot
  // (localStorage is client-only), children need it passed down explicitly
  // instead of reading it themselves. `onInvalidPlayer` lets a descendant
  // report a stale/tampered-with id (a Server Action rejected it) so the
  // gate can reset to the picker.
  children(currentPlayerId: string, onInvalidPlayer: () => void): ReactNode;
}

// getServerSnapshot always returns null (there's no localStorage on the
// server) — useSyncExternalStore uses this during SSR and the initial
// client hydration pass so both match, then re-syncs to the real client
// value right after, per React's documented pattern for reading
// external/browser-only mutable state safely (see
// https://react.dev/reference/react/useSyncExternalStore).
function getServerSnapshot(): string | null {
  return null;
}

// A minimal useSyncExternalStore whose only job is to flip from false (the
// server/initial-hydration snapshot) to true once the client has actually
// hydrated — the value itself never changes again afterwards, so `subscribe`
// is a no-op. Used to distinguish "genuinely no player id stored" from "the
// server snapshot hasn't been replaced by the real client read yet", so the
// identity picker (and its listPlayers() fetch) isn't mounted prematurely on
// every navigation/hydration.
function subscribeNever() {
  return () => {};
}

function getHydratedSnapshot(): boolean {
  return true;
}

function getServerHydratedSnapshot(): boolean {
  return false;
}

// Player-facing routes (Games List, Game Detail) are gated on a resolved
// "current player" (docs/ux/01-player-identity.md). Rendering the requested
// route's own children in place (rather than navigating elsewhere) once a
// player is picked also satisfies Flow 1's "deep-link preservation" for the
// WhatsApp entry point for free: the URL never changes, so whatever route
// this gate wraps is exactly what's shown once resolved.
export function CurrentPlayerGate({ children }: CurrentPlayerGateProps) {
  const tCommon = useTranslations("Common");

  // A plain, stable-identity Set (never replaced via setState) rather than a
  // ref, since a ref's `.current` may not be read while rendering — and a
  // render-prop's `children(...)` call, below, counts as still being "during
  // render" from the linter's perspective even though the callback it
  // receives only runs later, from an event handler.
  const [listeners] = useState(() => new Set<() => void>());

  const hasHydrated = useSyncExternalStore(
    subscribeNever,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const currentPlayerId = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getCurrentPlayerId,
    getServerSnapshot,
  );

  // Our own writes (via setCurrentPlayerId/clearCurrentPlayerId) don't fire
  // a native `storage` event in the same tab, so callers that just wrote a
  // new value tell the store to re-check explicitly.
  function notifySubscribers() {
    listeners.forEach((listener) => listener());
  }

  function handleInvalidPlayer() {
    clearCurrentPlayerId();
    notifySubscribers();
  }

  // Still resolving whether a player id is actually stored (server-rendered
  // pass, or the client hasn't hydrated past the server snapshot yet) — show
  // a neutral loading state rather than mounting the identity picker (and
  // firing its listPlayers() fetch) only to immediately discard it once the
  // real value syncs in.
  if (!hasHydrated) {
    return <LoadingSkeleton rows={4} label={tCommon("loading")} />;
  }

  if (currentPlayerId === null) {
    return <PlayerIdentityPickerContainer onPlayerSelected={notifySubscribers} />;
  }

  return <>{children(currentPlayerId, handleInvalidPlayer)}</>;
}
