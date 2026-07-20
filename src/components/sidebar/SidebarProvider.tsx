"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load initial desktop collapse state from localStorage on client mount
  useEffect(() => {
    const saved = localStorage.getItem("socratic_sidebar_collapsed");
    if (saved === "true") {
      setIsDesktopCollapsed(true);
    }
  }, []);

  const handleSetDesktopCollapsed = (collapsed: boolean) => {
    setIsDesktopCollapsed(collapsed);
    localStorage.setItem("socratic_sidebar_collapsed", String(collapsed));
  };

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        isDesktopCollapsed,
        setIsDesktopCollapsed: handleSetDesktopCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
