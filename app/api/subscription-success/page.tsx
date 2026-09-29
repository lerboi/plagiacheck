import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export default function SubscriptionSuccess() {
  const t = useTranslations("CheckoutResult")
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t("subscription.title")}</h1>
        <p className="text-xl">{t("subscription.body")}</p>
        <Button asChild>
          <Link href="/">{t("dashboard")}</Link>
        </Button>
      </div>
    </div>
  )
}

