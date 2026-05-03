'use client';
import { Suspense, useState } from 'react';
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
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long.';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character.';
    }
    return null;
  };

  const mapAuthError = (err: unknown): string => {
    const anyErr = err as { message?: string; status?: number };
    const message = (anyErr?.message || "").toLowerCase();
    const status = anyErr?.status;
    if (status === 429 || message.includes("rate limit") || message.includes("too many"))
      return "Too many attempts. Please wait a minute and try again.";
    if (message.includes("email not confirmed") || message.includes("not verified"))
      return "Please verify your email first. Check your inbox for the confirmation link.";
    if (message.includes("invalid login credentials") || message.includes("invalid email or password"))
      return "Email or password is incorrect.";
    if (message.includes("user not found"))
      return "No account found with that email.";
    if (message.includes("user already registered") || message.includes("already registered"))
      return "An account with this email already exists. Try signing in instead.";
    if (message.includes("password should be") || message.includes("weak password"))
      return anyErr?.message || "Please choose a stronger password.";
    if (message.includes("network") || message.includes("fetch") || err instanceof TypeError)
      return "__network__";
    return anyErr?.message || "Something went wrong. Please try again.";
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

      router.push('/');
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setSuccess('Registration successful! Please check your email to confirm your account.');
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
    <div className="fixed inset-0 flex z-40">
      {/* Left dark branding panel */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-[42%] flex-col justify-between p-10 xl:p-14 bg-slate-900 text-white">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full text-blue-400 scale-[170%] flex items-center justify-center">
            <PiLetterCircleP />
          </div>
          <span className="font-bold text-lg ml-1">plagiacheck</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Write with<br />confidence.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              Plagiarism detection, AI tools, and writing assistance — built for students and professionals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Plagiarism Checker", "AI Detector", "Grammar Fixer", "Paraphraser"].map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-slate-300 border border-white/10"
              >
                {f}
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
          <div className="flex lg:hidden items-center gap-2">
            <div className="h-7 w-7 rounded-full text-blue-400 scale-[170%] flex items-center justify-center">
              <PiLetterCircleP />
            </div>
            <span className="font-bold ml-1">plagiacheck</span>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={searchParams.get('tab') || 'signin'} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-10 p-1 bg-muted rounded-lg mb-6">
              <TabsTrigger value="signin" className="rounded-md text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-md text-sm">Create Account</TabsTrigger>
            </TabsList>

            {/* Sign in tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
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
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <a
                      href="/forgot-password"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
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
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Can&apos;t reach authentication server</p>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                        The authentication service is temporarily unavailable. This is usually fixed by refreshing the page or waiting a moment.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setIsNetworkError(false); window.location.reload(); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reload page
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
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
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
                  <Label htmlFor="register-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Min. 8 characters · one uppercase · one special character
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
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Can&apos;t reach authentication server</p>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                        The authentication service is temporarily unavailable. Try reloading the page.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setIsNetworkError(false); window.location.reload(); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reload page
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
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
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
      <div className="fixed inset-0 flex items-center justify-center bg-background z-40">
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
