import type React from "react"
import { motion } from "framer-motion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is plagiarism?",
    answer:
      "Plagiarism is the act of using someone else's words, ideas, or work without proper attribution or permission, presenting it as your own original work.",
  },
  {
    question: "How does the plagiarism checker work?",
    answer:
      "Plagiacheck uses a language model to review your text for similarity signals — phrasing patterns, repetition, and stylistic markers that suggest text may not be wholly original. It's a writing aid, not a definitive verdict.",
  },
  {
    question: "Is my content safe and confidential?",
    answer:
      "Yes. Your content is sent over HTTPS and is not stored after the check completes. We do not share or publish your work.",
  },
  {
    question: "How accurate is the detection?",
    answer:
      "Treat the score as a signal worth investigating, not a verdict. Some matches may be coincidental or common phrases — always review the highlighted passages yourself.",
  },
  {
    question: "Can I check multiple documents at once?",
    answer:
      "Currently you can check one document at a time. You can run multiple checks back-to-back.",
  },
  {
    question: "What file formats are supported for upload?",
    answer:
      "Plain-text files (.txt, .md) can be uploaded directly. For Word, Google Docs, or PDF, paste the text into the editor — full document parsing is on the roadmap.",
  },
  {
    question: "How long does it take to check a document?",
    answer:
      "Most checks finish within a few seconds. Longer documents may take up to a minute.",
  },
  {
    question: "Can I use this for academic papers?",
    answer:
      "Yes — but always follow your institution's guidelines for academic integrity. The score is a writing aid, not a substitute for proper citation practices.",
  },
  {
    question: "What should I do if matches are flagged in my work?",
    answer:
      "Review the highlighted passages, add citations where appropriate, or rephrase to make the wording your own. Make sure you're not unintentionally borrowing others' phrasing.",
  },
  {
    question: "Is there a limit to how many checks I can perform?",
    answer:
      "Each check costs tokens based on the length of your text. Your token balance is shown in the navbar. You can top up or subscribe on the pricing page.",
  },
]

export const FAQ: React.FC = () => {
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
          Frequently Asked Questions
        </motion.h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
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
