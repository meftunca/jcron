// src/humanize/locales/index.ts
// All supported locales export

export { enLocale } from "./en.js";
export { frLocale } from "./fr.js";
export { trLocale } from "./tr.js";
export { esLocale } from "./es.js";
export { deLocale } from "./de.js";
export { plLocale } from "./pl.js";
export { ptLocale } from "./pt.js";
export { itLocale } from "./it.js";
export { czLocale } from "./cz.js";
export { nlLocale } from "./nl.js";

/**
 * All available locales with their display names
 */
export const AVAILABLE_LOCALES = {
  en: { name: "English", nativeName: "English" },
  fr: { name: "French", nativeName: "Français" },
  tr: { name: "Turkish", nativeName: "Türkçe" },
  es: { name: "Spanish", nativeName: "Español" },
  de: { name: "German", nativeName: "Deutsch" },
  pl: { name: "Polish", nativeName: "Polski" },
  pt: { name: "Portuguese", nativeName: "Português" },
  it: { name: "Italian", nativeName: "Italiano" },
  cz: { name: "Czech", nativeName: "Čeština" },
  cs: { name: "Czech", nativeName: "Čeština" }, // Alias
  nl: { name: "Dutch", nativeName: "Nederlands" },
} as const;

/**
 * Get locale display name
 */
export function getLocaleDisplayName(locale: string): string {
  const info = AVAILABLE_LOCALES[locale as keyof typeof AVAILABLE_LOCALES];
  return info ? info.nativeName : locale;
}

/**
 * Get all locale codes
 */
export function getAllLocaleCodes(): string[] {
  return Object.keys(AVAILABLE_LOCALES);
}
