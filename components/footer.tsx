import Link from "next/link"
import { getTranslations } from "next-intl/server"

export async function Footer() {
  const t = await getTranslations("Shell.footer")
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 flex flex-wrap gap-x-6 gap-y-2 min-h-16 py-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 hover:underline underline-offset-4"
          >
            {t("terms")}
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 hover:underline underline-offset-4"
          >
            {t("privacy")}
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          {t("copyright", { year: String(new Date().getFullYear()) })}
        </div>
      </div>
    </footer>
  )
}

