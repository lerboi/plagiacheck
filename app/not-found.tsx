import Link from "next/link"
import { FileQuestion, Home, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Nav } from "@/components/nav"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <FileQuestion className="h-7 w-7 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Page not found</h1>
            <p className="text-muted-foreground text-sm">
              We couldn&apos;t find the page you were looking for. It may have moved, or the link could be broken.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Back to home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/all-tools">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Browse tools
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
