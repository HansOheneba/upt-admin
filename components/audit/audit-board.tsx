"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { memberName } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";

export function AuditBoard() {
  const { book } = useRecords();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = book.audit.filter((entry) => {
    if (!needle) return true;
    const member = book.members.find((item) => item.id === entry.memberId);
    const haystack = `${entry.staffName} ${entry.action} ${entry.field} ${entry.summary} ${entry.previousValue} ${entry.newValue} ${member ? memberName(member) : ""}`.toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Who changed a record, when, and what the previous value was. This log cannot be edited here."
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search actor, action, or record"
        className={`${controlClass} mb-4`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No staff actions yet"
          description="Unit price changes, posts, reversals, withdrawal stages, replies, and corrections are stored here."
        />
      ) : (
        <DataTable
          columns={[
            { key: "when", header: "When" },
            { key: "who", header: "Who" },
            { key: "member", header: "Member" },
            { key: "field", header: "Field" },
            { key: "previous", header: "Previous" },
            { key: "next", header: "New" },
          ]}
          rows={rows.map((entry) => {
            const member = book.members.find((item) => item.id === entry.memberId);
            return {
              id: entry.id,
              cells: {
                when: formatDateTime(entry.at),
                who: entry.staffName,
                member: member ? memberName(member) : "—",
                field: entry.field,
                previous: entry.previousValue || "—",
                next: entry.newValue || entry.summary,
              },
            };
          })}
        />
      )}
    </div>
  );
}
