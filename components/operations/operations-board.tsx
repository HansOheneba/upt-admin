"use client";

import Link from "next/link";
import { Banknote, LifeBuoy, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ghs } from "@/lib/format";

export function OperationsBoard() {
  const { fund, requests, withdrawals, approvals, openDialog } = useRecords();
  const open = requests.filter((request) => request.status === "Open");
  const validating = withdrawals.filter((item) => item.stage === "Validation");
  const payments = approvals.filter((item) => item.kind === "Payment instruction");

  return (
    <div>
      <PageHeader
        title="Operations"
        description={`Requests, withdrawals in validation, and payment instructions for ${fund.name}.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open requests"
          value={String(open.length)}
          hint={fund.name}
        />
        <StatCard
          label="In validation"
          value={String(validating.length)}
          hint="Awaiting second-level check"
        />
        <StatCard
          label="Payments to approve"
          value={String(payments.length)}
          hint="Waiting for a second officer"
        />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <Queue
          title="Open requests"
          href="/requests"
          empty={
            <EmptyState
              compact
              icon={LifeBuoy}
              title="No open requests"
              description="Log an enquiry, withdrawal or claim to start the queue."
              action={
                <Button onClick={() => openDialog("request")}>Log request</Button>
              }
            />
          }
          rows={open.map((request) => ({
            id: request.id,
            primary: (
              <Link
                href={`/members/${request.memberId}`}
                className="font-medium text-navy hover:underline"
              >
                {request.memberName}
              </Link>
            ),
            secondary: request.subject,
            meta: <StatusBadge label={request.kind} />,
          }))}
        />
        <Queue
          title="Withdrawals in validation"
          href="/withdrawals"
          empty={
            <EmptyState
              compact
              icon={ShieldCheck}
              title="Nothing in validation"
              description="Record a withdrawal to move it through validation and payment."
              action={
                <Button onClick={() => openDialog("withdrawal")}>
                  Record withdrawal
                </Button>
              }
            />
          }
          rows={validating.map((item) => ({
            id: item.id,
            primary: (
              <Link
                href={`/members/${item.memberId}`}
                className="font-medium text-navy hover:underline"
              >
                {item.memberName}
              </Link>
            ),
            secondary: `${item.id} · ${item.reason}`,
            meta: (
              <span className="text-sm tabular-nums text-navy">
                {ghs(item.amount)}
              </span>
            ),
          }))}
        />
        <Queue
          title="Payment instructions waiting"
          href="/approvals"
          empty={
            <EmptyState
              compact
              icon={Banknote}
              title="No payment instructions waiting"
              description="Validated withdrawals ready for a second officer show up here."
              action={
                <Button onClick={() => openDialog("withdrawal")}>
                  Record withdrawal
                </Button>
              }
            />
          }
          rows={payments.map((item) => ({
            id: item.id,
            primary: <span className="font-medium text-navy">{item.title}</span>,
            secondary: item.detail,
            meta: (
              <span className="text-sm tabular-nums text-navy">
                {ghs(item.amount)}
              </span>
            ),
          }))}
        />
      </div>
    </div>
  );
}

function Queue({
  title,
  href,
  empty,
  rows,
}: {
  title: string;
  href: string;
  empty: ReactNode;
  rows: {
    id: string;
    primary: ReactNode;
    secondary: string;
    meta: ReactNode;
  }[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-card">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-medium text-navy">{title}</h2>
        <Link href={href} className="text-sm font-medium text-navy hover:underline">
          Open
        </Link>
      </header>
      {rows.length === 0 ? (
        empty
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm">{row.primary}</div>
                <p className="truncate text-xs text-muted">{row.secondary}</p>
              </div>
              <div className="shrink-0">{row.meta}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
