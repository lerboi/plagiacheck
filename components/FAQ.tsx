import type React from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
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
      "Our plagiarism checker uses advanced algorithms to compare your text against billions of web pages, academic papers, and other sources to identify potential instances of plagiarism.",
  },
  {
    question: "Is my content safe and confidential when I use the plagiarism checker?",
    answer:
      "Yes, we take your privacy seriously. Your content is encrypted and not stored after the check is complete. We do not share or publish your work.",
  },
  {
    question: "How accurate is the plagiarism detection?",
    answer:
      "Our plagiarism checker is highly accurate, but it's important to review the results carefully. Some matches may be coincidental or common phrases.",
  },
  {
    question: "Can I check multiple documents at once?",
    answer:
      "Currently, our system checks one document at a time for the most accurate results. However, you can run multiple checks in succession.",
  },
  {
    question: "What file formats are supported for upload?",
    answer:
      "We support various file formats including .txt, .doc, .docx, .pdf, and more. You can also paste text directly into the checker.",
  },
  {
    question: "How long does it take to check a document?",
    answer:
      "The time varies depending on the length of your document and current system load, but most checks are completed within a few minutes.",
  },
  {
    question: "Can I use this for academic papers?",
    answer:
      "Yes, our plagiarism checker is suitable for academic use. However, always follow your institution's guidelines for academic integrity.",
  },
  {
    question: "What should I do if plagiarism is detected in my work?",
    answer:
      "If plagiarism is detected, review the highlighted sections, add proper citations, or rephrase the content to make it original. Always ensure you're not unintentionally copying others' work.",
  },
  {
    question: "Is there a limit to how many checks I can perform?",
    answer:
      "The number of checks you can perform depends on your subscription plan. Free users have a limited number of checks, while premium users enjoy unlimited checks.",
  },
]

export const FAQ: React.FC = () => {
  const { theme } = useTheme()

  return (
    <section className={`${theme === "light" ? "text-gray-800" : "text-white"} py-16 backdrop-blur-sm`}>
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Frequently Asked Questions
        </motion.h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <AccordionItem value={`item-${index}`}>
                <AccordionTrigger className="hover:text-blue-400">{faq.question}</AccordionTrigger>
                <AccordionContent className="">{faq.answer}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

