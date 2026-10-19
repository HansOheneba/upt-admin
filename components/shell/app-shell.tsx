import type { ReactNode } from "react";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <Sidebar />
      <div className="app-frame min-h-full pl-[244px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1100px] px-6 py-6 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
