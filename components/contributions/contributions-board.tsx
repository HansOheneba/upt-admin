"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleDollarSign } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { downloadCsv } from "@/lib/csv";
import { memberName } from "@/lib/domain";
import { formatDate, formatUnits, ghs, todayIso } from "@/lib/format";
import { channelLabel, contributionMonthStatus, currentMonth, inRange, periodStart } from "@/lib/pension";

export function ContributionsBoard() {
  const { book, members, postPayment, canFinance } = useRecords();
  const [from, setFrom] = useState(periodStart("month"));
  const [to, setTo] = useState(todayIso());
  const [match, setMatch] = useState<Record<string, string>>({});

  const posted = useMemo(
    () =>
      book.contributions
        .filter((row) => inRange(row.date, from, to))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [book.contributions, from, to],
  );
  const month = currentMonth();
  const postedAmount = posted.reduce((sum, row) => sum + row.amount, 0);
  const exceptions = members
    .map((member) => {
      const status = contributionMonthStatus(member, book.contributions, month);
      if (status !== "missing" && status !== "partial") return null;
      const received = book.contributions
        .filter((row) => row.memberId === member.id && row.date.startsWith(month))
        .reduce((sum, row) => sum + row.amount, 0);
      return { member, status, received };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contributions"
        description="Monitor received contributions and investigate payment exceptions."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              downloadCsv(`contributions-${from}-${to}.csv`, [
                ["Date", "Member", "Member number", "Amount", "Unit price", "Units", "Channel", "Reversal of"],
                ...posted.map((row) => {
                  const member = book.members.find((item) => item.id === row.memberId);
                  return [
                    row.date,
                    member ? memberName(member) : "",
                    member?.memberNumber ?? "",
                    ghs(row.amount),
                    row.unitPrice.toFixed(3),
                    formatUnits(row.units),
                    channelLabel(),
                    row.reversalOf ?? "",
                  ];
                }),
              ]);
            }}
          >
            Export period
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-navy">
          From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={`${controlClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-navy">
          To
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={`${controlClass} mt-1`} />
        </label>
        <Button variant="secondary" onClick={() => { setFrom(todayIso()); setTo(todayIso()); }}>Today</Button>
        <Button variant="secondary" onClick={() => { setFrom(`${currentMonth()}-01`); setTo(todayIso()); }}>This month</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Posted in this period" value={String(posted.length)} hint={ghs(postedAmount)} />
        <StatCard label="Pending reconciliation" value={String(book.payments.length)} hint="Mobile Money not yet posted to a member" />
        <StatCard label="Exceptions this month" value={String(exceptions.length)} hint="Missing or short of the monthly contribution" />
      </div>

      <section id="reconciliation">
        <h2 className="text-base font-semibold text-navy">Pending reconciliation</h2>
        <p className="mt-1 mb-3 text-[13px] text-muted">
          These payments are received and not yet posted. They are not missing contributions.
        </p>
        {book.payments.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="No unmatched payments"
            description="Mobile Money receipts that are not on a member show up here."
          />
        ) : (
          <DataTable
            columns={[
              { key: "date", header: "Received" },
              { key: "amount", header: "Amount", className: "text-right" },
              { key: "mobile", header: "Mobile" },
              { key: "ref", header: "Reference" },
              { key: "name", header: "Payer" },
              { key: "match", header: "Member" },
            ]}
            rows={book.payments.map((payment) => ({
              id: payment.id,
              cells: {
                date: formatDate(payment.receivedAt),
                amount: ghs(payment.amount),
                mobile: payment.mobile,
                ref: payment.reference,
                name: payment.payerName || "Not stated",
                match: canFinance ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const memberId = match[payment.id];
                      if (memberId) postPayment(payment.id, memberId);
                    }}
                  >
                    <select
                      value={match[payment.id] ?? ""}
                      onChange={(event) =>
                        setMatch((current) => ({ ...current, [payment.id]: event.target.value }))
                      }
                      className={controlClass}
                    >
                      <option value="">Match member</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {memberName(member)} · {member.memberNumber} · {member.mobile}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary">Post</Button>
                  </form>
                ) : (
                  "Finance posts this"
                ),
              },
            }))}
          />
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-navy">Contribution exceptions</h2>
        <p className="mt-1 mb-3 text-[13px] text-muted">
          Expected monthly contributions for the current month with nothing posted, or a short payment. No contribution record is created from the expected amount.
        </p>
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted">No missing or short contributions this month.</p>
        ) : (
          <DataTable
            columns={[
              { key: "member", header: "Member" },
              { key: "expected", header: "Expected", className: "text-right" },
              { key: "received", header: "Received", className: "text-right" },
              { key: "difference", header: "Outstanding", className: "text-right" },
              { key: "period", header: "Period" },
              { key: "status", header: "Status" },
            ]}
            rows={exceptions.map(({ member, status, received }) => ({
              id: member.id,
              cells: {
                member: (
                  <Link href={`/members/${member.id}`} className="font-medium text-navy hover:underline">
                    {memberName(member)}
                  </Link>
                ),
                expected: ghs(member.monthlyContribution),
                received: ghs(received),
                difference: ghs(Math.max(0, Math.round((member.monthlyContribution - received) * 100) / 100)),
                period: month,
                status: <StatusBadge label={status === "missing" ? "Missing" : "Partial"} />,
              },
            }))}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-navy">Posted in this period</h2>
        {posted.length === 0 ? (
          <p className="text-sm text-muted">Nothing posted between these dates.</p>
        ) : (
          <DataTable
            columns={[
              { key: "date", header: "Date" },
              { key: "member", header: "Member" },
              { key: "amount", header: "Amount", className: "text-right" },
              { key: "price", header: "Unit price" },
              { key: "units", header: "Units", className: "text-right" },
              { key: "channel", header: "Channel" },
            ]}
            rows={posted.map((row) => {
              const member = book.members.find((item) => item.id === row.memberId);
              return {
                id: row.id,
                cells: {
                  date: formatDate(row.date),
                  member: member ? `${memberName(member)}${row.reversalOf ? " · reversal" : ""}` : "",
                  amount: ghs(row.amount),
                  price: row.unitPrice.toFixed(3),
                  units: formatUnits(row.units),
                  channel: channelLabel(),
                },
              };
            })}
          />
        )}
      </section>
    </div>
  );
}
