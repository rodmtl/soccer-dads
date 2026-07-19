import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

// Every app-authored translation key must exist in both locales (see
// docs/architecture.md's internationalization section) — a key present in
// one file but missing in the other would silently fall back or throw at
// runtime for that locale.
function collectKeyPaths(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) {
    return [prefix];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("messages/en.json and messages/fr.json", () => {
  it("define exactly the same set of translation keys", () => {
    const enKeys = collectKeyPaths(en).sort();
    const frKeys = collectKeyPaths(fr).sort();

    expect(frKeys).toEqual(enKeys);
  });
});
