"use client"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/** The three choices, shared by both triggers below. */
function ThemeItems() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations("Nav.theme")
  return (
    <>
      <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "font-semibold" : undefined}>
        <Sun className="h-4 w-4 mr-2" />
        {t("light")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "font-semibold" : undefined}>
        <Moon className="h-4 w-4 mr-2" />
        {t("dark")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "font-semibold" : undefined}>
        <Monitor className="h-4 w-4 mr-2" />
        {t("system")}
      </DropdownMenuItem>
    </>
  )
}

/** Bordered icon button — the desktop nav. */
export function ThemeToggle() {
  const t = useTranslations("Nav.theme")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="focus-visible:ring-0 focus-visible:ring-offset-0" aria-label={t("toggle")}>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("toggle")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Full-width list row — the mobile sheet. The whole row is the trigger, so it
 * matches the links it sits with instead of pairing a label with a separate
 * bordered button, and the right-hand side names the current mode rather than
 * repeating the icon already at the start of the row.
 */
export function ThemeMenuRow() {
  const { theme } = useTheme()
  const t = useTranslations("Nav.theme")
  // next-themes only knows the stored preference after mount; render the label
  // empty until then so the server and client markup agree.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const label = theme === "light" ? t("light") : theme === "dark" ? t("dark") : t("system")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-3 w-full py-3 px-3 rounded-lg hover:bg-accent transition-colors focus-visible:outline-none"
        aria-label={t("change")}
      >
        <Sun className="h-5 w-5 text-muted-foreground shrink-0 dark:hidden" />
        <Moon className="h-5 w-5 text-muted-foreground shrink-0 hidden dark:block" />
        <span className="font-medium text-sm">{t("label")}</span>
        <span className="ml-auto text-xs text-muted-foreground">{mounted ? label : ""}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
