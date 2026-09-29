import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config"

/**
 * Picks the highest-ranked supported language from an Accept-Language header,
 * so a first-time visitor whose browser prefers Chinese gets Chinese. Any zh-*
 * variant maps to Simplified Chinese.
 */
function localeFromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="))
      return {
        language: tag.trim().toLowerCase().split("-")[0],
        quality: q ? Number(q.slice(2)) : 1,
        index,
      }
    })
    .filter((entry) => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)

  return ranked.map((entry) => entry.language).find(isLocale)
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : localeFromAcceptLanguage((await headers()).get("accept-language")) ?? defaultLocale

  const messages =
    locale === "zh" ? (await import("../messages/zh")).default : (await import("../messages/en")).default

  return { locale, messages }
})
