import * as en from './en';
import * as fr from './fr';

const locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
let constants;

switch (locale) {
  case 'en':
    constants = en.translations;
    break;
  case 'fr':
    constants = fr.translations;
    break;
  default:
    constants = en.translations;
    break;
}

export { constants, locale };
