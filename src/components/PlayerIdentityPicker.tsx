"use client";

import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SearchableList } from "@/components/SearchableList";

export interface PlayerIdentityPickerPlayer {
  id: string;
  name: string;
}

export interface PlayerIdentityPickerProps {
  players: PlayerIdentityPickerPlayer[] | null;
  isLoading: boolean;
  error: Error | null;
  onSelectPlayer(playerId: string): void;
  onRetry(): void;
}

export function PlayerIdentityPicker({
  players,
  isLoading,
  error,
  onSelectPlayer,
  onRetry,
}: PlayerIdentityPickerProps) {
  const t = useTranslations("PlayerIdentity");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  if (isLoading) {
    return <LoadingSkeleton rows={6} label={tCommon("loading")} />;
  }

  if (error !== null) {
    return (
      <ErrorState
        message={t("loadError")}
        retryLabel={tCommon("retry")}
        onRetry={onRetry}
      />
    );
  }

  if (players !== null && players.length === 0) {
    return (
      <EmptyState title={t("noPlayersTitle")} description={t("noPlayersDescription")} />
    );
  }

  const sortedPlayers = [...(players ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <SearchableList
        items={sortedPlayers.map((player) => ({
          id: player.id,
          label: player.name,
        }))}
        searchLabel={t("searchLabel")}
        // messages/*.json's PlayerIdentity.noSearchMatches escapes its
        // literal quotes and {query} placeholder as '''{query}''' — ICU
        // MessageFormat treats a lone `'` next to `{`/`}` as an escape
        // delimiter (consumed, not rendered), so a doubled `''` is needed to
        // produce an actual apostrophe while keeping `{query}` un-resolved:
        // SearchableList (not next-intl) substitutes it with the live search
        // text.
        noResultsMessage={t("noSearchMatches")}
        onSelect={onSelectPlayer}
      />
    </div>
  );
}
