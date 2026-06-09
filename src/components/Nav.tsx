"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Nav() {
  return (
    <header className="w-full border-b bg-white/50 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-semibold text-lg">
          <Image
            src="/socraticai-logo.svg"
            alt="SocraticAI logo"
            width={32}
            height={32}
            priority={false}
          />
          <span>SocraticAI</span>
        </Link>

        <div>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 py-1 rounded bg-indigo-600 text-white">Sign in</button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
