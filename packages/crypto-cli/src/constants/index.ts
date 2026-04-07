import * as en from "./en";
import * as fr from "./fr";

const supported = {
  en: en.translations,
  fr: fr.translations,
} as const;

type Locale = keyof typeof supported;

const detected = Intl.DateTimeFormat()
  .resolvedOptions()
  .locale.slice(0, 2)
  .toLowerCase() as Locale;

/** Resolved locale code (always one of the supported keys). */
export const locale: Locale = detected in supported ? detected : "en";

/**
 * The translation table for the resolved locale.
 *
 * Synchronous resolution avoids the race in the previous implementation,
 * where the CLI rendered before an async `language()` had set this binding.
 */
export const constants = supported[locale];
