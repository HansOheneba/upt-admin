"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { useRecords } from "@/components/records/records-provider";
import { isActiveRoute, NAV_ITEMS } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { canSee } = useRecords();
  const items = NAV_ITEMS.filter((item) => canSee(item.area));

  return (
    <aside className="print-hide fixed inset-y-0 left-0 flex w-[244px] flex-col bg-navy text-white">
      <div className="px-4 pt-5 pb-4">
        <div className="rounded-lg bg-white px-3 py-2.5">
          <Logo width={180} priority />
        </div>
        <p className="mt-3 text-[11px] font-medium tracking-wide text-white/60 uppercase">
          My Own Pension
        </p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-white/10 text-gold"
                  : "text-white/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 ${active ? "text-gold" : "text-white/70"}`}
                aria-hidden
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
