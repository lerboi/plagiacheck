import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { Footer } from "@/components/footer"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Plagiacheck",
  description: "Write confidently with Plagiacheck's AI-powered writing assistant",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
    shortcut: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E",
    apple: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex-grow container mx-auto px-4">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}