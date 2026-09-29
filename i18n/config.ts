export const locales = ["en", "zh"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

/** Cookie that stores the visitor's chosen language. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

/** Each language's name written in that language, so it stays recognisable whichever one is active. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
}

/** BCP 47 tags for `<html lang>`, the Web Speech API and `Intl` formatting. */
export const localeTags: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}
