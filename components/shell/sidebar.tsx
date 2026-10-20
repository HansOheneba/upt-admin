"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { useRecords } from "@/components/records/records-provider";
import { ROLE_LABEL } from "@/lib/domain";
import { isActiveRoute, NAV_GROUPS } from "@/lib/navigation";

function NavActive({ href }: { href: string }) {
  const pathname = usePathname();
  const marker = useRef<HTMLSpanElement>(null);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  const active = isActiveRoute(pathname, href, hash);

  useEffect(() => {
    const link = marker.current?.closest("a");
    if (!link) return;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }, [active]);

  return <span ref={marker} hidden data-active={active ? "" : undefined} />;
}

export function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const { canSee, staff } = useRecords();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item.area)),
  })).filter((group) => group.items.length > 0);

  const role = staff?.roles.map((item) => ROLE_LABEL[item]).join(", ");

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="print-hide fixed inset-0 z-20 bg-navy-deep/40 lg:hidden"
          onClick={onNavigate}
        />
      ) : null}
      <aside
        className={`print-hide fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-navy-deep text-white ${
          open ? "flex" : "hidden"
        } lg:flex`}
      >
        <div className="px-4 pt-4 pb-3">
          <Link href="/operations" onClick={onNavigate} className="block rounded-[8px] bg-white px-2.5 py-2">
            <Logo width={140} priority />
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.08em] text-white/45 uppercase">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className="group relative flex h-11 items-center gap-2.5 rounded-md px-3 text-sm text-white/75 hover:bg-white/5 hover:text-white has-data-active:bg-navy has-data-active:text-white"
                    >
                      <Suspense fallback={null}>
                        <NavActive href={item.href} />
                      </Suspense>
                      <span
                        className="absolute top-2 bottom-2 left-0 hidden w-[3px] bg-white group-has-data-active:block"
                        aria-hidden
                      />
                      <Icon className="size-[18px] shrink-0 text-white/55 group-has-data-active:text-white" aria-hidden />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {staff ? (
          <div className="border-t border-white/10 px-4 py-4">
            <p className="truncate text-sm font-medium text-white">{staff.name}</p>
            <p className="truncate text-xs text-white/55">{role}</p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
