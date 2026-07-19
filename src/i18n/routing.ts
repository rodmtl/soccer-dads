import { defineRouting } from "next-intl/routing";

/**
 * GarageLeague ships bilingual English/French from v1 (see docs/architecture.md's
 * internationalization section) — both locales are required at launch, not deferred.
 */
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];
