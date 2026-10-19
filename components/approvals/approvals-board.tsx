"use client";

import { BadgeCheck, Landmark } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { type ApprovalKind } from "@/lib/demo";
import { ghs } from "@/lib/format";

const SECTIONS: {
  kind: ApprovalKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "Payment instruction",
    title: "Payment instructions",
    description: "Raised after validation, waiting for a second officer.",
  },
  {
    kind: "Contribution",
    title: "Contributions",
    description: "Contribution batches waiting for authorisation.",
  },
];

export function ApprovalsBoard() {
  const { fund, approvals, approve, openDialog } = useRecords();

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={`Second-officer sign-off for ${fund.name}. Payment instructions and contribution batches wait here.`}
        action={
          <Button onClick={() => openDialog("contribution")}>Record batch</Button>
        }
      />
      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => {
          const rows = approvals.filter((item) => item.kind === section.kind);
          const isPayment = section.kind === "Payment instruction";

          return (
            <section key={section.kind}>
              <h2 className="text-sm font-medium text-navy">{section.title}</h2>
              <p className="mt-1 mb-3 text-sm text-muted">{section.description}</p>
              <DataTable
                columns={[
                  { key: "id", header: "Ref" },
                  { key: "item", header: "Item" },
                  { key: "kind", header: "Type" },
                  { key: "since", header: "Waiting since" },
                  { key: "amount", header: "Amount", className: "text-right" },
                  { key: "action", header: "", className: "text-right" },
                ]}
                rows={rows.map((item) => ({
                  id: item.id,
                  cells: {
                    id: <span className="tabular-nums">{item.id}</span>,
                    item: (
                      <div>
                        <p className="font-medium text-navy">{item.title}</p>
                        <p className="text-xs text-muted">{item.detail}</p>
                      </div>
                    ),
                    kind: <StatusBadge label={item.kind} />,
                    since: item.waitingSince,
                    amount: (
                      <span className="tabular-nums">{ghs(item.amount)}</span>
                    ),
                    action: (
                      <button
                        type="button"
                        onClick={() => approve(item.id)}
                        className="cursor-pointer text-sm font-medium text-navy hover:underline"
                      >
                        Approve
                      </button>
                    ),
                  },
                }))}
                empty={
                  isPayment ? (
                    <EmptyState
                      icon={BadgeCheck}
                      title="No payment instructions waiting"
                      description="Record a withdrawal. Once it is validated, the payment instruction waits here for approval."
                      action={
                        <Button onClick={() => openDialog("withdrawal")}>
                          Record withdrawal
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Landmark}
                      title="No contribution batches waiting"
                      description="Record a contribution batch for a second officer to authorise."
                      action={
                        <Button onClick={() => openDialog("contribution")}>
                          Record batch
                        </Button>
                      }
                    />
                  )
                }
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
