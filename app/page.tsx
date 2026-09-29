import type { Metadata } from "next"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import { MessageSquare, Wrench, CheckCircle2, Shield, Zap, GraduationCap } from "lucide-react"
import { PlagiaAiApp } from "@/components/plagia-ai/PlagiaAiApp"
import { OneChatAllTools } from "@/components/plagia-ai/OneChatAllTools"
import { FAQ } from "@/components/FAQ"
import { MarketingReveal } from "@/components/plagia-ai/MarketingReveal"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/" },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "/",
    },
  }
}

const HOW_IT_WORKS_STEPS = [
  { id: "ask", icon: MessageSquare },
  { id: "dispatch", icon: Wrench },
  { id: "result", icon: CheckCircle2 },
] as const

function HowItWorks() {
  const t = useTranslations("Home.howItWorks")
  const steps = HOW_IT_WORKS_STEPS.map((step) => ({
    id: step.id,
    icon: step.icon,
    title: t(`steps.${step.id}.title`),
    desc: t(`steps.${step.id}.desc`),
  }))
  return (
    <section className="py-14 md:py-16 border-t border-border bg-muted/20">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("title")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {steps.map((step, i) => (
            <MarketingReveal
              key={step.id}
              delay={i * 0.08}
              className="rounded-2xl border border-border p-6 bg-background transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  0{i + 1}
                </span>
                <step.icon className="h-4 w-4 text-violet-500" />
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </MarketingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const TRUST_PILLS = [
  { id: "private", icon: Shield },
  { id: "fast", icon: Zap },
  { id: "audience", icon: GraduationCap },
] as const

function TrustSignals() {
  const t = useTranslations("Home.trust")
  const pills = TRUST_PILLS.map((pill) => ({ id: pill.id, icon: pill.icon, label: t(pill.id) }))
  return (
    <section className="py-10 md:py-12 border-t border-border">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-3 md:gap-4">
        {pills.map((pill, i) => (
          <MarketingReveal
            key={pill.id}
            delay={i * 0.06}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-sm text-foreground transition-colors hover:border-foreground/20"
          >
            <pill.icon className="h-4 w-4 text-muted-foreground" />
            {pill.label}
          </MarketingReveal>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <PlagiaAiApp
      marketingFooter={
        <>
          <OneChatAllTools />
          <HowItWorks />
          <TrustSignals />
          <FAQ />
        </>
      }
    />
  )
}
