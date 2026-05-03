import Link from "next/link"
import { FileQuestion, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <FileQuestion className="h-7 w-7 text-blue-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find the page you were looking for.
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
