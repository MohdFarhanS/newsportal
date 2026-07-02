import type { Metadata } from "next"
import { Newsreader, Roboto } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { Toaster } from "sonner"
import QueryProvider from "@/components/providers/QueryProvider"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
})

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "NewsPortal",
    template: "%s | NewsPortal",
  },
  description: "Portal berita modern dengan konten terkini dan terpercaya.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    siteName: "NewsPortal",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@newsportal",
  },
}

const organizationLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/#organization`,
      name: "NewsPortal",
      url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/#website`,
      url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      name: "NewsPortal",
      inLanguage: "id-ID",
      publisher: { "@id": `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body className={`${newsreader.variable} ${roboto.variable} antialiased bg-[#FAFAFA]`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd).replace(/</g, "\\u003c") }}
        />
        <QueryProvider>
          <Navbar />
          {children}
          <Footer />
        </QueryProvider>
        <Toaster richColors position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}