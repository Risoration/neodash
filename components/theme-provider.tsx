"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useDashboardStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme) {
      root.classList.add(theme);
    } else {
      // Default to dark if no theme is set
      root.classList.add("dark");
    }
  }, [theme]);

  return <>{children}</>;
}

