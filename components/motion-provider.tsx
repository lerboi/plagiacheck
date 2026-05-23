"use client"

import { MotionConfig } from "framer-motion"
import type { ReactNode } from "react"

/**
 * FE-15 — globally respect prefers-reduced-motion: reduce.
 *
 * framer-motion's MotionConfig with reducedMotion="user" automatically
 * suppresses transform / scale / position animations for every motion
 * component below this provider when the user's OS preference is set.
 * Opacity transitions still run (they're considered non-vestibular and
 * don't cause motion sickness).
 *
 * Lives in its own "use client" file so the root layout can stay a
 * Server Component — Next.js App Router doesn't allow importing client
 * primitives like MotionConfig directly into a server file.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
