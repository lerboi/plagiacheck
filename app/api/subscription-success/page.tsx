import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Subscription Successful!</h1>
        <p className="text-xl">Thank you for subscribing to our service.</p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

