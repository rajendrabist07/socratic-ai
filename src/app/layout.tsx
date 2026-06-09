import type { Metadata } from "next";
import ClerkProviderClient from "@/lib/ClerkProviderClient";
import { TRPCProvider } from "@/lib/providers";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocraticAI — Learn Through Questions",
  description:
    "An AI-powered Socratic tutor that guides you to understanding without giving direct answers.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.08),_transparent_24%)]" />
        <ClerkProviderClient>
          <div className="min-h-screen">
            <Nav />
            <main className="max-w-5xl mx-auto px-4 py-6">
              <TRPCProvider>{children}</TRPCProvider>
            </main>
          </div>
        </ClerkProviderClient>
      </body>
    </html>
  );
}
