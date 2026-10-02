import type { Metadata } from "next"
import { Fira_Code, Inter, JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"

import "./globals.css"
import { NavigationProgress } from "@/components/custom/navigation-progress"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

/** Terminal only (xterm reads the family from this variable). */
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-terminal",
})

// Both icons are declared here: a `metadata.icons` entry replaces the link the
// `app/icon.svg` file convention would add on its own, so the SVG (served by
// that convention at /icon.svg) is listed again next to `public/favicon.ico`,
// the fallback for crawlers and browsers that ignore SVG icons. The ICO is made
// from the same rounded tile — the panel has no full-bleed variant.
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        "font-sans",
        fontSans.variable,
        jetbrainsMono.variable,
        firaCode.variable
      )}
    >
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
