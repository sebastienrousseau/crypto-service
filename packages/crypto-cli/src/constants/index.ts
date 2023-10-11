import * as en from "./en";
import * as fr from "./fr";

const locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
let constants;

async function language(data: string) {
  {
    if (data === "en") {
      console.log("en", data);
      constants = en.translations;
    } else if (data === "fr") {
      console.log("fr", data);
      constants = fr.translations;
    }
  }
}

export { language, constants, locale };
