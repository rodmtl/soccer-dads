import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Locale-aware wrappers around Next.js navigation APIs, scoped to the locales
 * defined in `routing`. Use these instead of `next/link` / `next/navigation`
 * directly so links stay within the current locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
