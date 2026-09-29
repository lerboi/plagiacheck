import type { Metadata, Viewport } from "next"
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import "./globals.css"
import { Footer } from "@/components/footer"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { MotionProvider } from "@/components/motion-provider"
import { localeTags } from "@/i18n/config"

// Exposed as a CSS variable so the Tailwind `sans` stack can list Chinese
// system fonts after Inter (see tailwind.config.ts); Inter has no CJK glyphs.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Shell.metadata")
  return {
    metadataBase: new URL("https://www.plagiacheck.online"),
    title: t("title"),
    description: t("description"),
    icons: {
      icon: [{ url: ICON, type: "image/svg+xml" }],
      shortcut: ICON,
      apple: ICON,
    },
  }
}

// Matches what Next.js emits by default, stated explicitly so the intent is
// recorded: `maximumScale` / `userScalable` are deliberately left alone.
// Pinning the scale is the usual shortcut for stopping iOS Safari's zoom on
// input focus, but iOS ignores it for pinch-zoom while Android honours it and
// really does block zooming — a WCAG 2.2 SC 1.4.4 failure. That zoom is
// instead handled at the source, by keeping every focusable control at 16px on
// touch devices (see the focus-zoom guard in app/globals.css).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <html lang={localeTags[locale]} className={inter.variable} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground flex flex-col min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <MotionProvider>
              <main className="flex-grow">{children}</main>
              <Footer />
              <Toaster />
            </MotionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}