"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

function DismissNavOnNavigate({ dismiss }: { dismiss: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    dismiss();
  }, [pathname, dismiss]);

  return null;
}

function CopilotMarker() {
  const pathname = usePathname();
  if (!pathname.startsWith("/copilot")) return null;
  return <span hidden data-copilot="" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, staff, notice, clearNotice } = useRecords();
  const [navOpen, setNavOpen] = useState(false);
  const dismissNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    if (ready && !staff) router.replace("/");
  }, [ready, router, staff]);

  if (!ready || !staff) {
    return (
      <div className="min-h-full bg-background">
        <div className="app-frame min-h-full min-w-0 lg:pl-[248px]">
          <header className="h-16 border-b border-line bg-card" />
          <main className="mx-auto w-full max-w-[1360px] px-4 py-6 md:px-6 lg:px-7 lg:py-7">
            <Suspense fallback={<div className="min-h-[50vh]" />}>{children}</Suspense>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <Suspense fallback={null}>
        <DismissNavOnNavigate dismiss={dismissNav} />
      </Suspense>
      <Sidebar open={navOpen} onNavigate={dismissNav} />
      <div className="app-frame min-h-full min-w-0 lg:pl-[248px]">
        <Topbar onMenu={() => setNavOpen(true)} />
        {notice ? (
          <div className="print-hide flex items-start justify-between gap-3 border-b border-line bg-[#F8E8E8] px-4 py-2 text-sm text-danger sm:px-7">
            <p className="min-w-0 flex-1">{notice}</p>
            <button type="button" onClick={clearNotice} className="shrink-0 cursor-pointer font-medium">
              Dismiss
            </button>
          </div>
        ) : null}
        <main className="mx-auto w-full min-w-0 max-w-[1360px] px-4 py-6 md:px-6 lg:px-7 lg:py-7 print:max-w-none print:p-0 has-data-copilot:relative has-data-copilot:mx-0 has-data-copilot:h-[calc(100dvh-4rem)] has-data-copilot:max-w-none has-data-copilot:overflow-hidden has-data-copilot:p-0">
          <Suspense fallback={null}>
            <CopilotMarker />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
