"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrent, useHydrated } from "@/hooks/use-data";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { CopilotPanel } from "@/components/layout/copilot-panel";
import { FullscreenLoader } from "@/components/layout/guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { user } = useCurrent();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role === "cliente") router.replace("/portal");
  }, [hydrated, user, router]);

  if (!hydrated || !user || user.role === "cliente") return <FullscreenLoader />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
      <CommandPalette />
      <CopilotPanel />
    </div>
  );
}
