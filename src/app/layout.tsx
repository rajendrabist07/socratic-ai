import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import ClerkProviderClient from "@/lib/ClerkProviderClient";
import { TRPCProvider } from "@/lib/providers";
import Nav from "@/components/Nav";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "SocraticAI — Learn Through Questions",
  description:
    "An AI-powered Socratic tutor that guides you to understanding without giving direct answers.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
      <body className={`${geist.className} min-h-screen bg-background text-zinc-100 antialiased`}>
        <ClerkProviderClient>
          <div className="min-h-screen">
            <Nav />
            <main className="mx-auto w-full max-w-6xl animate-page-in px-4 py-5 sm:px-6 sm:py-8">
              <TRPCProvider>{children}</TRPCProvider>
            </main>
          </div>
        </ClerkProviderClient>
      </body>
    </html>
  );
}
