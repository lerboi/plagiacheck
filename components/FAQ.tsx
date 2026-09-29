"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const DEFAULT_FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"] as const

export interface FAQItem {
  question: string
  answer: string
}

export const FAQ: React.FC<{ items?: FAQItem[] }> = ({ items }) => {
  const t = useTranslations("Faq")
  const faqs =
    items ??
    DEFAULT_FAQ_KEYS.map((key) => ({
      question: t(`items.${key}.question`),
      answer: t(`items.${key}.answer`),
    }))
  return (
    <section className="text-foreground py-16 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t("heading")}
        </motion.h2>
        <Accordion type="single" collapsible className="w-full max-w-4xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: Math.min(index, 5) * 0.05 }}
            >
              <AccordionItem value={`item-${index}`}>
                <AccordionTrigger className="hover:text-blue-500 dark:hover:text-blue-400">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
