import type { Metadata } from "next"
import type { ReactNode } from "react"
import { getLocale, getTranslations } from "next-intl/server"
import { Nav } from "@/components/nav"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy.metadata")
  return {
    title: t("title"),
    description: t("description"),
  }
}

const COLLECT_KEYS = ["personal", "usage", "cookies"] as const
const USE_KEYS = ["provide", "personalize", "communicate", "security", "legal"] as const
const SHARING_KEYS = ["providers", "legal"] as const
const RIGHTS_KEYS = ["access", "correction", "deletion", "optOut"] as const

const strong = (chunks: ReactNode) => <strong>{chunks}</strong>

export default async function Privacy() {
  const t = await getTranslations("Privacy")
  const locale = await getLocale()

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="container mx-auto px-4 max-w-4xl">
        <header className="bg-background py-8">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
          {locale === "zh" && (
            <p className="mt-4 max-w-3xl rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {t("translationNotice")}
            </p>
          )}
        </header>

        <section className="py-8 text-muted-foreground">
          <div className="space-y-8 max-w-3xl">
          <p>
            {t("intro.commitment")}
          </p>
          <p>
            {t("intro.agreement")}
          </p>

          <h2 className="text-xl font-semibold">{t("collect.heading")}</h2>
          <p>{t("collect.intro")}</p>
          <ul className="list-disc pl-6">
            {COLLECT_KEYS.map((k) => (
              <li key={k}>{t.rich(`collect.items.${k}`, { strong })}</li>
            ))}
          </ul>

          <h2 className="text-xl font-semibold">{t("use.heading")}</h2>
          <p>{t("use.intro")}</p>
          <ul className="list-disc pl-6">
            {USE_KEYS.map((k) => (
              <li key={k}>{t(`use.items.${k}`)}</li>
            ))}
          </ul>

          <h2 className="text-xl font-semibold">{t("sharing.heading")}</h2>
          <p>{t("sharing.intro")}</p>
          <ul className="list-disc pl-6">
            {SHARING_KEYS.map((k) => (
              <li key={k}>{t.rich(`sharing.items.${k}`, { strong })}</li>
            ))}
          </ul>

          <h2 className="text-xl font-semibold">{t("retention.heading")}</h2>
          <p>{t("retention.body")}</p>

          <h2 className="text-xl font-semibold">{t("rights.heading")}</h2>
          <p>{t("rights.intro")}</p>
          <ul className="list-disc pl-6">
            {RIGHTS_KEYS.map((k) => (
              <li key={k}>{t.rich(`rights.items.${k}`, { strong })}</li>
            ))}
          </ul>
          <p>{t("rights.outro")}</p>

          <h2 className="text-xl font-semibold">{t("security.heading")}</h2>
          <p>{t("security.body")}</p>

          <h2 className="text-xl font-semibold">{t("transfers.heading")}</h2>
          <p>{t("transfers.body")}</p>

          <h2 className="text-xl font-semibold">{t("changes.heading")}</h2>
          <p>{t("changes.body")}</p>

          <h2 className="text-xl font-semibold">{t("children.heading")}</h2>
          <p>{t("children.body")}</p>

          <h2 className="text-xl font-semibold">{t("contact.heading")}</h2>
          <p>{t("contact.body")}</p>
          <p>
            Plagiacheck
            <br />
            plagiacheck@gmail.com
          </p>
          </div>
        </section>
      </div>
    </div>
  )
}
