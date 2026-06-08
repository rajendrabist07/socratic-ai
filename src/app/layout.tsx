import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider>
      <html lang="en">
        <body>
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
