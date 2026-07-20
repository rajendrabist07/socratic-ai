"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import { useSidebar } from "./SidebarProvider";
import {
  SearchIcon,
  PinIcon,
  PinFilledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  DashboardIcon,
  XIcon,
  MessageSquareIcon,
  SettingsIcon,
} from "@/components/ui/Icons";


export function Sidebar() {
  const { isMobileOpen, setIsMobileOpen, isDesktopCollapsed, setIsDesktopCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");

  // Pinned sessions state (persisted in localStorage)
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("socratic_pinned_sessions");
    if (saved) {
      try {
        setPinnedIds(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let updated: string[];
    if (pinnedIds.includes(id)) {
      updated = pinnedIds.filter((pId) => pId !== id);
    } else {
      updated = [...pinnedIds, id];
    }
    setPinnedIds(updated);
    localStorage.setItem("socratic_pinned_sessions", JSON.stringify(updated));
  };

  // Completed sessions section toggle state
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  // Fetch session list via tRPC client
  const { data: sessions = [], isLoading, refetch } = trpc.session.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 1000, // 10s caching
  });

  // Keep theme state for Clerk popover
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  // Focus trap implementation for mobile overlay
  useEffect(() => {
    if (!isMobileOpen || !sidebarRef.current) return;

    const focusableElements = sidebarRef.current.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleTab);
    // Auto-focus close button or first element on open
    firstElement.focus();

    return () => window.removeEventListener("keydown", handleTab);
  }, [isMobileOpen]);

  // Create session mutation
  const createSession = trpc.session.create.useMutation({
    onSuccess: (data) => {
      void refetch();
      setIsMobileOpen(false);
      router.push(`/session/${data.id}`);
    },
  });

  const handleCreateSession = () => {
    createSession.mutate({
      title: "New Learning Session",
      topic: "Discovery through questioning",
    });
  };

  // Filtered lists
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const { pinned, recent, completed } = useMemo(() => {
    const pinList: typeof sessions = [];
    const recList: typeof sessions = [];
    const compList: typeof sessions = [];

    filteredSessions.forEach((s) => {
      if (pinnedIds.includes(s.id)) {
        pinList.push(s);
      } else if (s.status === "COMPLETED") {
        compList.push(s);
      } else {
        recList.push(s);
      }
    });

    return { pinned: pinList, recent: recList, completed: compList };
  }, [filteredSessions, pinnedIds]);

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar shell container */}
      <nav
        ref={sidebarRef}
        aria-label="Main Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-surface shadow-soft transition-all duration-300 ease-in-out motion-reduce:transition-none
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          ${isDesktopCollapsed ? "md:w-[72px]" : "md:w-[280px]"}
          w-[280px]
        `}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3 rounded-full text-base font-semibold text-foreground transition hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated shadow-soft">
              <Image
                src="/socraticai-logo.svg"
                alt="SocraticAI Logo"
                width={20}
                height={20}
                priority
              />
            </span>
            {(!isDesktopCollapsed || isMobileOpen) && (
              <span className="truncate tracking-tight font-bold text-foreground">SocraticAI</span>
            )}
          </Link>

          {/* Close drawer (mobile) or collapse sidebar (desktop) buttons */}
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground active:scale-95 md:hidden"
              aria-label="Close menu"
            >
              <XIcon size={18} />
            </button>

            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="hidden h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground active:scale-95 md:flex"
              aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isDesktopCollapsed ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
            </button>
          </div>
        </div>

        {/* Sidebar Middle Content */}
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {/* CTA: Create New Session */}
          {(!isDesktopCollapsed || isMobileOpen) ? (
            <button
              onClick={handleCreateSession}
              disabled={createSession.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon size={16} />
              <span>{createSession.isPending ? "Creating..." : "New Session"}</span>
            </button>
          ) : (
            <button
              onClick={handleCreateSession}
              disabled={createSession.isPending}
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="New Session"
            >
              <PlusIcon size={18} />
            </button>
          )}

          {/* Search sessions filter */}
          {(!isDesktopCollapsed || isMobileOpen) && (
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border bg-background px-9 py-2 text-xs text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
          )}

          {/* Navigation link: Dashboard */}
          <div>
            <Link
              href="/dashboard"
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition active:scale-[0.98]
                ${pathname === "/dashboard"
                  ? "bg-accent/10 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-foreground hover:bg-surface-elevated hover:text-foreground"
                }
              `}
            >
              <DashboardIcon size={18} className="shrink-0" />
              {(!isDesktopCollapsed || isMobileOpen) && <span>Dashboard</span>}
            </Link>
          </div>

          {/* Sessions List */}
          <div className="flex-1 space-y-4">
            {isLoading ? (
              // Skeletons
              <div className="space-y-3 px-2">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-elevated" />
                <div className="h-8 w-full animate-pulse rounded-xl bg-surface-elevated" />
                <div className="h-8 w-full animate-pulse rounded-xl bg-surface-elevated" />
              </div>
            ) : (
              <>
                {/* Pinned Sessions */}
                {pinned.length > 0 && (
                  <div className="space-y-1">
                    {(!isDesktopCollapsed || isMobileOpen) && (
                      <span className="px-3.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
                        Pinned
                      </span>
                    )}
                    <ul className="space-y-0.5">
                      {pinned.map((session) => (
                        <SessionListItem
                          key={session.id}
                          session={session}
                          isPinned={true}
                          togglePin={togglePin}
                          active={pathname === `/session/${session.id}`}
                          collapsed={isDesktopCollapsed && !isMobileOpen}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent Sessions */}
                {recent.length > 0 && (
                  <div className="space-y-1">
                    {(!isDesktopCollapsed || isMobileOpen) && (
                      <span className="px-3.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
                        Recent
                      </span>
                    )}
                    <ul className="space-y-0.5">
                      {recent.map((session) => (
                        <SessionListItem
                          key={session.id}
                          session={session}
                          isPinned={false}
                          togglePin={togglePin}
                          active={pathname === `/session/${session.id}`}
                          collapsed={isDesktopCollapsed && !isMobileOpen}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Completed Sessions (Collapsible) */}
                {completed.length > 0 && (
                  <div className="space-y-1">
                    {(!isDesktopCollapsed || isMobileOpen) ? (
                      <button
                        onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                        aria-expanded={isCompletedExpanded}
                        className="flex w-full items-center justify-between px-3.5 py-1 text-left text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted hover:text-foreground"
                      >
                        <span>Completed ({completed.length})</span>
                        <ChevronDownIcon
                          size={12}
                          className={`transition-transform duration-200 ${
                            isCompletedExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="border-t border-border/60 my-2" />
                    )}

                    {(isCompletedExpanded || (isDesktopCollapsed && !isMobileOpen)) && (
                      <ul className="space-y-0.5">
                        {completed.map((session) => (
                          <SessionListItem
                            key={session.id}
                            session={session}
                            isPinned={pinnedIds.includes(session.id)}
                            togglePin={togglePin}
                            active={pathname === `/session/${session.id}`}
                            collapsed={isDesktopCollapsed && !isMobileOpen}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {sessions.length === 0 && (!isDesktopCollapsed || isMobileOpen) && (
                  <p className="px-4 py-6 text-center text-xs text-muted leading-relaxed">
                    No active sessions. Start a new session above!
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="flex h-16 shrink-0 items-center justify-between border-t border-border px-4 bg-surface-elevated/40">
          <div className="flex items-center gap-3 min-w-0 w-full justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <UserButton
                appearance={{
                  variables: {
                    colorPrimary: "#6366F1",
                    colorBackground: isDark ? "#111114" : "#ffffff",
                    colorInputBackground: isDark ? "#17171c" : "#f1f2f8",
                    colorText: isDark ? "#f4f4f5" : "#111114",
                    colorTextSecondary: isDark ? "#a1a1aa" : "#63636f",
                    colorBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
                  },
                  elements: {
                    avatarBox:
                      "w-9 h-9 rounded-full ring-2 ring-offset-2 ring-offset-background ring-accent/60",
                  },
                }}
              />
              {(!isDesktopCollapsed || isMobileOpen) && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground leading-none">
                    {user?.firstName ?? "User"}
                  </p>
                  <p className="text-xs text-muted truncate mt-1 leading-none">
                    {user?.primaryEmailAddress?.emailAddress ?? ""}
                  </p>
                </div>
              )}
            </div>

            {(!isDesktopCollapsed || isMobileOpen) && (
              <button
                onClick={() => router.push("/dashboard")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground active:scale-95"
                aria-label="Settings"
              >
                <SettingsIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

interface SessionListItemProps {
  session: {
    id: string;
    title: string;
    topic: string;
    status: string;
  };
  isPinned: boolean;
  togglePin: (id: string, e: React.MouseEvent) => void;
  active: boolean;
  collapsed: boolean;
}

function SessionListItem({
  session,
  isPinned,
  togglePin,
  active,
  collapsed,
}: SessionListItemProps) {
  return (
    <li>
      <Link
        href={`/session/${session.id}`}
        aria-current={active ? "page" : undefined}
        title={`${session.title} (${session.topic})`}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition active:scale-[0.98]
          ${active
            ? "bg-accent/10 text-indigo-700 dark:text-indigo-300 font-semibold"
            : "text-foreground hover:bg-surface-elevated/70"
          }
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquareIcon
            size={14}
            className={`shrink-0 ${
              active ? "text-indigo-700 dark:text-indigo-300" : "text-muted group-hover:text-foreground"
            }`}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-foreground font-medium">{session.title}</p>
              <p className="truncate text-[0.62rem] text-muted group-hover:text-muted/80">
                {session.topic}
              </p>
            </div>
          )}
        </div>

        {/* Pin icon hover trigger (only when expanded) */}
        {!collapsed && (
          <button
            onClick={(e) => togglePin(session.id, e)}
            className={`opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center p-1 rounded-md text-muted hover:text-accent transition duration-150
              ${isPinned ? "opacity-100 text-accent/80" : ""}
            `}
            aria-label={isPinned ? `Unpin ${session.title}` : `Pin ${session.title}`}
          >
            {isPinned ? <PinFilledIcon size={12} /> : <PinIcon size={12} />}
          </button>
        )}
      </Link>
    </li>
  );
}
