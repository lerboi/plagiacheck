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
  Download,
  Crown,
  CheckCircle,
  ArrowUpRight,
  FileText,
  Clock,
  Loader2
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { useTokenStore } from "@/lib/store"

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

export default function Billing() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [activePackage, setActivePackage] = useState<PackageRecord | null>(null)
  const { remainingWords } = useTokenStore()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        await fetchBillingData(session.user.id)
      }
      setLoading(false)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchBillingData(session.user.id)
      }
    })

    return () => { authListener.subscription.unsubscribe() }
  }, [supabase.auth])

  const fetchBillingData = async (userId: string) => {
    // Fetch payment history
    const { data: paymentData } = await supabase
      .from('Payment')
      .select('id, amount, status, createdAt, paymentType')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(10)

    if (paymentData) {
      setPayments(paymentData)
    }

    // Fetch active package
    const { data: packageData } = await supabase
      .from('Package')
      .select('id, packageName, status, expiryDate, startDate')
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .order('startDate', { ascending: false })
      .limit(1)
      .single()

    if (packageData) {
      setActivePackage(packageData)
    }
  }

  const getPlanName = () => {
    if (activePackage) {
      if (activePackage.packageName === '200Image') return '200 Image Package'
      if (activePackage.packageName === '1000Image') return '1000 Image Package'
      return activePackage.packageName
    }
    return 'Free Plan'
  }

  const getPlanPrice = () => {
    if (!activePackage) return '$0.00'
    if (activePackage.packageName === '200Image') return '$9.99'
    if (activePackage.packageName === '1000Image') return '$29.99'
    return '$0.00'
  }

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
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view billing</h1>
            <Button asChild>
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
      <main className="container py-12 max-w-6xl mx-auto px-4">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
              <p className="text-muted-foreground">
                Manage your subscription, view usage, and download invoices
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" asChild>
              <Link href="/pricing">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          </div>

          {/* Current Plan */}
          <Card className="border-2 border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-blue-600" />
                  Current Plan
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {activePackage ? activePackage.status : 'Free'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{getPlanName()}</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{getPlanPrice()}</p>
                    {activePackage && <p className="text-sm text-muted-foreground">per month</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Words Remaining</span>
                      <span className="font-medium">{remainingWords.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-foreground">Plan Details</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {activePackage ? 'All AI tools access' : 'Basic plagiarism detection'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {remainingWords.toLocaleString()} words remaining
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {activePackage ? 'Priority support' : 'Standard support'}
                      </li>
                    </ul>
                  </div>

                  {activePackage?.expiryDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Renews on {new Date(activePackage.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Words Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold text-foreground">
                    {remainingWords.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Total Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-foreground">{payments.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Account Age</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold text-foreground">
                    {user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Days</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">No payment history</h3>
                      <p className="text-sm text-muted-foreground">
                        Your payment history will appear here once you make your first purchase
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${payment.status === 'succeeded' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-medium text-sm">{payment.paymentType === 'Packages' ? 'Package Subscription' : 'Token Purchase'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{payment.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          {!activePackage && (
            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Ready to upgrade?</h3>
                    <p className="text-blue-100">
                      Get more words, advanced features, and priority support with our premium plans
                    </p>
                  </div>
                  <Button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold" asChild>
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
