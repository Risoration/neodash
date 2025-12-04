import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DashboardPreferences {
  theme: "light" | "dark";
  compactMode: boolean;
  refreshInterval: number;
}

interface DashboardStore extends DashboardPreferences {
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  setCompactMode: (compact: boolean) => void;
  setRefreshInterval: (interval: number) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      theme: "dark",
      compactMode: false,
      refreshInterval: 30000, // 30 seconds
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setCompactMode: (compact) => set({ compactMode: compact }),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
    }),
    {
      name: "neodash-preferences",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : undefined as any)),
    }
  )
);

