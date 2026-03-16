"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/Billing/Badge"
import {
  CreditCard,
  Calendar,
  DollarSign,
  Crown,
  CheckCircle,
  ArrowUpRight,
  FileText,
  Clock,
  Loader2,
  User as UserIcon,
  Mail,
  Image as ImageIcon,
  Mic,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { useTokenStore } from "@/lib/store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PaymentRecord {
  id: string
  amount: number
  status: string
  createdAt: string
  paymentType: string
}

interface PackageRecord {
  id: string
  packageName: string
  status: string
  expiryDate: string
  startDate: string
}

interface UserProfile {
  tokens: number
  plan: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
}

export default function Billing() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [activePackage, setActivePackage] = useState<PackageRecord | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const { remainingWords, remainingImageTokens, fetchRemainingWords, fetchImageTokens } = useTokenStore()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        await Promise.all([
          fetchBillingData(session.user.id),
          fetchRemainingWords(session.user.id),
          fetchImageTokens(session.user.id),
        ])
      }
      setLoading(false)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchBillingData(session.user.id)
        fetchRemainingWords(session.user.id)
        fetchImageTokens(session.user.id)
      }
    })

    return () => { authListener.subscription.unsubscribe() }
  }, [supabase.auth])

  const fetchBillingData = async (userId: string) => {
    const [paymentResult, packageResult, profileResult] = await Promise.all([
      supabase
        .from('Payment')
        .select('id, amount, status, createdAt, paymentType')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(20),
      supabase
        .from('Package')
        .select('id, packageName, status, expiryDate, startDate')
        .eq('userId', userId)
        .eq('status', 'ACTIVE')
        .order('startDate', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('user_profiles')
        .select('tokens, plan, subscription_status, stripe_customer_id')
        .eq('id', userId)
        .single(),
    ])

    if (paymentResult.data) setPayments(paymentResult.data)
    if (packageResult.data) setActivePackage(packageResult.data)
    if (profileResult.data) setUserProfile(profileResult.data)
  }

  const getPlanName = () => {
    if (userProfile?.plan) {
      return userProfile.plan
    }
    if (activePackage) {
      if (activePackage.packageName === '200Image') return '200 Image Package'
      if (activePackage.packageName === '1000Image') return '1000 Image Package'
      return activePackage.packageName
    }
    return 'Free'
  }

  const getPlanBadgeColor = () => {
    const plan = getPlanName()
    if (plan === 'Premium') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    if (plan === 'Plus') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  const isSubscribed = userProfile?.subscription_status === 'active'

  const totalSpent = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0)

  const accountAgeDays = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const getDisplayName = (email: string) => email.split('@')[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Sign in to view your account</h1>
            <p className="text-muted-foreground">Manage your profile, tokens, and billing information</p>
            <Button asChild size="lg">
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container py-8 md:py-12 max-w-6xl mx-auto px-4">
        <div className="space-y-8">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Account & Billing</h1>
              <p className="text-muted-foreground mt-1">Manage your profile, tokens, and payment history</p>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg" asChild>
              <Link href="/pricing">
                <Crown className="mr-2 h-4 w-4" />
                {isSubscribed ? 'Manage Plan' : 'Upgrade Plan'}
              </Link>
            </Button>
          </div>

          {/* Profile Card + Plan Card - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Profile Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-semibold">
                      {(user.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">{getDisplayName(user.email || 'User')}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-muted-foreground mb-1">Member since</p>
                    <p className="text-sm font-medium text-foreground">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-muted-foreground mb-1">Account age</p>
                    <p className="text-sm font-medium text-foreground">
                      {accountAgeDays} {accountAgeDays === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-muted-foreground mb-1">Auth provider</p>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {user.app_metadata?.provider || 'Email'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-muted-foreground mb-1">Email status</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      Verified
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Plan Card */}
            <Card className={`border-2 ${isSubscribed ? 'border-blue-200 dark:border-blue-900/40' : 'border-gray-200 dark:border-gray-800'}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="h-4 w-4 text-muted-foreground" />
                    Current Plan
                  </CardTitle>
                  <Badge variant="secondary" className={getPlanBadgeColor()}>
                    {getPlanName()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={`text-sm font-medium flex items-center gap-1.5 ${isSubscribed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {isSubscribed ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> Active</>
                      ) : (
                        <><AlertCircle className="h-3.5 w-3.5" /> Free tier</>
                      )}
                    </span>
                  </div>

                  {activePackage?.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Renewal date</span>
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(activePackage.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {activePackage?.startDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Started</span>
                      <span className="text-sm font-medium">
                        {new Date(activePackage.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Plan includes</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {isSubscribed ? 'All AI tools access' : 'Basic plagiarism detection'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {isSubscribed ? 'Priority support' : '1,000 free words'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {isSubscribed ? 'Detailed similarity reports' : 'Standard support'}
                    </li>
                  </ul>
                </div>

                {!isSubscribed && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/pricing">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Unlock more with a plan
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Token Balances */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Token Balances</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  Buy more tokens
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Word Tokens */}
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Words</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{remainingWords.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">tokens remaining</p>
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (remainingWords / 10000) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Image Tokens */}
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-rose-500" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Images</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{remainingImageTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">tokens remaining</p>
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (remainingImageTokens / 500) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Voice — placeholder since no voice field stored yet */}
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Mic className="h-4 w-4 text-indigo-500" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Voice</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground mt-1">minutes remaining</p>
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: '0%' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Usage Stats */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Usage Overview</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Total spent</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">${totalSpent.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Purchases</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{payments.filter(p => p.status === 'succeeded').length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Payment method</span>
                  </div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mt-1">
                    {userProfile?.stripe_customer_id ? (
                      <><CreditCard className="h-4 w-4 text-muted-foreground" /> Card on file</>
                    ) : (
                      <span className="text-muted-foreground">None added</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Payment History
                </CardTitle>
                {payments.length > 0 && (
                  <span className="text-xs text-muted-foreground">{payments.length} transaction{payments.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-center">
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">No payments yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Your payment history will appear here after your first purchase
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/pricing">Browse plans</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-4 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>Description</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="hidden sm:block h-px bg-border" />

                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="grid sm:grid-cols-4 gap-2 sm:gap-4 items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          payment.paymentType === 'Packages'
                            ? 'bg-purple-100 dark:bg-purple-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {payment.paymentType === 'Packages'
                            ? <Zap className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            : <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          }
                        </div>
                        <span className="font-medium text-sm text-foreground">
                          {payment.paymentType === 'Packages' ? 'Package Subscription' : 'Token Purchase'}
                        </span>
                      </div>

                      <span className="text-sm text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>

                      <div>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          payment.status === 'succeeded'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${payment.status === 'succeeded' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {payment.status === 'succeeded' ? 'Paid' : 'Failed'}
                        </span>
                      </div>

                      <span className="text-sm font-semibold text-foreground sm:text-right">
                        ${payment.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          {!isSubscribed && (
            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
              <CardContent className="p-8 relative">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Unlock the full suite</h3>
                    <p className="text-blue-100 text-sm max-w-md">
                      Get more words, image tokens, advanced AI tools, and priority support with a premium plan
                    </p>
                  </div>
                  <Button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold shadow-lg" asChild>
                    <Link href="/pricing">
                      View Plans
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
