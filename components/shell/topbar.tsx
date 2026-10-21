"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import {
  canSeeArea,
  canSeeMember,
  ROLE_LABEL,
  staffInitials,
  type Book,
  type Staff,
} from "@/lib/domain";
import { NAV_GROUPS } from "@/lib/navigation";

function BreadcrumbTrail() {
  const pathname = usePathname();
  const crumbs = breadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 truncate text-[13px] text-muted">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`}>
          {index > 0 ? <span className="px-1.5 text-[#C5CDD8]">/</span> : null}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-navy">
              {crumb.label}
            </Link>
          ) : (
            <span className={index === crumbs.length - 1 ? "text-navy" : ""}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { staff, signIn, signOut, book, memberships, canSee, schemes, schemeId, setScheme } = useRecords();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!staff) return null;

  const role = staff.roles.map((item) => ROLE_LABEL[item]).join(", ");
  const others = book.staff.filter((person) => person.active && person.id !== staff.id);
  const openRequests = canSee("requests")
    ? book.requests.filter(
        (row) => row.status === "open" && memberships.some((membership) => membership.id === row.membershipId),
      ).length
    : 0;

  return (
    <header className="print-hide sticky top-0 z-10 flex h-16 items-center justify-between gap-6 border-b border-line bg-card px-4 sm:px-6 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-line text-navy lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-[18px]" aria-hidden />
        </button>
        <Suspense fallback={<nav aria-label="Breadcrumb" className="h-4 min-w-16" />}>
          <BreadcrumbTrail />
        </Suspense>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <label className="min-w-0 text-right">
          <span className="hidden text-[11px] leading-4 text-muted sm:block">Scheme</span>
          <select
            value={schemeId}
            onChange={(event) => setScheme(event.target.value)}
            className="block max-w-28 cursor-pointer truncate bg-transparent text-right text-[13px] leading-4 font-medium text-navy sm:max-w-52"
            aria-label="Working scheme"
          >
            {schemes.length > 1 ? <option value="all">All schemes</option> : null}
            {schemes.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
            ))}
          </select>
        </label>
        {canSee("requests") ? (
          <>
            <span className="hidden h-8 w-px bg-line md:block" aria-hidden />
            <Link
              href="/requests?status=open"
              className="relative flex size-10 items-center justify-center rounded-[8px] text-navy hover:bg-[#F5F7FA]"
              aria-label={
                openRequests > 0
                  ? `${openRequests} open member requests`
                  : "Member requests"
              }
            >
              <Bell className="size-[18px]" aria-hidden />
              {openRequests > 0 ? (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-danger" />
              ) : null}
            </Link>
          </>
        ) : null}
        <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex cursor-pointer items-center gap-2.5 rounded-[8px] py-1 pr-1 hover:bg-[#F5F7FA]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[13px] font-medium text-navy">{staff.name}</span>
              <span className="block text-[12px] text-muted">{role}</span>
            </span>
            <span className="flex size-8 items-center justify-center rounded-full bg-navy text-[11px] font-medium text-white">
              {staffInitials(staff.name)}
            </span>
            <ChevronDown className="size-4 text-muted" aria-hidden />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-72 rounded-[10px] border border-line bg-card p-2 shadow-sm"
            >
              <p className="px-2 py-1.5 text-sm font-medium text-navy">{staff.name}</p>
              <p className="px-2 pb-2 text-xs text-muted">{role}</p>
              {others.length > 0 ? (
                <>
                  <div className="my-1 h-px bg-line" />
                  <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">
                    Switch role
                  </p>
                  <div className="max-h-72 overflow-y-auto">
                    {others.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          const error = signIn(person.email);
                          if (error) return;
                          const next = pathAfterSwitch(pathname, person, book);
                          if (next) router.push(next);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-left hover:bg-[#F5F7FA]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-medium text-white">
                          {staffInitials(person.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy">
                            {person.name}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {person.roles.map((item) => ROLE_LABEL[item]).join(", ")}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="w-full cursor-pointer rounded-[8px] px-2 py-2 text-left text-sm text-navy hover:bg-[#F5F7FA]"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function pathAfterSwitch(pathname: string, person: Staff, book: Book) {
  const memberMatch = pathname.match(/^\/members\/([^/]+)/);
  if (memberMatch) {
    const member = book.members.find((item) => item.id === decodeURIComponent(memberMatch[1]));
    if (!member || !canSeeMember(book, person, member)) return "/operations";
    return null;
  }

  const item = NAV_GROUPS.flatMap((group) => group.items).find((entry) => {
    const path = entry.href.split("#")[0];
    return pathname === path || pathname.startsWith(`${path}/`);
  });
  if (item && !canSeeArea(person, item.area)) return "/operations";
  return null;
}

function breadcrumbs(pathname: string) {
  const memberMatch = pathname.match(/^\/members\/([^/]+)$/);
  if (memberMatch) {
    return [
      { label: "Members" },
      { label: "Member Directory", href: "/members" },
      { label: "Member details" },
    ];
  }

  if (pathname === "/operations") return [{ label: "Workspace" }];

  for (const group of NAV_GROUPS) {
    const match = group.items.some((item) => {
      const path = item.href.split("#")[0];
      return pathname === path || pathname.startsWith(`${path}/`);
    });
    if (match) return [{ label: group.label }];
  }

  return [{ label: "Workspace" }];
}
