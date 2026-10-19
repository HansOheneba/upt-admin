"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export function RequestsBoard() {
  const { fund, requests, openDialog } = useRecords();

  return (
    <div>
      <PageHeader
        title="Requests"
        description={`Enquiries, withdrawals and claims for unitholders on ${fund.name}.`}
        action={<Button onClick={() => openDialog("request")}>Log request</Button>}
      />
      <DataTable
        columns={[
          { key: "id", header: "Ref" },
          { key: "member", header: "Member" },
          { key: "kind", header: "Type" },
          { key: "subject", header: "Subject" },
          { key: "status", header: "Status" },
          { key: "opened", header: "Opened" },
        ]}
        rows={requests.map((request) => ({
          id: request.id,
          cells: {
            id: <span className="tabular-nums">{request.id}</span>,
            member: (
              <Link
                href={`/members/${request.memberId}`}
                className="font-medium text-navy hover:underline"
              >
                {request.memberName}
              </Link>
            ),
            kind: <StatusBadge label={request.kind} />,
            subject: request.subject,
            status: <StatusBadge label={request.status} />,
            opened: request.opened,
          },
        }))}
        empty={
          <EmptyState
            icon={LifeBuoy}
            title={`No requests on ${fund.name}`}
            description="Log an enquiry, withdrawal or claim for a unitholder on this scheme."
            action={
              <Button onClick={() => openDialog("request")}>Log request</Button>
            }
          />
        }
      />
    </div>
  );
}
