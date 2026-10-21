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
  isManagement,
  isTeamLead,
  memberName,
  seesOrganisation,
  type Book,
  type Member,
  type Membership,
} from "@/lib/domain";
import { formatDate, formatDateTime, ghs, todayIso } from "@/lib/format";
import {
  contributionMonthStatus,
  currentMonth,
  insuranceFlag,
  periodFigures,
  schemeValue,
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
  const { book, members, memberships, canSee, staff } = useRecords();
  const [showAll, setShowAll] = useState(false);
  const month = currentMonth();
  const today = todayIso();
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekIso = todayIso(week);
  const visible = new Set(members.map((member) => member.id));
  const staffName = (id: string | null) =>
    book.staff.find((person) => person.id === id)?.name ?? "—";

  const exceptions = countExceptions(memberships, book.contributions, month);
  const priorExceptions = countExceptions(memberships, book.contributions, previousMonth(month));
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

  const queue = buildQueue(book, members, memberships, staffName, month, today);
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
    !seesOrganisation(staff) &&
    !isTeamLead(staff);

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
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
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

      {staff && isManagement(staff) ? <Organisation book={book} memberships={memberships} /> : null}
      {staff && isTeamLead(staff) ? (
        <TeamView book={book} staffId={staff.id} memberships={memberships} />
      ) : null}
      {portfolio ? <Portfolio book={book} memberships={memberships} /> : null}
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

function Organisation({ book, memberships }: { book: Book; memberships: Membership[] }) {
  return <SchemeTotals book={book} memberships={memberships} title="Organisation" />;
}

function TeamView({
  book,
  staffId,
  memberships,
}: {
  book: Book;
  staffId: string;
  memberships: Membership[];
}) {
  const schemeIds = new Set(book.schemes.filter((scheme) => scheme.leadId === staffId).map((scheme) => scheme.id));
  const scoped = memberships.filter((membership) => schemeIds.has(membership.schemeId));
  const escalated = book.withdrawals.filter(
    (row) => row.escalatedAt && scoped.some((membership) => membership.id === row.membershipId),
  );
  return (
    <>
      <SchemeTotals book={book} memberships={scoped} title="Your schemes" />
      <section className="rounded-[12px] border border-line bg-card px-5 py-4">
        <h2 className="text-[17px] font-semibold text-navy">Escalations</h2>
        {escalated.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No withdrawal is waiting on you.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {escalated.map((row) => (
              <li key={row.id}>
                <Link href={`/withdrawals?id=${row.id}`} className="font-medium text-navy hover:underline">
                  {ghs(row.amount)} · {row.escalationNote}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function SchemeTotals({
  book,
  memberships,
  title,
}: {
  book: Book;
  memberships: Membership[];
  title: string;
}) {
  const month = currentMonth();
  const value = schemeValue(book, memberships);
  const figures = periodFigures(book, memberships, month);
  const byScheme = book.schemes
    .map((scheme) => {
      const rows = memberships.filter((membership) => membership.schemeId === scheme.id);
      if (rows.length === 0) return null;
      const worth = schemeValue(book, rows);
      const movement = periodFigures(book, rows, month);
      return { scheme, worth, movement, members: new Set(rows.map((row) => row.memberId)).size };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
  return (
    <section className="rounded-[12px] border border-line bg-card px-5 py-5">
      <h2 className="text-[17px] font-semibold text-navy">{title}</h2>
      <p className="mt-1 text-sm text-muted">
        Pension value is the sum of each membership pot. A missing unit price is left out.
        {value.gaps ? ` ${value.gaps} membership${value.gaps === 1 ? "" : "s"} cannot be valued.` : ""}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Pension value" value={value.total === null ? "Unavailable" : ghs(value.total)} />
        <Metric label="Memberships" value={String(memberships.length)} />
        <Metric label="Contributions" value={ghs(figures.contributions)} hint="Net of reversals this month" />
        <Metric label="Distributions" value={ghs(figures.distributions)} hint="Paid withdrawals this month" />
        <Metric
          label="Average per payment"
          value={figures.averagePayment === null ? "—" : ghs(figures.averagePayment)}
        />
        <Metric
          label="Average per contributing member"
          value={figures.averageMember === null ? "—" : ghs(figures.averageMember)}
        />
      </dl>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {byScheme.map((row) => (
          <li key={row.scheme.id} className="flex justify-between gap-3">
            <span className="text-navy">{row.scheme.name}</span>
            <span className="text-right tabular-nums text-muted">
              {row.worth.total === null ? "Unavailable" : ghs(row.worth.total)}
              {row.worth.gaps ? ` · ${row.worth.gaps} unpriced` : ""}
              {" · "}
              {ghs(row.movement.contributions)} in · {ghs(row.movement.distributions)} out
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Portfolio({ book, memberships }: { book: Book; memberships: Membership[] }) {
  const month = currentMonth();
  const active = memberships.filter((membership) => membership.status === "active");
  const value = schemeValue(book, active);
  const expected = Math.round(active.reduce((sum, membership) => sum + membership.monthlyContribution, 0) * 100) / 100;
  const received = Math.round(
    book.contributions
      .filter((row) => active.some((membership) => membership.id === row.membershipId) && row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0) * 100,
  ) / 100;
  const open = book.withdrawals.filter(
    (row) =>
      active.some((membership) => membership.id === row.membershipId) &&
      (row.status === "received" || row.status === "checking" || row.status === "approved"),
  ).length;

  return (
    <section className="rounded-[12px] border border-line bg-card px-5 py-5">
      <h2 className="text-[17px] font-semibold text-navy">Assigned portfolio</h2>
      <p className="mt-1 text-sm text-muted">
        Active memberships assigned to you. Each pot uses that scheme&apos;s unit price.
        {value.gaps ? ` ${value.gaps} cannot be valued yet.` : ""}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Assigned active memberships" value={String(active.length)} />
        <Metric label="Pension value" value={value.total === null ? "Unavailable" : ghs(value.total)} />
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
  memberships: Membership[],
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

  for (const membership of memberships) {
    const member = members.find((item) => item.id === membership.memberId);
    if (!member) continue;
    const status = contributionMonthStatus(membership, book.contributions, month);
    if (status !== "missing" && status !== "partial") continue;
    const received = book.contributions
      .filter((row) => row.membershipId === membership.id && row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0);
    const scheme = book.schemes.find((item) => item.id === membership.schemeId)?.name ?? "Scheme";
    items.push({
      id: `contrib-${membership.id}`,
      priority: status === "missing" ? "High" : "Normal",
      memberId: member.id,
      member: memberName(member),
      issue:
        status === "missing"
          ? `${scheme}: no contribution posted this month`
          : `${scheme}: short payment ${ghs(received)} of ${ghs(membership.monthlyContribution)}`,
      when: `${month}-01`,
      owner: staffName(membership.relationshipManagerId),
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

function countExceptions(memberships: Membership[], contributions: Book["contributions"], month: string) {
  return memberships.filter((membership) => {
    const status = contributionMonthStatus(membership, contributions, month);
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
