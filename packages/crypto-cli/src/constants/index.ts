import * as en from "./en";
import * as fr from "./fr";

/** Union type representing all translation string keys and their values. */
export type Translations = typeof en.translations;

/** Detected two-letter locale code (e.g. "en", "fr") from the runtime environment. */
const locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
/** Active translation constants, defaults to English. */
let constants: Translations = en.translations; // skipcq: JS-E1009

/**
 * Set the active locale and load the corresponding translation strings.
 * @param data - Two-letter locale code (e.g. "fr").
 */
function language(data: string): void {
  // skipcq: JS-0067
  if (data === "fr") {
    constants = fr.translations as unknown as Translations;
    return;
  }
  constants = en.translations;
}

export { language, constants, locale };
