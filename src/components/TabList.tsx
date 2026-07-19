"use client";

import { useRef, type KeyboardEvent } from "react";

export interface TabListItem<T extends string> {
  id: T;
  label: string;
}

export interface TabListProps<T extends string> {
  tabs: TabListItem<T>[];
  activeTab: T;
  onTabChange(tab: T): void;
  // Accessible name for the tablist itself (e.g. the page's own <h1> text) —
  // see docs/ux/design-tokens.md's shared tabs pattern.
  ariaLabel: string;
}

// Shared accessible tabs pattern (role="tablist"/"tab", roving tabindex,
// ArrowLeft/ArrowRight keyboard navigation matching the standard ARIA tabs
// pattern) — originally implemented independently in both GamesList
// (Upcoming/Past) and GameDetailContainer (Details & Attendance/Roster);
// extracted here once duplicated verbatim across those two call sites so a
// future a11y/keyboard fix only needs applying once. Renders only the
// tablist itself, not the tabpanel — panel content varies too much between
// callers to share.
export function TabList<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
}: TabListProps<T>) {
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = tabs[(currentIndex + delta + tabs.length) % tabs.length];
    onTabChange(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-2 border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            tabRefs.current[tab.id] = el;
          }}
          role="tab"
          type="button"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={handleTabKeyDown}
          className="min-h-11 px-4 font-medium"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
