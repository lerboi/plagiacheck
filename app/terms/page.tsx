import type { Metadata } from "next"
import type { ReactNode } from "react"
import { getLocale, getTranslations } from "next-intl/server"
import { Nav } from "@/components/nav"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms.metadata")
  return {
    title: t("title"),
    description: t("description"),
  }
}

const USE_KEYS = ["law", "unlawful", "interfere", "access"] as const

const strong = (chunks: ReactNode) => <strong>{chunks}</strong>

export default async function Terms() {
  const t = await getTranslations("Terms")
  const locale = await getLocale()

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <section className="container mx-auto px-4 max-w-4xl py-12">
        <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("lastUpdated")}</p>
        {locale === "zh" && (
          <p className="-mt-4 mb-8 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t("translationNotice")}
          </p>
        )}
        <p className="text-lg mb-4">
          {t("intro")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("acceptance.heading")}</h2>
        <p className="text-lg mb-4">
          {t("acceptance.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("eligibility.heading")}</h2>
        <p className="text-lg mb-4">
          {t("eligibility.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("account.heading")}</h2>
        <p className="text-lg mb-4">
          {t("account.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("use.heading")}</h2>
        <p className="text-lg mb-4">
          {t("use.intro")}
        </p>
        <ul className="list-disc pl-6 mb-4">
          {USE_KEYS.map((k) => (
            <li key={k}>{t(`use.items.${k}`)}</li>
          ))}
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("payment.heading")}</h2>
        <p className="text-lg mb-4">
          {t("payment.fees")}
        </p>
        <p className="text-lg mb-4">
          {t("payment.recurring")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("plagiarism.heading")}</h2>
        <p className="text-lg mb-4">
          {t("plagiarism.accuracy")}
        </p>
        <p className="text-lg mb-4">
          {t("plagiarism.responsibility")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("ip.heading")}</h2>
        <p className="text-lg mb-4">
          {t("ip.ownership")}
        </p>
        <p className="text-lg mb-4">
          {t("ip.license")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("userContent.heading")}</h2>
        <p className="text-lg mb-4">
          {t("userContent.responsibility")}
        </p>
        <p className="text-lg mb-4">
          {t("userContent.warranty")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("termination.heading")}</h2>
        <p className="text-lg mb-4">
          {t("termination.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("disclaimers.heading")}</h2>
        <p className="text-lg mb-4">
          {t("disclaimers.asIs")}
        </p>
        <p className="text-lg mb-4">
          {t("disclaimers.liability")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("indemnification.heading")}</h2>
        <p className="text-lg mb-4">
          {t("indemnification.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("privacy.heading")}</h2>
        <p className="text-lg mb-4">
          {t("privacy.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("changes.heading")}</h2>
        <p className="text-lg mb-4">
          {t("changes.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("governingLaw.heading")}</h2>
        <p className="text-lg mb-4">
          {t("governingLaw.body")}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("misc.heading")}</h2>
        <p className="text-lg mb-4">
          {t.rich("misc.entireAgreement", { strong })}
        </p>
        <p className="text-lg mb-4">
          {t.rich("misc.severability", { strong })}
        </p>
        <p className="text-lg mb-4">
          {t.rich("misc.waiver", { strong })}
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">{t("contact.heading")}</h2>
        <p className="text-lg mb-4">
          {t("contact.body")}
        </p>
        <p className="text-lg mb-4">
          Plagiacheck<br />
          plagiacheck@gmail.com
        </p>
        </div>
      </section>
    </div>
  )
}
