"use client";

import Link from "next/link";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { memberName } from "@/lib/domain";
import { formatDate, ghs } from "@/lib/format";
import {
  contributionMonthStatus,
  currentMonth,
  memberPosition,
  openRequest,
  openWithdrawal,
  overdueTasks,
} from "@/lib/pension";

export function MemberDirectory() {
  const params = useSearchParams();
  const { book, members, canRegister, registerMember } = useRecords();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [contribution, setContribution] = useState(params.get("contribution") ?? "all");
  const [openOnly, setOpenOnly] = useState({
    withdrawal: params.get("withdrawal") === "open",
    request: params.get("request") === "open",
    joined: params.get("joined") === "month",
  });
  const [registering, setRegistering] = useState(false);
  const month = currentMonth();
  const locations = [...new Set(members.map((member) => member.location))].sort();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      const name = memberName(member);
      const haystack = `${name} ${member.memberNumber} ${member.mobile} ${member.email}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (location !== "all" && member.location !== location) return false;
      const status = contributionMonthStatus(member, book.contributions, month);
      if (contribution !== "all" && status !== contribution) return false;
      if (openOnly.withdrawal && !openWithdrawal(book, member.id)) return false;
      if (openOnly.request && !openRequest(book, member.id)) return false;
      if (openOnly.joined && !member.memberSince.startsWith(month)) return false;
      return true;
    });
  }, [book, contribution, location, members, month, openOnly, query]);

  return (
    <div>
      <PageHeader
        title="Members"
        description="Search by name, member number, mobile, or email."
        action={
          canRegister ? (
            <Button onClick={() => setRegistering(true)}>Register member</Button>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-navy sm:col-span-2">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, member number, mobile, or email"
            className={controlClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
          Location
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={controlClass}
          >
            <option value="all">All locations</option>
            {locations.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
          Contribution this month
          <select
            value={contribution}
            onChange={(event) => setContribution(event.target.value)}
            className={controlClass}
          >
            <option value="all">Any</option>
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
              <Button onClick={() => setRegistering(true)}>Register member</Button>
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
        <DataTable
          columns={[
            { key: "name", header: "Member" },
            { key: "number", header: "Number" },
            { key: "mobile", header: "Mobile" },
            { key: "location", header: "Location" },
            { key: "status", header: "Status" },
            { key: "pot", header: "Pot", className: "text-right" },
            { key: "last", header: "Last contribution" },
            { key: "open", header: "Open items" },
          ]}
          rows={rows.map((member) => {
            const position = memberPosition(book, member.id);
            const items = [
              openWithdrawal(book, member.id) ? "Withdrawal" : null,
              openRequest(book, member.id) ? "Request" : null,
              overdueTasks(book, member.id).length > 0 ? "Overdue task" : null,
            ].filter(Boolean);
            return {
              id: member.id,
              cells: {
                name: (
                  <Link href={`/members/${member.id}`} className="font-medium text-navy hover:underline">
                    {memberName(member)}
                  </Link>
                ),
                number: member.memberNumber,
                mobile: member.mobile,
                location: member.location,
                status: (
                  <StatusBadge label={member.status === "active" ? "Active" : "Closed"} />
                ),
                pot: (
                  <span className="tabular-nums">
                    {position.pot === null ? "Unavailable" : ghs(position.pot)}
                  </span>
                ),
                last: position.latest ? formatDate(position.latest.date) : "None",
                open: items.length > 0 ? items.join(", ") : "None",
              },
            };
          })}
        />
      )}
      <RegisterDialog
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
  open,
  onClose,
  onSave,
}: {
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
    monthlyContribution: number;
    retirementAge: number;
    targetPot: number;
  }) => void;
}) {
  return (
    <Modal open={open} title="Register member" onClose={onClose}>
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
            monthlyContribution: Number(form.get("monthlyContribution") ?? 0),
            retirementAge: Number(form.get("retirementAge") ?? 60),
            targetPot: Number(form.get("targetPot") ?? 0),
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field name="firstName" label="First name" />
          <Field name="lastName" label="Last name" />
        </div>
        <Field name="email" label="Email" type="email" />
        <Field name="mobile" label="Mobile" />
        <div className="grid grid-cols-3 gap-3">
          <Field name="title" label="Title" />
          <Field name="gender" label="Gender" />
          <Field name="dateOfBirth" label="Date of birth" type="date" />
        </div>
        <Field name="profession" label="Profession" />
        <Field name="location" label="Location" />
        <Field name="nextOfKin" label="Next of kin" />
        <Field name="nextOfKinContact" label="Next of kin contact" />
        <div className="grid grid-cols-3 gap-3">
          <Field name="monthlyContribution" label="Monthly contribution" type="number" />
          <Field name="retirementAge" label="Retirement age" type="number" />
          <Field name="targetPot" label="Target pot" type="number" />
        </div>
        <Button type="submit">Register member</Button>
      </form>
    </Modal>
  );
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
