"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { WITHDRAWAL_LABEL, memberName } from "@/lib/domain";
import { daysSince, formatDate } from "@/lib/format";

export function ApprovalsBoard() {
  const records = useRecords();
  const visible = new Set(records.members.map((member) => member.id));
  const rows = records.book.withdrawals.filter((row) => {
    if (!visible.has(row.memberId)) return false;
    if (row.status === "paid" || row.status === "declined") return false;
    const reviewable =
      records.canReview &&
      (row.status === "received" || row.status === "checking" || row.status === "approved");
    const payable =
      records.canFinance && row.status === "approved" && row.approvedBy !== records.staff?.id;
    return reviewable || payable;
  });

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Withdrawals waiting on a review or payment decision for your role."
      />
      {!records.canSee("withdrawals") ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No approval queue on your role"
          description="Review and finance decisions stay with the roles that can make them."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing is waiting for you"
          description="Received, under-review, and approved withdrawals that need your action show up here."
        />
      ) : (
        <DataTable
          columns={[
            { key: "type", header: "Type" },
            { key: "member", header: "Member" },
            { key: "submitted", header: "Submitted" },
            { key: "stage", header: "Stage" },
            { key: "approver", header: "Approver" },
            { key: "age", header: "Age" },
            { key: "action", header: "Action" },
          ]}
          rows={rows.map((row) => {
            const member = records.book.members.find((item) => item.id === row.memberId);
            const approver = records.book.staff.find((person) => person.id === row.approvedBy);
            return {
              id: row.id,
              cells: {
                type: "Withdrawal",
                member: (
                  <span>
                    <span className="font-medium text-navy">
                      {member ? memberName(member) : row.name}
                    </span>
                    <span className="block text-xs text-muted">{member?.memberNumber}</span>
                  </span>
                ),
                submitted: formatDate(row.submittedAt),
                stage: <StatusBadge label={WITHDRAWAL_LABEL[row.status]} />,
                approver: approver?.name ?? "—",
                age: `${daysSince(row.submittedAt)} days`,
                action: (
                  <Link
                    href={`/withdrawals?id=${row.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {row.status === "approved" ? "Open payment" : "Open review"}
                  </Link>
                ),
              },
            };
          })}
        />
      )}
    </div>
  );
}
