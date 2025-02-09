"use client"
import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2 } from "lucide-react"
import { PlagiarismResults } from "@/components/plagiarism-results"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"

type PlagiarismResult = {
  matches: string[]
  percentage: number
  plagiarismPercentage: number
} | null

export default function Home() {
  const [text, setText] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<PlagiarismResult>(null) // Typed `result`
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handlePlagiarismCheck = async () => {
    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsChecking(true)
    setProgress(0)
    setResult(null)

    try {
      const response = await fetch("/api/check-plagiarism", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error("Failed to check plagiarism")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(5))

            if (data.progress !== undefined) {
              setProgress(data.progress)
            }

            if (data.result) {
              setResult({
                matches: data.result.matches,
                percentage: data.result.percentage,
                plagiarismPercentage: data.result.percentage, // Map `percentage` to `plagiarismPercentage`
              })
              decrementWords(requiredTokens) // Deduct tokens after successful check
            }

            if (data.error) {
              throw new Error(data.error) // Now properly throwing the error
            }
          }
        }
      }
    } catch (err) {
      console.error("Error checking plagiarism:", err) // Use `err` to avoid shadowing
    } finally {
      setIsChecking(false)
    }
  }

  const formattedResult = result
  ? {
      plagiarismPercentage: result.plagiarismPercentage, // Ensure the correct key is used
      matches: result.matches.map((match: string) => ({
        text: match,
        similarity: 0, // Default similarity (adjust as needed)
      })),
    }
  : null;


  return (
    <div className="min-h-screen bg-background px-5 md:px-10">
      <Nav />
      <main className="container py-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">Plagiarism Checker</h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground">
            Ensure every word is your own with Plagiachecks plagiarism checker, which detects plagiarism in your text
            and checks for other writing issues.
          </p>
        </div>
        <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-start">
          <div className="space-y-4">
            <Card className="p-6">
              <Textarea
                placeholder="Enter text or upload file to check for plagiarism and writing errors."
                className="min-h-[300px] resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="mt-4 flex gap-4">
                <Button
                  className="bg-blue-400 hover:bg-blue-500 flex-1"
                  onClick={handlePlagiarismCheck}
                  disabled={isChecking || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    `Check for plagiarism (${calculateRequiredTokens(text)} words)`
                  )}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload a file
                </Button>
              </div>
              {calculateRequiredTokens(text) > remainingWords && (
                <p className="mt-2 text-sm text-red-500">Not enough words remaining. Please upgrade your plan.</p>
              )}
            </Card>
            <PlagiarismResults isChecking={isChecking} progress={progress} result={formattedResult} />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold">Lets get started.</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold">Step 1:</p>
                    <p className="text-muted-foreground">Add your text or upload a file.</p>
                  </div>
                  <div>
                    <p className="font-semibold">Step 2:</p>
                    <p className="text-muted-foreground">Click to scan for plagiarism.</p>
                  </div>
                  <div>
                    <p className="font-semibold">Step 3:</p>
                    <p className="text-muted-foreground">
                      Review the results for instances of potential plagiarism, plus additional writing issues.
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-blue-400 hover:bg-blue-500">Get Plagiacheck</Button>
                {!user && (
                  <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/signin" className="text-blue-300 hover:underline">
                      Log in
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

