"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ID } from "@/domain/types";

interface SessionState {
  userId?: ID;
  tenantId?: ID;
  login: (userId: ID, tenantId: ID) => void;
  logout: () => void;
  copilotOpen: boolean;
  setCopilot: (open: boolean) => void;
  commandOpen: boolean;
  setCommand: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      login: (userId, tenantId) => set({ userId, tenantId }),
      logout: () => set({ userId: undefined, tenantId: undefined, copilotOpen: false }),
      copilotOpen: false,
      setCopilot: (copilotOpen) => set({ copilotOpen }),
      commandOpen: false,
      setCommand: (commandOpen) => set({ commandOpen }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "gc360-session-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ userId: s.userId, tenantId: s.tenantId, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
