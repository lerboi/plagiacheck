import type { Metadata } from "next"
import PlagiarismCheckerContent from "./content"

export const metadata: Metadata = {
  title: "Plagiarism Checker — Plagiacheck",
  description:
    "AI-powered plagiarism detection with sentence-level highlighting. Paste your text or upload a .txt/.md file and get a similarity report in seconds.",
  alternates: { canonical: "/plagiarism-checker" },
  openGraph: {
    title: "Plagiarism Checker — Plagiacheck",
    description:
      "AI-powered plagiarism detection with sentence-level highlighting. Paste your text or upload a file to get a similarity report in seconds.",
    type: "website",
    url: "/plagiarism-checker",
  },
}

export default function PlagiarismCheckerPage() {
  return <PlagiarismCheckerContent />
}
