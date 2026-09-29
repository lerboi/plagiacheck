"use client"

import { useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import type en from "@/messages/en"

type ApiErrorKey = keyof (typeof en)["ApiErrors"]

/**
 * The API routes answer in English. These are the messages they send (plus the
 * browser's own fetch failures), mapped to translated equivalents. Keeping the
 * mapping on the client means the routes and their token logic stay untouched.
 */
const KNOWN_MESSAGES: Record<string, ApiErrorKey> = {
  Unauthorized: "unauthorized",
  "Missing text or tool parameter": "invalidRequest",
  "Missing or invalid text parameter": "invalidRequest",
  "Invalid text parameter": "invalidRequest",
  "Invalid tool": "invalidRequest",
  "No transcript provided": "invalidRequest",
  "Invalid transcript parameter": "invalidRequest",
  "Invalid JSON": "invalidRequest",
  "Invalid messages payload": "invalidRequest",
  "Invalid directDispatch args": "invalidRequest",
  "Invalid directDispatch callId": "invalidRequest",
  "No image provided": "noImage",
  "Image too large (max ~8MB)": "imageTooLarge",
  "AI service not configured": "aiNotConfigured",
  "Insufficient tokens": "insufficientTokens",
  "Insufficient image tokens": "insufficientImageTokens",
  "AI service temporarily unavailable. Please try again.": "aiUnavailable",
  "No response from AI": "aiBadResponse",
  "Failed to parse AI response": "aiBadResponse",
  "Invalid chart spec from AI": "aiBadResponse",
  "Invalid infographic spec from AI": "aiBadResponse",
  "Invalid thumbnail spec from AI": "aiBadResponse",
  "Could not extract chart data from your description. Add concrete values or steps and try again — no tokens were charged.":
    "chartNoData",
  "Could not extract enough content for an infographic. Provide more detail and try again — no tokens were charged.":
    "infographicNoContent",
  "Failed to process image. Please try again.": "imageFailed",
  "Failed to process image": "imageFailed",
  "Failed to process transcript": "transcriptFailed",
  "Analysis failed. Tokens have been refunded.": "analysisFailedRefunded",
  "Internal server error": "internal",
  "Network error": "network",
  "Failed to fetch": "network",
  "Load failed": "network",
  "NetworkError when attempting to fetch resource.": "network",
}

const KNOWN_CODES: Record<string, ApiErrorKey> = {
  INSUFFICIENT_TOKENS: "insufficientTokens",
  INSUFFICIENT_IMAGE_TOKENS: "insufficientImageTokens",
}

const TOO_LONG = /exceeds maximum length of ([\d,]+) characters/i
const HAS_CJK = /[㐀-鿿]/

/**
 * Returns a function that turns an API error into text for the current
 * language. Pass either the parsed JSON body (`{ error, code }`) or a message
 * string, plus a fallback already translated for this call site.
 *
 * - English: the server's message is returned unchanged (or the fallback when
 *   there is none), so English behaviour is exactly as before.
 * - Chinese: known messages are translated; anything else that is not already
 *   Chinese is replaced by the fallback rather than shown in English.
 */
export function useApiErrorMessage() {
  const t = useTranslations("ApiErrors")
  const locale = useLocale()

  return useCallback(
    (source: unknown, fallback: string): string => {
      let message = ""
      let code = ""
      if (typeof source === "string") {
        message = source
      } else if (source instanceof Error) {
        message = source.message
      } else if (source && typeof source === "object") {
        const body = source as { error?: unknown; code?: unknown }
        if (typeof body.error === "string") message = body.error
        if (typeof body.code === "string") code = body.code
      }
      message = message.trim()

      if (locale === "en") return message || fallback

      if (code && KNOWN_CODES[code]) return t(KNOWN_CODES[code])
      if (!message) return fallback
      const known = KNOWN_MESSAGES[message]
      if (known) return t(known)
      const tooLong = TOO_LONG.exec(message)
      if (tooLong) return t("textTooLong", { max: Number(tooLong[1].replace(/,/g, "")) })
      return HAS_CJK.test(message) ? message : fallback
    },
    [t, locale]
  )
}
