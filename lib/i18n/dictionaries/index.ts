import fr from "./fr";
import en from "./en";
import es from "./es";
import de from "./de";
import type { Locale } from "../locale";

const dictionaries = { fr, en, es, de };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
