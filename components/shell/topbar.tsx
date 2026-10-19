"use client";

import { useRecords } from "@/components/records/records-provider";
import { OFFICER } from "@/lib/demo";

export function Topbar() {
  const { fund } = useRecords();

  return (
    <header className="print-hide sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-card px-6">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-gold px-3 py-1 text-xs font-medium text-navy">
          {fund.name}
        </span>
        <span className="text-xs text-muted">{fund.alsoKnownAs}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-navy">{OFFICER.name}</p>
          <p className="text-[11px] text-muted">{OFFICER.role}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-navy text-xs font-medium text-white">
          {OFFICER.initials}
        </span>
      </div>
    </header>
  );
}
