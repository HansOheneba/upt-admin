"use client";

import { ScrollText } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { memberName } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";

export function AuditBoard() {
  const { book } = useRecords();

  return (
    <div>
      <PageHeader
        title="Audit"
        description="Who changed a record, when, and what the previous value was. Members do not see this log."
      />
      {book.audit.length === 0 ? (
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
          rows={book.audit.map((entry) => {
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
