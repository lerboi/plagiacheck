"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
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
    const parts: string[] = []
    const tooShort = /password should be at least (\d+) characters/i.exec(message)
    if (tooShort) parts.push(t("passwordTooShort", { min: tooShort[1] }))
    const charset = /password should contain at least one character of each: (.+)$/i.exec(message)
    if (charset) parts.push(t("passwordCharacters", { sets: charset[1] }))
    if (/known to be weak/i.test(message)) parts.push(t("passwordPwned"))
    if (/should be different from the old password/i.test(message)) parts.push(t("samePassword"))
    if (/auth session missing/i.test(message)) parts.push(t("sessionMissing"))
    if (/requires reauthentication/i.test(message)) parts.push(t("reauthenticationNeeded"))
    if (/invalid or has expired|has expired or is invalid/i.test(message)) parts.push(t("linkExpired"))
    if (/failed to fetch|load failed|networkerror/i.test(message)) parts.push(t("network"))
    return parts.length ? parts.join("") : fallback
  }
}

export default function ResetPasswordPage() {
  const t = useTranslations("Auth")
  const supabaseMessage = useSupabaseMessage()
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Only a genuine password-recovery flow may show the form. A plain
    // existing session (user already signed in, no recovery link) is NOT
    // enough — we require the PASSWORD_RECOVERY event or a recovery token
    // in the URL hash.
    let isRecovery = false

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecovery = true
        setHasRecoverySession(true)
      }
    })

    // The PASSWORD_RECOVERY event can fire before this listener attaches.
    // Recovery links arrive in two shapes depending on the auth flow:
    // implicit flow puts "type=recovery" in the hash; PKCE flow puts a
    // "?code=" query param (exchanged for a session on load, which may
    // emit SIGNED_IN instead of PASSWORD_RECOVERY). Accept either link
    // shape as a recovery signal — a plain signed-in visit has neither.
    if (typeof window !== "undefined") {
      const hasRecoveryHash = window.location.hash.includes("type=recovery")
      const hasPkceCode = new URLSearchParams(window.location.search).has("code")
      if (hasRecoveryHash || hasPkceCode) {
        isRecovery = true
        setHasRecoverySession(true)
      }
    }

    // If no recovery signal arrives shortly, treat the visit as invalid.
    const timer = setTimeout(() => {
      if (!isRecovery) setHasRecoverySession(false)
    }, 2500)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  // Clear the post-success redirect timer if the page unmounts first.
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [])

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return t("reset.validation.minLength")
    if (!/[A-Z]/.test(pwd)) return t("reset.validation.uppercase")
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd))
      return t("reset.validation.specialChar")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const v = validatePassword(password)
    if (v) {
      setError(v)
      return
    }
    if (password !== confirmPassword) {
      setError(t("reset.validation.mismatch"))
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(t("reset.success"))
      await supabase.auth.signOut()
      redirectTimerRef.current = setTimeout(() => router.push("/signin"), 1500)
    } catch (err: any) {
      setError(supabaseMessage(err?.message, t("reset.updateFailed")))
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
              <CardTitle className="text-2xl font-bold">{t("reset.title")}</CardTitle>
              <CardDescription>
                {t("reset.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasRecoverySession === null ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 py-8"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {t("reset.verifying")}
                  </p>
                </div>
              ) : hasRecoverySession === false ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t("reset.invalidLink")}
                    </p>
                  </div>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/forgot-password">{t("reset.requestNewLink")}</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium">
                      {t("reset.newPassword")}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 border-2 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">
                      {t("reset.confirmPassword")}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {t("reset.updating")}
                      </>
                    ) : (
                      t("reset.submit")
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
