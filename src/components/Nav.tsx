"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-full pr-3 text-base font-semibold text-white transition hover:text-zinc-200 active:scale-95"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface-elevated shadow-soft">
            <Image
              src="/socraticai-logo.svg"
              alt="SocraticAI logo"
              width={24}
              height={24}
              priority={false}
            />
          </span>
          <span className="truncate">SocraticAI</span>
        </Link>

        <div className="flex items-center gap-3">
          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox:
                    "w-9 h-9 rounded-full ring-2 ring-offset-2 ring-offset-background",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
