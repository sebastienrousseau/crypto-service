import * as en from "./en";
import * as fr from "./fr";

export type Translations = typeof en.translations;

const locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
let constants: Translations = en.translations;

async function language(data: string): Promise<void> {
  if (data === "fr") {
    constants = fr.translations as unknown as Translations;
    return;
  }
  constants = en.translations;
}

export { language, constants, locale };
