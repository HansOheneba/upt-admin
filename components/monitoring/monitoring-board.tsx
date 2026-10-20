"use client";

import { useMemo, useState } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { downloadCsv } from "@/lib/csv";
import { WITHDRAWAL_LABEL, memberName, type WithdrawalStatus } from "@/lib/domain";
import { daysSince, formatDate, formatUnits, ghs, todayIso } from "@/lib/format";
import {
  contributionMonthStatus,
  currentUnitPrice,
  inRange,
  memberPosition,
  monthsTouched,
  periodStart,
  totalPot,
  totalUnitsInIssue,
} from "@/lib/pension";

export function MonitoringBoard() {
  const { book, members } = useRecords();
  const [preset, setPreset] = useState<"month" | "quarter" | "custom">("month");
  const [from, setFrom] = useState(periodStart("month"));
  const [to, setTo] = useState(todayIso());

  const range = useMemo(() => {
    if (preset === "month") return { from: periodStart("month"), to: todayIso() };
    if (preset === "quarter") return { from: periodStart("quarter"), to: todayIso() };
    return { from, to };
  }, [from, preset, to]);

  const joined = members.filter(
    (member) => member.status === "active" && inRange(member.memberSince, range.from, range.to),
  );
  const active = members.filter((member) => member.status === "active");
  const posted = book.contributions.filter((row) => inRange(row.date, range.from, range.to));
  const amount = posted.reduce((sum, row) => sum + row.amount, 0);
  const units = posted.reduce((sum, row) => sum + row.units, 0);
  const months = monthsTouched(range.from, range.to);
  const missed = active.filter((member) =>
    months.some(
      (month) => contributionMonthStatus(member, book.contributions, month) === "missing",
    ),
  );
  const withdrawals = book.withdrawals.filter((row) =>
    inRange(row.submittedAt, range.from, range.to),
  );
  const byStage = (status: WithdrawalStatus) =>
    withdrawals.filter((row) => row.status === status);
  const waitingAmount = book.withdrawals
    .filter((row) => row.status === "received" || row.status === "checking" || row.status === "approved")
    .reduce((sum, row) => sum + row.amount, 0);
  const paid = book.withdrawals.filter(
    (row) => row.status === "paid" && row.paidAt && inRange(row.paidAt, range.from, range.to),
  );
  const paidAmount = paid.reduce((sum, row) => sum + row.amount, 0);
  const averageDays =
    paid.length === 0
      ? null
      : Math.round(
          (paid.reduce((sum, row) => sum + daysSince(row.submittedAt, new Date(`${row.paidAt}T00:00:00`)), 0) /
            paid.length) *
            10,
        ) / 10;
  const openRequests = book.requests.filter((row) => row.status === "open");
  const stale = openRequests.filter((row) => daysSince(row.createdAt) > 2);
  const price = currentUnitPrice(book.unitPrices);
  const unitsIssued = totalUnitsInIssue(book);
  const pot = totalPot(book);

  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="The same records as the queues, for the period you choose."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportMembers(book, members)}>Member list</Button>
            <Button variant="secondary" onClick={() => exportContributions(book, range)}>Contribution ledger</Button>
            <Button variant="secondary" onClick={() => exportWithdrawals(book, range)}>Withdrawal register</Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        {(["month", "quarter", "custom"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPreset(item)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${preset === item ? "bg-navy text-white" : "border border-line bg-card text-navy"}`}
          >
            {item === "month" ? "This month" : item === "quarter" ? "This quarter" : "Custom"}
          </button>
        ))}
        {preset === "custom" ? (
          <>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={controlClass} />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={controlClass} />
          </>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-muted">
        {formatDate(range.from)} to {formatDate(range.to)}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active members" value={String(active.length)} hint={`${joined.length} joined in the period`} />
        <StatCard label="Contributions" value={String(posted.length)} hint={`${ghs(amount)} · ${formatUnits(units)} units`} />
        <StatCard label="Missed contribution" value={String(missed.length)} hint="Nothing received in a month of this period" />
        <StatCard label="Amount waiting" value={ghs(waitingAmount)} hint="Received, under review, or approved" />
        <StatCard label="Amount paid" value={ghs(paidAmount)} hint={`${paid.length} completed in the period`} />
        <StatCard label="Received to paid" value={averageDays === null ? "—" : `${averageDays} days`} hint="Average for payments in the period" />
        <StatCard label="Open requests" value={String(openRequests.length)} hint={`${stale.length} older than two days`} />
        <StatCard
          label="Unit price"
          value={price ? price.price.toFixed(3) : "Not set"}
          hint={price ? `Set ${formatDate(price.date)}` : "Pots are unavailable"}
        />
        <StatCard
          label="Units in issue"
          value={formatUnits(unitsIssued)}
          hint={pot === null ? "Pot unavailable" : `Pot ${ghs(pot)}`}
        />
      </div>
      <ul className="mt-4 text-sm text-muted">
        {(["received", "checking", "approved", "paid", "declined"] as WithdrawalStatus[]).map((status) => (
          <li key={status}>
            {WITHDRAWAL_LABEL[status]}: {byStage(status).length} submitted in the period
            {status === "paid" ? "" : ` · ${ghs(byStage(status).reduce((sum, row) => sum + row.amount, 0))}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

function exportMembers(
  book: Parameters<typeof memberPosition>[0],
  members: { id: string; memberNumber: string; mobile: string; email: string; location: string; status: string; scheme: string }[],
) {
  downloadCsv("members.csv", [
    ["Name", "Member number", "Mobile", "Email", "Location", "Scheme", "Status", "Pot", "Units", "Last contribution"],
    ...members.map((member) => {
      const position = memberPosition(book, member.id);
      const named = book.members.find((item) => item.id === member.id);
      return [
        named ? memberName(named) : "",
        member.memberNumber,
        member.mobile,
        member.email,
        member.location,
        member.scheme,
        member.status,
        position.pot === null ? "Unavailable" : ghs(position.pot),
        formatUnits(position.units),
        position.latest ? formatDate(position.latest.date) : "",
      ];
    }),
  ]);
}

function exportContributions(
  book: Parameters<typeof memberPosition>[0],
  range: { from: string; to: string },
) {
  const rows = book.contributions.filter((row) => inRange(row.date, range.from, range.to));
  downloadCsv("contributions.csv", [
    ["Date", "Member", "Member number", "Amount", "Unit price", "Units", "Channel"],
    ...rows.map((row) => {
      const member = book.members.find((item) => item.id === row.memberId);
      return [
        row.date,
        member ? memberName(member) : "",
        member?.memberNumber ?? "",
        ghs(row.amount),
        row.unitPrice.toFixed(3),
        formatUnits(row.units),
        "MTN Mobile Money",
      ];
    }),
  ]);
}

function exportWithdrawals(
  book: Parameters<typeof memberPosition>[0],
  range: { from: string; to: string },
) {
  const rows = book.withdrawals.filter((row) => inRange(row.submittedAt, range.from, range.to));
  downloadCsv("withdrawals.csv", [
    ["Submitted", "Member", "Member number", "Amount", "Reason", "Destination", "Status"],
    ...rows.map((row) => {
      const member = book.members.find((item) => item.id === row.memberId);
      return [
        formatDate(row.submittedAt),
        member ? memberName(member) : row.name,
        member?.memberNumber ?? "",
        ghs(row.amount),
        row.reason,
        row.destination,
        WITHDRAWAL_LABEL[row.status],
      ];
    }),
  ]);
}
