import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Plagiacheck - Dark Mode",
  description: "Write confidently with Plagiacheck's AI-powered writing assistant",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground flex flex-col min-h-screen`}>
        {children}
        <Footer />
      </body>
    </html>
  )
}

