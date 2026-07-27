import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import ClerkProviderClient from "@/lib/ClerkProviderClient";
import { TRPCProvider } from "@/lib/providers";
import { AppLayout } from "@/components/sidebar/AppLayout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://socratic-ai-tau.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SocraticAI — Learn by Thinking, Not Copying",
  description:
    "An AI tutor that never gives you the answer — it asks the right question so you discover it yourself. Built for students who want to actually understand, not just complete.",
  keywords: [
    "AI tutor",
    "socratic method",
    "learning assistant",
    "AI study tool",
    "critical thinking",
  ],
  openGraph: {
    title: "SocraticAI — Learn by Thinking, Not Copying",
    description: "An AI tutor that never gives you the answer — it asks the right question so you discover it yourself.",
    url: siteUrl,
    siteName: "SocraticAI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SocraticAI — Learn by thinking, not copying.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SocraticAI — Learn by Thinking, Not Copying",
    description: "An AI tutor that never gives you the answer — it asks the right question so you discover it yourself.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen bg-background text-foreground antialiased`}>
        <ClerkProviderClient>
          <ErrorBoundary>
            <TRPCProvider>
              <AppLayout>{children}</AppLayout>
            </TRPCProvider>
          </ErrorBoundary>
        </ClerkProviderClient>
      </body>
    </html>
  );
}

