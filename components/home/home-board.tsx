"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CalendarClock, CircleAlert, ClipboardList } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  WITHDRAWAL_LABEL,
  memberName,
  seesAllMembers,
  type Book,
  type Member,
} from "@/lib/domain";
import { formatDate, formatDateTime, ghs, todayIso } from "@/lib/format";
import {
  contributionMonthStatus,
  currentMonth,
  currentUnitPrice,
  insuranceFlag,
  memberPosition,
} from "@/lib/pension";

type ChangeTone = "good" | "bad" | "neutral";

type PeriodChange = {
  direction: "up" | "down" | "flat";
  label: string;
  tone: ChangeTone;
};

type QueueItem = {
  id: string;
  priority: "High" | "Normal";
  memberId: string;
  member: string;
  issue: string;
  when: string;
  owner: string;
  status: string;
  href: string;
  rank: number;
};

export function HomeBoard() {
  const { book, members, canSee, staff } = useRecords();
  const [showAll, setShowAll] = useState(false);
  const month = currentMonth();
  const today = todayIso();
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekIso = todayIso(week);
  const visible = new Set(members.map((member) => member.id));
  const staffName = (id: string | null) =>
    book.staff.find((person) => person.id === id)?.name ?? "—";

  const exceptions = countExceptions(members, book.contributions, month);
  const priorExceptions = countExceptions(members, book.contributions, previousMonth(month));
  const lastWeekIso = shiftIso(today, -7);

  const appointments = book.appointments
    .filter((row) => {
      const day = row.at.slice(0, 10);
      return (
        visible.has(row.memberId) &&
        day >= today &&
        day <= weekIso &&
        row.status !== "cancelled" &&
        row.status !== "completed"
      );
    })
    .sort((a, b) => a.at.localeCompare(b.at));

  const priorAppointments = book.appointments.filter((row) => {
    const day = row.at.slice(0, 10);
    return visible.has(row.memberId) && day >= lastWeekIso && day < today && row.status !== "cancelled";
  }).length;

  const overdue = book.tasks.filter(
    (task) => visible.has(task.memberId) && !task.done && task.due < today,
  );

  const myTasks = book.tasks
    .filter(
      (task) =>
        visible.has(task.memberId) && !task.done && task.staffId === staff?.id,
    )
    .sort((a, b) => a.due.localeCompare(b.due));

  const queue = buildQueue(book, members, staffName, month, today);
  const shown = showAll ? queue : queue.slice(0, 5);

  const cards = [
    {
      href: "/members?contribution=exception",
      icon: CircleAlert,
      tone: "warning" as const,
      label: "Contribution exceptions",
      value: exceptions,
      change: periodChange(exceptions, priorExceptions, "vs last month", true),
    },
    canSee("appointments")
      ? {
          href: "/appointments",
          icon: CalendarClock,
          tone: "info" as const,
          label: "Upcoming appointments",
          value: appointments.length,
          change: periodChange(appointments.length, priorAppointments, "vs last week", false),
        }
      : null,
    canSee("tasks")
      ? {
          href: "/tasks?overdue=1",
          icon: ClipboardList,
          tone: "danger" as const,
          label: "Overdue tasks",
          value: overdue.length,
          change: {
            direction: "flat" as const,
            label: overdue.length === 0 ? "None past their due date" : "Past their due date",
            tone: (overdue.length === 0 ? "good" : "bad") as ChangeTone,
          },
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => !!item);

  const portfolio =
    staff &&
    staff.roles.includes("relationship_manager") &&
    !seesAllMembers(staff);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Home"
        description="Your workload, member activity, and items requiring attention."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <WorkCard key={card.label} {...card} />
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-navy">Priority work queue</h2>
            <p className="mt-0.5 text-[13px] text-muted">Items requiring review or follow-up.</p>
          </div>
          {queue.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="cursor-pointer text-sm font-medium text-navy"
            >
              {showAll ? "Show less" : "View all"}
            </button>
          ) : null}
        </div>
        {shown.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing is waiting"
            description="Contribution exceptions, open withdrawals, and overdue tasks show up here."
            compact
          />
        ) : (
          <DataTable
            density="queue"
            columns={[
              { key: "priority", header: "Priority", className: "w-[96px]" },
              { key: "member", header: "Member", className: "w-[200px]" },
              { key: "issue", header: "Issue" },
              { key: "when", header: "Date", className: "w-[124px] whitespace-nowrap" },
              { key: "owner", header: "Owner", className: "w-[128px] whitespace-nowrap" },
              { key: "status", header: "Status", className: "w-[128px]" },
              { key: "action", header: "Action", className: "w-[72px] text-right" },
            ]}
            rows={shown.map((item) => ({
              id: item.id,
              cells: {
                priority: <StatusBadge label={item.priority} />,
                member: (
                  <Link href={`/members/${item.memberId}`} className="font-medium text-navy hover:underline">
                    {item.member}
                  </Link>
                ),
                issue: item.issue,
                when: formatDate(item.when),
                owner: item.owner,
                status: <StatusBadge label={item.status} />,
                action: (
                  <Link href={item.href} className="font-medium text-navy hover:underline">
                    Open
                  </Link>
                ),
              },
            }))}
          />
        )}
      </section>

      {canSee("appointments") || canSee("tasks") ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {canSee("appointments") ? (
            <Panel
              title="Upcoming appointments"
              action={
                <Link href="/appointments" className="text-sm font-medium text-navy">
                  View calendar
                </Link>
              }
            >
              {appointments.length === 0 ? (
                <p className="text-sm text-muted">No appointments in the next 7 days.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {appointments.slice(0, 3).map((row) => {
                    const member = book.members.find((item) => item.id === row.memberId);
                    return (
                      <li key={row.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-navy">
                              {member ? (
                                <Link href={`/members/${member.id}`} className="hover:underline">
                                  {memberName(member)}
                                </Link>
                              ) : (
                                "Member"
                              )}
                            </p>
                            <p className="mt-0.5 text-[13px] text-muted">
                              {formatDateTime(row.at)} · {row.type}
                            </p>
                          </div>
                          <StatusBadge label={labelStatus(row.status)} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : null}
          {canSee("tasks") ? (
            <Panel
              title="My tasks"
              action={
                <Link href="/tasks" className="text-sm font-medium text-navy">
                  View all tasks
                </Link>
              }
            >
              {myTasks.length === 0 ? (
                <p className="text-sm text-muted">No outstanding tasks assigned to you.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {myTasks.slice(0, 3).map((task) => {
                    const member = book.members.find((item) => item.id === task.memberId);
                    const late = task.due < today;
                    return (
                      <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-navy">{task.title}</p>
                            <p className="mt-0.5 text-[13px] text-muted">
                              {member ? (
                                <Link href={`/members/${member.id}`} className="hover:text-navy hover:underline">
                                  {memberName(member)}
                                </Link>
                              ) : (
                                "Member"
                              )}
                              {" · due "}
                              {formatDate(task.due)}
                            </p>
                          </div>
                          <StatusBadge label={late ? "Overdue" : labelStatus(task.priority)} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      ) : null}

      {portfolio ? <Portfolio book={book} members={members} /> : null}
    </div>
  );
}

function WorkCard({
  href,
  icon: Icon,
  tone,
  label,
  value,
  change,
}: {
  href: string;
  icon: typeof CircleAlert;
  tone: "warning" | "info" | "danger";
  label: string;
  value: number;
  change: PeriodChange;
}) {
  const tones = {
    warning: "bg-[#FBF3E4] text-warning",
    info: "bg-[#E8F0FA] text-info",
    danger: "bg-[#F8E8E8] text-danger",
  };
  const changeTone = {
    good: "text-success",
    bad: "text-danger",
    neutral: "text-muted",
  };
  const Arrow = change.direction === "up" ? ArrowUp : change.direction === "down" ? ArrowDown : null;

  return (
    <Link
      href={href}
      className="flex min-h-[132px] flex-col rounded-[12px] border border-line bg-card px-5 py-4 shadow-[0_1px_2px_rgba(23,32,51,0.04)] hover:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] ${tones[tone]}`}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </span>
      <span className="mt-3 text-[32px] leading-none font-semibold text-navy tabular-nums">{value}</span>
      <span className={`mt-3 flex items-center gap-1 text-[13px] font-medium ${changeTone[change.tone]}`}>
        {Arrow ? <Arrow className="size-3.5" strokeWidth={2.5} aria-hidden /> : null}
        {change.label}
      </span>
    </Link>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-line bg-card px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-navy">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Portfolio({ book, members }: { book: Book; members: Member[] }) {
  const month = currentMonth();
  const price = currentUnitPrice(book.unitPrices);
  const active = members.filter((member) => member.status === "active");
  const pots = active.map((member) => memberPosition(book, member.id).pot);
  const known = pots.filter((pot): pot is number => pot !== null);
  const total = known.length === 0 ? null : Math.round(known.reduce((sum, pot) => sum + pot, 0) * 100) / 100;
  const expected = Math.round(active.reduce((sum, member) => sum + member.monthlyContribution, 0) * 100) / 100;
  const received = Math.round(
    book.contributions
      .filter((row) => active.some((member) => member.id === row.memberId) && row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0) * 100,
  ) / 100;
  const open = book.withdrawals.filter(
    (row) =>
      active.some((member) => member.id === row.memberId) &&
      (row.status === "received" || row.status === "checking" || row.status === "approved"),
  ).length;

  return (
    <section className="rounded-[12px] border border-line bg-card px-5 py-5">
      <h2 className="text-[17px] font-semibold text-navy">Assigned portfolio</h2>
      <p className="mt-1 text-sm text-muted">
        Active members assigned to you.
        {price
          ? ` Pension value is units held × the unit price of ${price.price.toFixed(3)}, valued ${formatDate(price.date)}.`
          : " No unit price is set, so pension value is unavailable."}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Assigned active members" value={String(active.length)} />
        <Metric label="Pension value" value={total === null ? "Unavailable" : ghs(total)} />
        <Metric
          label="Contributions this month"
          value={ghs(received)}
          hint={`Expected ${ghs(expected)}`}
        />
        <Metric label="Open withdrawals" value={String(open)} hint="Received, under review, or approved" />
      </dl>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-1 text-[22px] font-semibold text-navy tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function buildQueue(
  book: Book,
  members: Member[],
  staffName: (id: string | null) => string,
  month: string,
  today: string,
): QueueItem[] {
  const items: QueueItem[] = [];
  const named = new Map(members.map((member) => [member.id, memberName(member)]));

  for (const task of book.tasks) {
    const name = named.get(task.memberId);
    if (!name || task.done || task.due >= today) continue;
    items.push({
      id: `task-${task.id}`,
      priority: task.priority === "high" ? "High" : "Normal",
      memberId: task.memberId,
      member: name,
      issue: `Overdue follow-up: ${task.title}`,
      when: task.due,
      owner: staffName(task.staffId),
      status: "Overdue",
      href: `/tasks?overdue=1`,
      rank: task.priority === "high" ? 1 : 4,
    });
  }

  for (const row of book.withdrawals) {
    const name = named.get(row.memberId);
    if (!name) continue;
    if (row.status !== "received" && row.status !== "checking" && row.status !== "approved") continue;
    items.push({
      id: `wd-${row.id}`,
      priority: row.status === "received" ? "High" : "Normal",
      memberId: row.memberId,
      member: name,
      issue: `Withdrawal awaiting ${row.status === "approved" ? "payment" : "review"}`,
      when: row.submittedAt,
      owner: row.approvedBy ? staffName(row.approvedBy) : "—",
      status: WITHDRAWAL_LABEL[row.status],
      href: `/withdrawals?id=${row.id}`,
      rank: row.status === "approved" ? 3 : 2,
    });
  }

  for (const member of members) {
    const status = contributionMonthStatus(member, book.contributions, month);
    if (status !== "missing" && status !== "partial") continue;
    const received = book.contributions
      .filter((row) => row.memberId === member.id && row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0);
    items.push({
      id: `contrib-${member.id}`,
      priority: status === "missing" ? "High" : "Normal",
      memberId: member.id,
      member: memberName(member),
      issue:
        status === "missing"
          ? "No contribution posted this month"
          : `Short payment: ${ghs(received)} of ${ghs(member.monthlyContribution)}`,
      when: `${month}-01`,
      owner: staffName(member.relationshipManagerId),
      status: status === "missing" ? "Missing" : "Partial",
      href: `/members/${member.id}`,
      rank: status === "missing" ? 5 : 6,
    });
  }

  for (const policy of book.insurance) {
    const name = named.get(policy.memberId);
    const flag = insuranceFlag(policy.renewalDate, policy.active, today);
    if (!name || !flag) continue;
    items.push({
      id: `ins-${policy.id}`,
      priority: flag === "Expired" ? "High" : "Normal",
      memberId: policy.memberId,
      member: name,
      issue: `${flag}: ${policy.policyName}`,
      when: policy.renewalDate,
      owner: "—",
      status: flag,
      href: `/members/${policy.memberId}`,
      rank: flag === "Expired" ? 7 : 8,
    });
  }

  return items.sort((a, b) => a.rank - b.rank || a.when.localeCompare(b.when));
}

function labelStatus(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function countExceptions(members: Member[], contributions: Book["contributions"], month: string) {
  return members.filter((member) => {
    const status = contributionMonthStatus(member, contributions, month);
    return status === "missing" || status === "partial";
  }).length;
}

function previousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  return todayIso(new Date(year, month - 1, day + days));
}

function periodChange(current: number, previous: number, period: string, higherIsWorse: boolean): PeriodChange {
  const delta = current - previous;
  if (delta === 0) {
    return { direction: "flat", label: `No change ${period}`, tone: "neutral" };
  }
  const direction = delta > 0 ? "up" : "down";
  const tone: ChangeTone = !higherIsWorse ? "neutral" : delta > 0 ? "bad" : "good";
  const amount = Math.abs(delta);
  return {
    direction,
    label: `${amount} ${delta > 0 ? "more" : "fewer"} ${period}`,
    tone,
  };
}
