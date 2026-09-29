"use client"
import { Check, Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { localeNames, locales, type Locale } from "@/i18n/config"
import { setUserLocale } from "@/i18n/actions"

/**
 * Stores the choice in a cookie via a server action. Setting a cookie from a
 * server action re-renders the current route in place, so the page switches
 * language without a navigation and anything typed into a tool is kept.
 */
function useChangeLocale() {
  const [isPending, startTransition] = useTransition()
  const changeLocale = (next: Locale) => {
    startTransition(async () => {
      await setUserLocale(next)
    })
  }
  return { changeLocale, isPending }
}

/** The choices, shared by both triggers below. Names are written in their own language. */
function LanguageItems({ onSelect }: { onSelect: (locale: Locale) => void }) {
  const current = useLocale()
  return (
    <>
      {locales.map((locale) => (
        <DropdownMenuItem
          key={locale}
          onClick={() => onSelect(locale)}
          className={locale === current ? "font-semibold" : undefined}
          lang={locale}
        >
          <span className="flex-1">{localeNames[locale]}</span>
          {locale === current && <Check className="h-4 w-4 ml-3" />}
        </DropdownMenuItem>
      ))}
    </>
  )
}

/** Bordered icon button — the desktop nav, next to the theme toggle. */
export function LanguageToggle() {
  const t = useTranslations("Nav.language")
  const { changeLocale, isPending } = useChangeLocale()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label={t("change")}
          disabled={isPending}
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("change")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <LanguageItems onSelect={changeLocale} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Full-width list row — the mobile sheet. Matches ThemeMenuRow: the whole row
 * is the trigger and the right-hand side names the current language.
 */
export function LanguageMenuRow() {
  const t = useTranslations("Nav.language")
  const current = useLocale()
  const { changeLocale, isPending } = useChangeLocale()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-3 w-full py-3 px-3 rounded-lg hover:bg-accent transition-colors focus-visible:outline-none disabled:opacity-60"
        aria-label={t("change")}
        disabled={isPending}
      >
        <Languages className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="font-medium text-sm">{t("label")}</span>
        <span className="ml-auto text-xs text-muted-foreground" lang={current}>
          {localeNames[current]}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <LanguageItems onSelect={changeLocale} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
