// src/humanize/locales/index.ts
// All supported locales export

export { enLocale } from "./en";
export { frLocale } from "./fr";
export { trLocale } from "./tr";
export { esLocale } from "./es";
export { deLocale } from "./de";
export { plLocale } from "./pl";
export { ptLocale } from "./pt";
export { itLocale } from "./it";
export { czLocale } from "./cz";
export { nlLocale } from "./nl";

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
