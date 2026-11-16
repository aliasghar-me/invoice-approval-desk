import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Invoice Desk",
  description: "Review, approve and reject incoming vendor invoices, and catch duplicates before they are paid twice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Toaster>
          <header className="border-b border-border">
            <div className="mx-auto flex h-12 w-full max-w-[1152px] items-center gap-3 px-4 sm:px-6">
              <Link href="/" className="flex items-center gap-2 font-medium text-ink">
                <BrandMark />
                Invoice Desk
              </Link>
              <span className="text-control" aria-hidden="true">
                /
              </span>
              <span className="text-muted">Accounts payable</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1152px] flex-1 px-4 pb-16 pt-8 sm:px-6">
            {children}
          </main>
        </Toaster>
      </body>
    </html>
  );
}
