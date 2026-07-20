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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://socraticai.ai";

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
    title: "SocraticAI",
    description: "Learn by thinking, not copying.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SocraticAI",
    description: "Learn by thinking, not copying.",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
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

