import type { Metadata } from "next"
import { Newsreader, Roboto } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className={`${newsreader.variable} ${roboto.variable} antialiased bg-[#FAFAFA]`}>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
