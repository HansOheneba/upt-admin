"use client";

import { useRecords } from "@/components/records/records-provider";
import { ROLE_LABEL, staffInitials } from "@/lib/domain";

export function Topbar() {
  const { staff, signOut } = useRecords();
  if (!staff) return null;
  const role = staff.roles.map((item) => ROLE_LABEL[item]).join(", ");

  return (
    <header className="print-hide sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-card px-6">
      <p className="text-sm text-muted">My Own Pension</p>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-navy">{staff.name}</p>
          <p className="text-[11px] text-muted">{role}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-navy text-xs font-medium text-white">
          {staffInitials(staff.name)}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer text-sm text-muted hover:text-navy"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
