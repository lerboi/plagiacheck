import type { Metadata } from "next"
import { MessageSquare, Wrench, CheckCircle2, Shield, Zap, GraduationCap } from "lucide-react"
import { PlagiaAiApp } from "@/components/plagia-ai/PlagiaAiApp"
import { OneChatAllTools } from "@/components/plagia-ai/OneChatAllTools"
import { FAQ } from "@/components/FAQ"

export const metadata: Metadata = {
  title: "Plagiacheck — AI plagiarism checker, paraphraser, summarizer & 12 more writing tools",
  description:
    "One chat, 15 AI writing tools. Plagiarism detection, paraphrasing, summarization, AI detection, grammar checking, charts, infographics, and more — all driven by PlagiaAI.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Plagiacheck — One chat, every writing tool",
    description:
      "Chat with PlagiaAI to run any of 15 tools: plagiarism checker, paraphraser, summarizer, AI detector, grammar checker, and more.",
    type: "website",
    url: "/",
  },
}

function HowItWorks() {
  const steps = [
    { icon: MessageSquare, title: "You ask.", desc: "Type or speak what you need — plain English." },
    { icon: Wrench, title: "PlagiaAI dispatches.", desc: "It picks the right tool from 15 available." },
    { icon: CheckCircle2, title: "You get the result.", desc: "Output appears in chat, ready to copy or download." },
  ]
  return (
    <section className="py-14 md:py-16 border-t border-border bg-muted/20">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-border p-6 bg-background">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  0{i + 1}
                </span>
                <step.icon className="h-4 w-4 text-violet-500" />
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustSignals() {
  const pills = [
    { icon: Shield, label: "Private by default" },
    { icon: Zap, label: "Fast results" },
    { icon: GraduationCap, label: "Built for students & writers" },
  ]
  return (
    <section className="py-10 md:py-12 border-t border-border">
      <div className="container max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-3 md:gap-4">
        {pills.map((pill) => (
          <div
            key={pill.label}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-sm text-foreground"
          >
            <pill.icon className="h-4 w-4 text-muted-foreground" />
            {pill.label}
          </div>
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
