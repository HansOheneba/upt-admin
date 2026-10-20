"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { currentUnitPrice, contributionMonthStatus, currentMonth } from "@/lib/pension";
import { daysSince, formatDateTime, todayIso } from "@/lib/format";

const ACTIVITY = new Set([
  "withdrawal.approve",
  "contribution.post",
  "request.reply",
  "unit_price.set",
]);

export function HomeBoard() {
  const { book, members, canSee } = useRecords();
  const month = currentMonth();
  const today = todayIso();
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekIso = todayIso(week);
  const price = currentUnitPrice(book.unitPrices);
  const visible = new Set(members.map((member) => member.id));

  const received = book.withdrawals.filter(
    (row) => visible.has(row.memberId) && row.status === "received",
  ).length;
  const reviewing = book.withdrawals.filter(
    (row) => visible.has(row.memberId) && row.status === "checking",
  ).length;
  const approved = book.withdrawals.filter(
    (row) => visible.has(row.memberId) && row.status === "approved",
  ).length;
  const openRequests = book.requests.filter(
    (row) => visible.has(row.memberId) && row.status === "open",
  ).length;
  const unmatched = canSee("contributions") ? book.payments.length : 0;
  const missing = members.filter(
    (member) => contributionMonthStatus(member, book.contributions, month) === "missing",
  ).length;
  const appointments = book.appointments.filter((row) => {
    const day = row.at.slice(0, 10);
    return (
      visible.has(row.memberId) &&
      day >= today &&
      day <= weekIso &&
      row.status !== "cancelled" &&
      row.status !== "completed"
    );
  }).length;
  const overdue = book.tasks.filter(
    (task) => visible.has(task.memberId) && !task.done && task.due < today,
  ).length;
  const unpriced = price ? 0 : members.filter((member) => member.status === "active").length;
  const activity = book.audit
    .filter(
      (entry) =>
        ACTIVITY.has(entry.action) &&
        (entry.memberId === null || visible.has(entry.memberId)),
    )
    .slice(0, 4);

  const counts = [
    canSee("withdrawals")
      ? { label: "Received", value: received, hint: "Withdrawals waiting to be picked up", href: "/withdrawals?stage=received" }
      : null,
    canSee("withdrawals")
      ? { label: "Under review", value: reviewing, hint: "Withdrawals being checked", href: "/withdrawals?stage=checking" }
      : null,
    canSee("withdrawals")
      ? { label: "Approved, not paid", value: approved, hint: "Waiting for payment", href: "/withdrawals?stage=approved" }
      : null,
    canSee("requests")
      ? { label: "Requests with no reply", value: openRequests, hint: "Open messages", href: "/requests?status=open" }
      : null,
    canSee("contributions")
      ? { label: "Contributions to post", value: unmatched, hint: "Mobile Money not yet on a member", href: "/contributions" }
      : null,
    { label: "Contribution not in", value: missing, hint: "Expected this month, nothing received", href: "/members?contribution=missing" },
    canSee("appointments")
      ? { label: "Appointments, 7 days", value: appointments, hint: "Requested or confirmed", href: "/appointments" }
      : null,
    canSee("tasks")
      ? { label: "Tasks overdue", value: overdue, hint: "Due date has passed", href: "/tasks?overdue=1" }
      : null,
    canSee("unitPrice")
      ? { label: "No unit price", value: unpriced, hint: price ? "Pots can be shown" : "Pots are unavailable", href: "/unit-price" }
      : null,
  ].filter((item): item is { label: string; value: number; hint: string; href: string } => !!item);

  return (
    <div>
      <PageHeader
        title="Home"
        description="Work waiting on a person. Each count opens the queue behind it."
      />
      {counts.every((item) => item.value === 0) ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nothing is waiting"
          description="New withdrawals, requests, and payments show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-xl border border-line bg-card px-5 py-4 hover:border-navy"
            >
              <p className="text-xs font-medium text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-medium tracking-tight text-navy tabular-nums">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            </Link>
          ))}
        </div>
      )}
      <section className="mt-6 rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-navy">Recent activity</h2>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No staff actions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <p className="text-sm text-foreground">{entry.summary}</p>
                <p className="shrink-0 text-xs text-muted">
                  {formatDateTime(entry.at)}
                  {entry.action === "withdrawal.approve" ? "" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {!price ? (
          <p className="border-t border-line px-5 py-3 text-sm text-[#8A3030]">
            No unit price is set. Every member pot is unavailable.
          </p>
        ) : (
          <p className="border-t border-line px-5 py-3 text-sm text-muted">
            {canSee("withdrawals")
              ? `Unit price ${price.price.toFixed(3)} since ${formatDateTime(price.setAt)}. Longest open withdrawal has been waiting ${longestWait(book, visible)} days.`
              : `Unit price ${price.price.toFixed(3)} since ${formatDateTime(price.setAt)}.`}
          </p>
        )}
      </section>
    </div>
  );
}

function longestWait(
  book: { withdrawals: { memberId: string; status: string; submittedAt: string }[] },
  visible: Set<string>,
) {
  const waiting = book.withdrawals.filter(
    (row) =>
      visible.has(row.memberId) &&
      (row.status === "received" || row.status === "checking" || row.status === "approved"),
  );
  if (waiting.length === 0) return 0;
  return Math.max(...waiting.map((row) => daysSince(row.submittedAt)));
}
