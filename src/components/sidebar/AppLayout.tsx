"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { Sidebar } from "./Sidebar";
import { HamburgerIcon } from "@/components/ui/Icons";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsMobileOpen, isDesktopCollapsed } = useSidebar();

  const isAppRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/session");

  if (!isAppRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Nav />
        <main className="mx-auto w-full max-w-6xl animate-page-in px-4 py-5 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main View Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen w-full transition-all duration-300 ease-in-out motion-reduce:transition-none
          ${isDesktopCollapsed ? "md:pl-[72px]" : "md:pl-[280px]"}
        `}
      >
        {/* Sticky Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl md:hidden">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/40"
            aria-label="Open menu"
          >
            <HamburgerIcon size={20} />
          </button>
          
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-full px-2"
          >
            <Image src="/socraticai-logo.svg" alt="SocraticAI logo" width={20} height={20} />
            <span className="font-bold tracking-tight">SocraticAI</span>
          </Link>
          
          <div className="flex w-10 justify-end">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-full ring-2 ring-accent/40",
                },
              }}
            />
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-page-in">
          <div className="mx-auto max-w-5xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}
