"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useLocale, useTranslations } from "next-intl"

/**
 * Supabase answers in English. English keeps the message exactly as before;
 * Chinese gets a translation of the common ones, otherwise the translated
 * fallback.
 */
function useSupabaseMessage() {
  const t = useTranslations("Auth.supabase")
  const locale = useLocale()
  return (message: string | undefined, fallback: string): string => {
    if (locale === "en") return message || fallback
    if (!message) return fallback
    if (/unable to validate email address|email address .* is invalid/i.test(message)) return t("invalidEmail")
    if (/failed to fetch|load failed|networkerror/i.test(message)) return t("network")
    return fallback
  }
}

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth")
  const supabaseMessage = useSupabaseMessage()
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) throw resetError

      setSuccess(t("forgot.success"))
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase()
      if (msg.includes("rate") || err?.status === 429) {
        setError(t("errors.rateLimit"))
      } else {
        setError(supabaseMessage(err?.message, t("errors.generic")))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="max-w-md mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold">{t("forgot.title")}</CardTitle>
              <CardDescription>
                {t("forgot.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-medium">
                    {t("fields.email")}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      role="alert"
                      className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("forgot.sending")}
                    </>
                  ) : (
                    t("forgot.submit")
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/signin"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  {t("forgot.backToSignIn")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
