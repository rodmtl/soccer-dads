"use client";

import { useId, useState, type ReactNode } from "react";

export interface SearchableListItem {
  id: string;
  label: string;
}

export interface SearchableListProps {
  items: SearchableListItem[];
  searchLabel: string;
  /**
   * May contain a literal `{query}` token, which is replaced with the
   * current search text (e.g. "No players match '{query}'").
   */
  noResultsMessage: string;
  onSelect(id: string): void;
  renderItem?: (item: SearchableListItem) => ReactNode;
}

export function SearchableList({
  items,
  searchLabel,
  noResultsMessage,
  onSelect,
  renderItem,
}: SearchableListProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {searchLabel}
        </label>
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 rounded-md border border-gray-300 px-3 text-base"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-600">
          {noResultsMessage.replace("{query}", query)}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-200">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="min-h-11 w-full px-2 py-2 text-left text-base hover:bg-gray-50"
              >
                {renderItem ? renderItem(item) : item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
