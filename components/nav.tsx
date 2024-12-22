import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTokenStore } from "@/lib/store"
import { MessageCircle } from 'lucide-react'

export function Nav() {
  const { remainingWords } = useTokenStore()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-400"></div>
            <span className="font-bold">plagiacheck</span>
          </Link>
          <Link href="/pricing" className="text-sm font-medium transition-colors hover:text-primary">
            Pricing
          </Link>
          <Link href="#" className="text-sm font-medium transition-colors hover:text-primary">
            Resources
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-400/10 text-blue-050">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{remainingWords} words</span>
          </div>
          <Button variant="ghost" className="text-sm" asChild>
            <Link href="/signin">Log in</Link>
          </Button>
          <Button className="bg-blue-400 text-sm hover:bg-blue-500" asChild>
            <Link href="/pricing">Get Plagiacheck</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}

