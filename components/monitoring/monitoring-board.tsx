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
  membershipPosition,
  monthsTouched,
  periodStart,
  pricesForScheme,
  schemeValue,
} from "@/lib/pension";

export function MonitoringBoard() {
  const { book, memberships, schemeId, schemes } = useRecords();
  const [preset, setPreset] = useState<"month" | "quarter" | "custom">("month");
  const [from, setFrom] = useState(periodStart("month"));
  const [to, setTo] = useState(todayIso());

  const range = useMemo(() => {
    if (preset === "month") return { from: periodStart("month"), to: todayIso() };
    if (preset === "quarter") return { from: periodStart("quarter"), to: todayIso() };
    return { from, to };
  }, [from, preset, to]);

  const ids = useMemo(() => new Set(memberships.map((membership) => membership.id)), [memberships]);
  const joined = memberships.filter(
    (membership) => membership.status === "active" && inRange(membership.effectiveFrom, range.from, range.to),
  );
  const active = memberships.filter((membership) => membership.status === "active");
  const posted = book.contributions.filter(
    (row) => ids.has(row.membershipId) && inRange(row.date, range.from, range.to),
  );
  const amount = posted.reduce((sum, row) => sum + row.amount, 0);
  const units = posted.reduce((sum, row) => sum + row.units, 0);
  const months = monthsTouched(range.from, range.to);
  const missed = active.filter((membership) =>
    months.some(
      (month) => contributionMonthStatus(membership, book.contributions, month) === "missing",
    ),
  );
  const withdrawals = book.withdrawals.filter(
    (row) => ids.has(row.membershipId) && inRange(row.submittedAt, range.from, range.to),
  );
  const byStage = (status: WithdrawalStatus) =>
    withdrawals.filter((row) => row.status === status);
  const waitingAmount = book.withdrawals
    .filter(
      (row) =>
        ids.has(row.membershipId) &&
        (row.status === "received" || row.status === "checking" || row.status === "approved"),
    )
    .reduce((sum, row) => sum + row.amount, 0);
  const paid = book.withdrawals.filter(
    (row) =>
      ids.has(row.membershipId) &&
      row.status === "paid" &&
      row.paidAt &&
      inRange(row.paidAt, range.from, range.to),
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
  const openRequests = book.requests.filter((row) => row.status === "open" && ids.has(row.membershipId));
  const stale = openRequests.filter((row) => daysSince(row.createdAt) > 2);
  const price =
    schemeId === "all" ? null : currentUnitPrice(pricesForScheme(book, schemeId));
  const worth = schemeValue(book, active);
  const schemeLabel =
    schemeId === "all"
      ? "All schemes in your authority"
      : (schemes.find((scheme) => scheme.id === schemeId)?.name ?? "Scheme");

  return (
    <div>
      <PageHeader
        title="Fund overview"
        description={`Scheme position for ${schemeLabel}. Figures use the records on file for the period you choose.`}
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
        <StatCard label="Active memberships" value={String(active.length)} hint={`${joined.length} opened in the period`} />
        <StatCard label="Contributions in period" value={ghs(amount)} hint={`${posted.length} posted · ${formatUnits(units)} units allocated`} />
        <StatCard label="Missed contribution" value={String(missed.length)} hint="Nothing received in a month of this period" />
        <StatCard label="Withdrawals waiting" value={ghs(waitingAmount)} hint="Received, under review, or approved. Not yet paid." />
        <StatCard label="Withdrawals paid" value={ghs(paidAmount)} hint={`${paid.length} completed in the period`} />
        <StatCard label="Received to paid" value={averageDays === null ? "—" : `${averageDays} days`} hint="Average for payments completed in the period" />
        <StatCard label="Open requests" value={String(openRequests.length)} hint={`${stale.length} older than two days`} />
        <StatCard
          label="Unit price"
          value={price ? price.price.toFixed(3) : "Not set"}
          hint={
            price
              ? `Valuation price set ${formatDate(price.date)}`
              : schemeId === "all"
                ? "Choose one scheme to see its unit price"
                : "Pension value is unavailable"
          }
        />
        <StatCard
          label="Pension value"
          value={worth.total === null ? "Unavailable" : ghs(worth.total)}
          hint={
            worth.gaps
              ? `${formatUnits(worth.units)} units · ${worth.gaps} memberships have no price`
              : `${formatUnits(worth.units)} units, each scheme at its own price`
          }
        />
      </div>
      <section id="reports" className="mt-6 rounded-[12px] border border-line bg-card px-5 py-4">
        <h2 className="text-base font-semibold text-navy">Reports</h2>
        <p className="mt-1 text-[13px] text-muted">
          Exports use the same records as the figures above, for {formatDate(range.from)} to {formatDate(range.to)}.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ReportCard title="Member reports" text="Membership list with pension value and units." onExport={() => exportMembers(book, memberships)} />
          <ReportCard title="Contribution reports" text={`Contribution ledger for ${schemeLabel}, ${formatDate(range.from)} to ${formatDate(range.to)}.`} onExport={() => exportContributions(book, range, ids)} />
          <ReportCard title="Withdrawal reports" text={`Withdrawal register for ${schemeLabel}, ${formatDate(range.from)} to ${formatDate(range.to)}.`} onExport={() => exportWithdrawals(book, range, ids)} />
        </div>
      </section>
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

function ReportCard({
  title,
  text,
  onExport,
}: {
  title: string;
  text: string;
  onExport: () => void;
}) {
  return (
    <article className="rounded-[10px] border border-line p-4">
      <h3 className="text-sm font-medium text-navy">{title}</h3>
      <p className="mt-1 text-[13px] leading-5 text-muted">{text}</p>
      <Button variant="secondary" className="mt-3" onClick={onExport}>
        Export
      </Button>
    </article>
  );
}

function exportMembers(
  book: Parameters<typeof membershipPosition>[0],
  memberships: { id: string; memberId: string; membershipNumber: string; schemeId: string; status: string }[],
) {
  downloadCsv("members.csv", [
    ["Name", "Membership", "Mobile", "Email", "Location", "Scheme", "Status", "Pot", "Units", "Last contribution"],
    ...memberships.map((membership) => {
      const position = membershipPosition(book, membership.id);
      const named = book.members.find((item) => item.id === membership.memberId);
      const scheme = book.schemes.find((item) => item.id === membership.schemeId);
      return [
        named ? memberName(named) : "",
        membership.membershipNumber,
        named?.mobile ?? "",
        named?.email ?? "",
        named?.location ?? "",
        scheme?.name ?? "",
        membership.status,
        position.pot === null ? "Unavailable" : ghs(position.pot),
        formatUnits(position.units),
        position.latest ? formatDate(position.latest.date) : "",
      ];
    }),
  ]);
}

function exportContributions(
  book: Parameters<typeof membershipPosition>[0],
  range: { from: string; to: string },
  membershipIds: Set<string>,
) {
  const rows = book.contributions.filter(
    (row) => membershipIds.has(row.membershipId) && inRange(row.date, range.from, range.to),
  );
  downloadCsv("contributions.csv", [
    ["Date", "Member", "Scheme", "Membership", "Amount", "Unit price", "Units", "Channel"],
    ...rows.map((row) => {
      const member = book.members.find((item) => item.id === row.memberId);
      const membership = book.memberships.find((item) => item.id === row.membershipId);
      const scheme = book.schemes.find((item) => item.id === membership?.schemeId);
      return [
        row.date,
        member ? memberName(member) : "",
        scheme?.name ?? "",
        membership?.membershipNumber ?? "",
        ghs(row.amount),
        row.unitPrice.toFixed(3),
        formatUnits(row.units),
        "MTN Mobile Money",
      ];
    }),
  ]);
}

function exportWithdrawals(
  book: Parameters<typeof membershipPosition>[0],
  range: { from: string; to: string },
  membershipIds: Set<string>,
) {
  const rows = book.withdrawals.filter(
    (row) => membershipIds.has(row.membershipId) && inRange(row.submittedAt, range.from, range.to),
  );
  downloadCsv("withdrawals.csv", [
    ["Submitted", "Member", "Scheme", "Membership", "Amount", "Reason", "Destination", "Status"],
    ...rows.map((row) => {
      const member = book.members.find((item) => item.id === row.memberId);
      const membership = book.memberships.find((item) => item.id === row.membershipId);
      const scheme = book.schemes.find((item) => item.id === membership?.schemeId);
      return [
        formatDate(row.submittedAt),
        member ? memberName(member) : row.name,
        scheme?.name ?? "",
        membership?.membershipNumber ?? "",
        ghs(row.amount),
        row.reason,
        row.destination,
        WITHDRAWAL_LABEL[row.status],
      ];
    }),
  ]);
}
