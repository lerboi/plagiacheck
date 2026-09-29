'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Sparkles, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { PiLetterCircleP } from 'react-icons/pi';
import { useLocale, useTranslations } from 'next-intl';

const FEATURE_KEYS = ["plagiarismChecker", "aiDetector", "grammarFixer", "paraphraser"] as const;

/**
 * Supabase answers in English. English keeps the message exactly as before;
 * Chinese gets a translation of the common ones, otherwise the translated
 * fallback for this call site.
 */
function useSupabaseMessage() {
  const t = useTranslations('Auth.supabase');
  const locale = useLocale();
  return (message: string | undefined, fallback: string): string => {
    if (locale === 'en') return message || fallback;
    if (!message) return fallback;
    const parts: string[] = [];
    const tooShort = /password should be at least (\d+) characters/i.exec(message);
    if (tooShort) parts.push(t('passwordTooShort', { min: tooShort[1] }));
    const charset = /password should contain at least one character of each: (.+)$/i.exec(message);
    if (charset) parts.push(t('passwordCharacters', { sets: charset[1] }));
    if (/known to be weak/i.test(message)) parts.push(t('passwordPwned'));
    if (/unable to validate email address|email address .* is invalid/i.test(message)) parts.push(t('invalidEmail'));
    if (/signups? not allowed|signups are disabled/i.test(message)) parts.push(t('signupsDisabled'));
    return parts.length ? parts.join('') : fallback;
  };
}

function AuthForm({
  email,
  password,
  setEmail,
  setPassword,
  error,
  setError,
  supabase,
  router,
}: {
  email: string;
  password: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  supabase: SupabaseClient;
  router: ReturnType<typeof useRouter>;
}) {
  const t = useTranslations('Auth');
  const supabaseMessage = useSupabaseMessage();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get('tab') === 'register' ? 'register' : 'signin'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError(null);
    setSuccess(null);
    setIsNetworkError(false);
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return t('signin.validation.minLength');
    }
    if (!hasUpperCase) {
      return t('signin.validation.uppercase');
    }
    if (!hasSpecialChar) {
      return t('signin.validation.specialChar');
    }
    return null;
  };

  const mapAuthError = (err: unknown): string => {
    const anyErr = err as { message?: string; status?: number };
    const message = (anyErr?.message || "").toLowerCase();
    const status = anyErr?.status;
    if (status === 429 || message.includes("rate limit") || message.includes("too many"))
      return t("errors.rateLimit");
    if (message.includes("email not confirmed") || message.includes("not verified"))
      return t("errors.emailNotConfirmed");
    if (message.includes("invalid login credentials") || message.includes("invalid email or password"))
      return t("errors.invalidCredentials");
    if (message.includes("user not found"))
      return t("errors.userNotFound");
    if (message.includes("user already registered") || message.includes("already registered"))
      return t("errors.alreadyRegistered");
    if (message.includes("password should be") || message.includes("weak password"))
      return supabaseMessage(anyErr?.message, t("errors.weakPassword"));
    if (message.includes("network") || message.includes("fetch") || err instanceof TypeError)
      return "__network__";
    return supabaseMessage(anyErr?.message, t("errors.generic"));
  };

  const handleSignIn = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setIsNetworkError(false);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      const mapped = mapAuthError(err);
      if (mapped === "__network__") {
        setIsNetworkError(true);
        setError(null);
      } else {
        setError(mapped);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsNetworkError(false);
    setIsLoading(true);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Supabase returns a user with an empty identities array when the
      // email is already registered (to avoid leaking account existence via
      // an error). Surface it as the "already registered" case.
      if (data.user?.identities?.length === 0) {
        setError(t('errors.alreadyRegistered'));
        return;
      }

      setSuccess(t('signin.registerSuccess'));
    } catch (err) {
      const mapped = mapAuthError(err);
      if (mapped === "__network__") {
        setIsNetworkError(true);
      } else {
        setError(mapped);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* h-screen-dvh rather than inset-0: a fixed box sized to the layout
       viewport extends behind Safari's bottom bar, cutting off the tail of the
       form panel (this is the page's only scroller). dvh ends it at the real
       visible edge. */
    <div className="fixed inset-x-0 top-0 h-screen-dvh flex z-40">
      {/* Left dark branding panel */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-[42%] flex-col justify-between p-10 xl:p-14 bg-slate-900 text-white">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <div className="h-8 w-8 rounded-full text-blue-400 scale-[170%] flex items-center justify-center">
            <PiLetterCircleP />
          </div>
          <span className="font-bold text-lg ml-1">plagiacheck</span>
        </Link>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              {t('signin.headlineLine1')}<br />{t('signin.headlineLine2')}
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              {t('signin.tagline')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FEATURE_KEYS.map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-slate-300 border border-white/10"
              >
                {t(`signin.features.${f}`)}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Plagiacheck</p>
      </div>

      {/* Right form panel — overflow-y-auto must NOT be on the same flex container
           that does align-items:center, or tall content gets top-clipped and
           unreachable. Pattern: outer flex-1 clips, inner min-h-full centers. */}
      <div className="flex-1 bg-background overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center py-10 px-6 sm:px-10">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 w-fit">
            <div className="h-7 w-7 rounded-full text-blue-400 scale-[170%] flex items-center justify-center">
              <PiLetterCircleP />
            </div>
            <span className="font-bold ml-1">plagiacheck</span>
          </Link>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {activeTab === 'register' ? t('signin.registerTitle') : t('signin.welcomeTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'register'
                ? t('signin.registerSubtitle')
                : t('signin.welcomeSubtitle')}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-10 p-1 bg-muted rounded-lg mb-6">
              <TabsTrigger value="signin" className="rounded-md text-sm">{t('signin.tabs.signIn')}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-md text-sm">{t('signin.tabs.register')}</TabsTrigger>
            </TabsList>

            {/* Sign in tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-sm font-medium">{t('fields.email')}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-sm font-medium">{t('fields.password')}</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t('signin.forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('signin.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isNetworkError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t('signin.network.title')}</p>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                        {t('signin.network.bodySignIn')}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setIsNetworkError(false); window.location.reload(); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('signin.network.reload')}
                      </button>
                    </motion.div>
                  )}
                  {error && !isNetworkError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('signin.signingIn')}
                    </>
                  ) : (
                    t('signin.submitSignIn')
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="register-email" className="text-sm font-medium">{t('fields.email')}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="register-password" className="text-sm font-medium">{t('fields.password')}</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder={t('signin.createPasswordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      aria-label={showRegisterPassword ? t("fields.hidePassword") : t("fields.showPassword")}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t('signin.passwordHint')}
                  </p>
                </div>

                <AnimatePresence>
                  {isNetworkError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t('signin.network.title')}</p>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                        {t('signin.network.bodyRegister')}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setIsNetworkError(false); window.location.reload(); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('signin.network.reload')}
                      </button>
                    </motion.div>
                  )}
                  {error && !isNetworkError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('signin.creatingAccount')}
                    </>
                  ) : (
                    t('signin.submitRegister')
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  return (
    <Suspense fallback={
      <div className="fixed inset-x-0 top-0 h-screen-dvh flex items-center justify-center bg-background z-40">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <AuthForm
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        error={error}
        setError={setError}
        supabase={supabase}
        router={router}
      />
    </Suspense>
  );
}
