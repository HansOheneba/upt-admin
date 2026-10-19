"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { WITHDRAWAL_STAGES } from "@/lib/demo";
import { ghs } from "@/lib/format";

export function WithdrawalsBoard() {
  const { fund, withdrawals, openDialog } = useRecords();

  return (
    <div>
      <PageHeader
        title="Withdrawals"
        description={`Each withdrawal on ${fund.name}, from the request through validation, approval and payment.`}
        action={
          <Button onClick={() => openDialog("withdrawal")}>
            Record withdrawal
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {WITHDRAWAL_STAGES.map((stage) => {
          const count = withdrawals.filter((item) => item.stage === stage).length;

          return (
            <article
              key={stage}
              className="rounded-xl border border-line bg-card px-4 py-3"
            >
              <p className="text-xs text-muted">{stage}</p>
              <p className="mt-1 text-xl font-medium text-navy tabular-nums">
                {count}
              </p>
            </article>
          );
        })}
      </div>
      <DataTable
        columns={[
          { key: "id", header: "Ref" },
          { key: "member", header: "Member" },
          { key: "reason", header: "Reason" },
          { key: "channel", header: "Channel" },
          { key: "stage", header: "Stage" },
          { key: "amount", header: "Amount", className: "text-right" },
        ]}
        rows={withdrawals.map((item) => ({
          id: item.id,
          cells: {
            id: <span className="tabular-nums">{item.id}</span>,
            member: (
              <Link
                href={`/members/${item.memberId}`}
                className="font-medium text-navy hover:underline"
              >
                {item.memberName}
              </Link>
            ),
            reason: item.reason,
            channel: item.channel,
            stage: <StatusBadge label={item.stage} />,
            amount: <span className="tabular-nums">{ghs(item.amount)}</span>,
          },
        }))}
        empty={
          <EmptyState
            icon={Wallet}
            title={`No withdrawals on ${fund.name}`}
            description="Record a withdrawal to take it through validation, approval and payment."
            action={
              <Button onClick={() => openDialog("withdrawal")}>
                Record withdrawal
              </Button>
            }
          />
        }
      />
    </div>
  );
}
