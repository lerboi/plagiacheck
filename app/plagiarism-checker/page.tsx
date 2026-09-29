import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import PlagiarismCheckerContent from "./content"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PlagiarismChecker.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/plagiarism-checker" },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "/plagiarism-checker",
    },
  }
}

export default function PlagiarismCheckerPage() {
  return <PlagiarismCheckerContent />
}
