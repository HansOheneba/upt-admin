"use client";

import Link from "next/link";
import { Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { memberName, seesOrganisation, type Book } from "@/lib/domain";
import { formatDate, ghs } from "@/lib/format";
import {
  contributionMonthStatus,
  currentMonth,
  openRequest,
  openWithdrawal,
  personHoldings,
} from "@/lib/pension";

export function MemberDirectory() {
  const params = useSearchParams();
  const { book, members, memberships, schemes, canRegister, registerMember, staff } = useRecords();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [scheme, setScheme] = useState("all");
  const [manager, setManager] = useState("all");
  const [contribution, setContribution] = useState(params.get("contribution") ?? "all");
  const [openOnly, setOpenOnly] = useState({
    withdrawal: params.get("withdrawal") === "open",
    request: params.get("request") === "open",
    joined: params.get("joined") === "month",
  });
  const [registering, setRegistering] = useState(false);
  const [page, setPage] = useState(1);
  const month = currentMonth();
  const schemeOptions = schemes.filter((item) =>
    memberships.some((membership) => membership.schemeId === item.id),
  );
  const managers = book.staff.filter((person) =>
    memberships.some((membership) => membership.relationshipManagerId === person.id),
  );
  const showManagers = !!staff && seesOrganisation(staff);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      const own = memberships.filter((membership) => membership.memberId === member.id);
      const name = memberName(member);
      const numbers = own.map((membership) => membership.membershipNumber).join(" ");
      const haystack = `${name} ${numbers} ${member.mobile} ${member.email}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && !own.some((membership) => membership.status === status)) return false;
      if (scheme !== "all" && !own.some((membership) => membership.schemeId === scheme)) return false;
      if (manager !== "all" && !own.some((membership) => membership.relationshipManagerId === manager)) {
        return false;
      }
      const monthStatuses = own.map((membership) =>
        contributionMonthStatus(membership, book.contributions, month),
      );
      if (
        contribution === "exception" &&
        !monthStatuses.some((item) => item === "missing" || item === "partial")
      ) {
        return false;
      }
      if (
        contribution !== "all" &&
        contribution !== "exception" &&
        !monthStatuses.includes(contribution as "received" | "partial" | "missing" | "closed")
      ) {
        return false;
      }
      if (openOnly.withdrawal && !openWithdrawal(book, member.id)) return false;
      if (openOnly.request && !openRequest(book, member.id)) return false;
      if (openOnly.joined && !own.some((membership) => membership.effectiveFrom.startsWith(month))) {
        return false;
      }
      return true;
    });
  }, [book, contribution, manager, members, memberships, month, openOnly, query, scheme, status]);

  useEffect(() => {
    setPage(1);
  }, [query, status, scheme, manager, contribution, openOnly]);

  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Member Directory"
        description="Find members and review their pension information."
        action={
          canRegister ? (
            <Button onClick={() => setRegistering(true)}>Add member</Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex w-full min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-navy sm:min-w-[220px]">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or member reference"
            className={controlClass}
          />
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-40">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={controlClass}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-48">
          Scheme
          <select value={scheme} onChange={(event) => setScheme(event.target.value)} className={controlClass}>
            <option value="all">All schemes</option>
            {schemeOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        {showManagers ? (
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-52">
            Relationship manager
            <select value={manager} onChange={(event) => setManager(event.target.value)} className={controlClass}>
              <option value="all">All managers</option>
              {managers.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-48">
          Contribution this month
          <select
            value={contribution}
            onChange={(event) => setContribution(event.target.value)}
            className={controlClass}
          >
            <option value="all">Any</option>
            <option value="exception">Missing or short</option>
            <option value="received">Received</option>
            <option value="missing">Missing</option>
            <option value="partial">Partial</option>
          </select>
        </label>
      </div>
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-navy">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={openOnly.withdrawal}
            onChange={(event) =>
              setOpenOnly((current) => ({ ...current, withdrawal: event.target.checked }))
            }
          />
          Open withdrawal
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={openOnly.request}
            onChange={(event) =>
              setOpenOnly((current) => ({ ...current, request: event.target.checked }))
            }
          />
          Open request
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={openOnly.joined}
            onChange={(event) =>
              setOpenOnly((current) => ({ ...current, joined: event.target.checked }))
            }
          />
          Joined this month
        </label>
      </div>
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members on your list"
          description="Members assigned to you appear here."
          action={
            canRegister ? (
              <Button onClick={() => setRegistering(true)}>Add member</Button>
            ) : undefined
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching members"
          description="Try another name, number, mobile, or email."
          action={<Button onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <>
          <DataTable
            columns={[
              { key: "name", header: "Member" },
              { key: "scheme", header: "Scheme" },
              { key: "status", header: "Status" },
              { key: "manager", header: "Relationship manager" },
              { key: "pot", header: "Pension value", className: "text-right" },
              { key: "last", header: "Latest contribution", className: "text-right" },
              { key: "activity", header: "Last activity" },
              { key: "action", header: "Actions" },
            ]}
            rows={visibleRows.map((member) => {
              const own = memberships.filter((membership) => membership.memberId === member.id);
              const holdings = personHoldings(book, member.id).rows.filter((row) =>
                own.some((membership) => membership.id === row.membership.id),
              );
              const known = holdings
                .map((row) => row.position.pot)
                .filter((pot): pot is number => pot !== null);
              const pot =
                known.length === 0
                  ? null
                  : Math.round(known.reduce((sum, value) => sum + value, 0) * 100) / 100;
              const latest = holdings
                .map((row) => row.position.latest)
                .filter((row): row is NonNullable<typeof row> => !!row)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              const managerName =
                book.staff.find((person) =>
                  own.some((membership) => membership.relationshipManagerId === person.id),
                )?.name ?? "—";
              const activity = lastActivity(book, member.id);
              const active = own.some((membership) => membership.status === "active");
              return {
                id: member.id,
                cells: {
                  name: (
                    <Link href={`/members/${member.id}`} className="font-medium text-navy hover:underline">
                      {memberName(member)}
                      <span className="block text-xs font-normal text-muted">
                        {own.map((membership) => membership.membershipNumber).join(", ")}
                      </span>
                    </Link>
                  ),
                  scheme: own
                    .map((membership) => book.schemes.find((item) => item.id === membership.schemeId)?.name)
                    .filter(Boolean)
                    .join(", "),
                  status: <StatusBadge label={active ? "Active" : "Closed"} />,
                  manager: managerName,
                  pot: (
                    <span className="tabular-nums">{pot === null ? "Unavailable" : ghs(pot)}</span>
                  ),
                  last: (
                    <span className="tabular-nums">
                      {latest ? `${ghs(latest.amount)} · ${formatDate(latest.date)}` : "None"}
                    </span>
                  ),
                  activity: activity ? formatDate(activity) : "None",
                  action: (
                    <Link href={`/members/${member.id}`} className="font-medium text-navy hover:underline">
                      Open
                    </Link>
                  ),
                },
              };
            })}
          />
          <Pagination page={page} pages={pages} onPage={setPage} />
        </>
      )}
      <RegisterDialog
        schemes={schemes.filter((item) => item.status === "open")}
        open={registering}
        onClose={() => setRegistering(false)}
        onSave={(input) => {
          const ok = registerMember(input);
          if (ok) setRegistering(false);
        }}
      />
    </div>
  );
}

function RegisterDialog({
  schemes,
  open,
  onClose,
  onSave,
}: {
  schemes: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onSave: (input: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    dateOfBirth: string;
    gender: string;
    title: string;
    profession: string;
    location: string;
    nextOfKin: string;
    nextOfKinContact: string;
    schemeId: string;
    monthlyContribution: number;
    retirementAge: number;
    targetPot: number;
  }) => void;
}) {
  return (
    <Modal open={open} title="Add member" onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            firstName: String(form.get("firstName") ?? ""),
            lastName: String(form.get("lastName") ?? ""),
            email: String(form.get("email") ?? ""),
            mobile: String(form.get("mobile") ?? ""),
            dateOfBirth: String(form.get("dateOfBirth") ?? ""),
            gender: String(form.get("gender") ?? ""),
            title: String(form.get("title") ?? ""),
            profession: String(form.get("profession") ?? ""),
            location: String(form.get("location") ?? ""),
            nextOfKin: String(form.get("nextOfKin") ?? ""),
            nextOfKinContact: String(form.get("nextOfKinContact") ?? ""),
            schemeId: String(form.get("schemeId") ?? ""),
            monthlyContribution: Number(form.get("monthlyContribution") ?? 0),
            retirementAge: Number(form.get("retirementAge") ?? 60),
            targetPot: Number(form.get("targetPot") ?? 0),
          });
        }}
      >
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <Field name="firstName" label="First name" />
          <Field name="lastName" label="Last name" />
        </div>
        <Field name="email" label="Email" type="email" />
        <Field name="mobile" label="Mobile" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field name="title" label="Title" />
          <Field name="gender" label="Gender" />
          <Field name="dateOfBirth" label="Date of birth" type="date" />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
          Scheme
          <select name="schemeId" required className={controlClass}>
            {schemes.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
            ))}
          </select>
        </label>
        <Field name="profession" label="Profession" />
        <Field name="location" label="Location" />
        <Field name="nextOfKin" label="Next of kin" />
        <Field name="nextOfKinContact" label="Next of kin contact" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field name="monthlyContribution" label="Monthly contribution" type="number" />
          <Field name="retirementAge" label="Retirement age" type="number" />
          <Field name="targetPot" label="Target pot" type="number" />
        </div>
        <Button type="submit">Add member</Button>
      </form>
    </Modal>
  );
}

function lastActivity(book: Book, memberId: string) {
  const dates = [
    ...book.contributions.filter((row) => row.memberId === memberId).map((row) => row.date),
    ...book.withdrawals.filter((row) => row.memberId === memberId).map((row) => row.submittedAt),
    ...book.requests.filter((row) => row.memberId === memberId).map((row) => row.createdAt),
    ...book.appointments.filter((row) => row.memberId === memberId).map((row) => row.at),
    ...book.messages.filter((row) => row.memberId === memberId).map((row) => row.at),
    ...book.documents.filter((row) => row.memberId === memberId).map((row) => row.uploadedAt),
  ].filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort((a, b) => a.localeCompare(b)).at(-1) ?? null;
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
      {label}
      <input name={name} type={type} required={type !== "email"} className={controlClass} />
    </label>
  );
}
