"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

interface ResultRevealProps {
  /** Whether the wrapped result is present. Toggling true mounts the
   *  children inside an entrance animation; toggling false unmounts
   *  them and plays the exit. */
  show: boolean
  children: ReactNode
  /** Optional className applied to the inner motion.div. */
  className?: string
}

/**
 * FE-14 — shared reveal wrapper for tool result panels.
 *
 * Wrap the result render in `<ResultReveal show={!!result}>...children...</ResultReveal>`
 * to get a soft entrance (250ms opacity + small Y-translate) when the
 * tool finishes and a corresponding exit when the user clears.
 *
 * Respects `prefers-reduced-motion: reduce` — under that media query the
 * wrapper renders the children with no motion. The wrapper still mounts
 * inside an AnimatePresence so future motion-enabled callers behave
 * consistently.
 */
export function ResultReveal({ show, children, className }: ResultRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -2 },
        transition: { duration: 0.25, ease: "easeOut" as const },
      }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {show && (
        <motion.div key="result" {...motionProps} className={className}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
