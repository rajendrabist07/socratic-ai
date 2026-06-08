import type { Metadata } from "next";
import ClerkProviderClient from "@/lib/ClerkProviderClient";
import { TRPCProvider } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocraticAI — Learn Through Questions",
  description:
    "An AI-powered Socratic tutor that guides you to understanding without giving direct answers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
        <ClerkProviderClient>
          <div className="min-h-screen">
            <div className="bg-transparent">
              <div className="max-w-5xl mx-auto">
                <TRPCProvider>
                  {children}
                </TRPCProvider>
              </div>
            </div>
          </div>
        </ClerkProviderClient>
      </body>
    </html>
  );
}
