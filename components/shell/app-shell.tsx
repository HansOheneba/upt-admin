"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, staff, notice, clearNotice } = useRecords();
  const copilot = pathname.startsWith("/copilot");

  useEffect(() => {
    if (ready && !staff) router.replace("/");
  }, [ready, router, staff]);

  if (!ready || !staff) {
    return <div className="min-h-full bg-background" />;
  }

  return (
    <div className="min-h-full bg-background">
      <Sidebar />
      <div className="app-frame min-h-full pl-[244px]">
        <Topbar />
        {notice ? (
          <div className="print-hide flex items-center justify-between gap-4 border-b border-line bg-[#F8E8E8] px-6 py-2 text-sm text-[#8A3030]">
            <p>{notice}</p>
            <button type="button" onClick={clearNotice} className="cursor-pointer font-medium">
              Dismiss
            </button>
          </div>
        ) : null}
        <main
          className={
            copilot
              ? "relative h-[calc(100dvh-3.5rem)] overflow-hidden"
              : "mx-auto w-full max-w-[1100px] px-6 py-6 print:max-w-none print:p-0"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
