import fr from "./fr";
import en from "./en";
import es from "./es";
import type { Locale } from "../locale";

const dictionaries = { fr, en, es };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
