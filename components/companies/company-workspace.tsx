"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canManageCompany,
  canManageScheme,
  companiesForStaff,
  isManagement,
  memberName,
  visibleMemberships,
  visibleMembers,
} from "@/lib/domain";
import { formatDate, ghs } from "@/lib/format";
import { contributionMonthStatus, currentMonth } from "@/lib/pension";

const TABS = ["Overview", "Schemes", "Employees", "Contributions", "Activity"] as const;

export function CompanyWorkspace({ id }: { id: string }) {
  const records = useRecords();
  const saving = useRef(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [personQuery, setPersonQuery] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const staff = records.staff;
  const company = records.book.companies.find((item) => item.id === id) ?? null;
  const allowed = !!staff && !!company && companiesForStaff(records.book, staff).some((item) => item.id === company.id);
  const canManage = !!staff && !!company && canManageCompany(records.book, staff, company.id);

  const participations = records.book.companySchemes.filter(
    (row) => row.companyId === id && records.schemes.some((scheme) => scheme.id === row.schemeId),
  );
  const employments = records.book.employments.filter((employment) => employment.companyId === id);
  const seenMemberships = staff ? visibleMemberships(records.book, staff) : [];
  const employerMemberships = seenMemberships.filter((membership) => membership.companyId === id);
  const scopedMemberships = records.memberships.filter((membership) => membership.companyId === id);

  const people = useMemo(() => {
    if (!staff) return [];
    const needle = personQuery.trim().toLowerCase();
    return visibleMembers(records.book, staff).filter((member) =>
      !needle || memberName(member).toLowerCase().includes(needle),
    );
  }, [personQuery, records.book, staff]);

  const shownEmployees = employments.filter((employment) => {
    const person = records.book.members.find((item) => item.id === employment.memberId);
    const needle = employeeQuery.trim().toLowerCase();
    if (!needle || !person) return !needle;
    return `${memberName(person)} ${person.id}`.toLowerCase().includes(needle);
  });

  if (!records.ready) return <div className="min-h-[50vh]" />;
  if (!company || !allowed) {
    return (
      <Section title="Company">
        <p className="text-sm text-muted">This company is outside your authority.</p>
        <Link href="/companies" className="mt-3 inline-block text-sm font-medium text-navy">
          Back to companies
        </Link>
      </Section>
    );
  }

  const activeEmployees = employments.filter((employment) => !employment.effectiveTo);
  const schemeLabel =
    records.schemeId === "all"
      ? "All schemes in your authority"
      : (records.schemes.find((scheme) => scheme.id === records.schemeId)?.name ?? "Scheme");
  const manager = records.book.staff.find((person) => person.id === company.relationshipManagerId);
  const eligibleManagers = records.book.staff.filter(
    (person) =>
      person.active &&
      person.roles.includes("relationship_manager") &&
      (staff ? isManagement(staff) || person.leadId === staff.id : false),
  );
  const manageableSchemes = records.book.schemes.filter(
    (scheme) =>
      scheme.status === "open" &&
      !!staff &&
      canManageScheme(records.book, staff, scheme) &&
      !participations.some((row) => row.schemeId === scheme.id && row.status === "active"),
  );
  const posted = records.book.contributions.filter(
    (row) =>
      scopedMemberships.some((membership) => membership.id === row.membershipId) &&
      row.date.startsWith(month),
  );
  const postedValue = posted.filter((row) => row.amount > 0 && !row.reversalOf).reduce((sum, row) => sum + row.amount, 0);
  const exceptions = scopedMemberships
    .map((membership) => {
      const status = contributionMonthStatus(membership, records.book.contributions, month);
      if (status !== "missing" && status !== "partial") return null;
      const person = records.book.members.find((item) => item.id === membership.memberId);
      return person ? { membership, person, status } : null;
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
  const activity = records.book.audit.filter(
    (entry) =>
      entry.companyId === company.id ||
      (!entry.companyId &&
        (entry.newValue === company.name || entry.summary.includes(company.name))),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={company.name}
        description={`${company.reference} · ${schemeLabel}. Employment is not a pension membership.`}
        action={<StatusBadge label={company.status === "active" ? "Active" : "Inactive"} />}
      />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${tab === item ? "bg-navy text-white" : "border border-line bg-card text-navy"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <Section title="Employer">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Reference" value={company.reference} />
            <Fact label="Contact" value={company.contactName || "Not stated"} />
            <Fact label="Email" value={company.contactEmail || "Not stated"} />
            <Fact label="Mobile" value={company.contactMobile || "Not stated"} />
            <Fact label="Relationship manager" value={manager?.name ?? "Not assigned"} />
            <Fact label="Active employment" value={String(activeEmployees.length)} />
            <Fact label="Active employer memberships" value={String(employerMemberships.filter((membership) => membership.status === "active").length)} />
            <Fact
              label="Schemes"
              value={String(participations.filter((row) => row.status === "active").length)}
            />
          </dl>
          {canManage ? (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const value = String(form.get("manager") ?? "");
                records.setCompanyManager(company.id, value || null);
              }}
            >
              <label className="text-sm font-medium text-navy">
                Assign relationship manager
                <select name="manager" defaultValue={company.relationshipManagerId ?? ""} className={`${controlClass} mt-1`}>
                  <option value="">Not assigned</option>
                  {eligibleManagers.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="secondary">Save</Button>
            </form>
          ) : null}
        </Section>
      ) : null}

      {tab === "Schemes" ? (
        <Section
          title="Scheme participation"
          description="A company can participate in more than one scheme. Ending participation keeps the record and does not close memberships."
        >
          {participations.length === 0 ? (
            <p className="text-sm text-muted">This company is not on a scheme you can see.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {participations.map((row) => {
                const scheme = records.book.schemes.find((item) => item.id === row.schemeId);
                const enrolled = employerMemberships.filter(
                  (membership) => membership.schemeId === row.schemeId && membership.status === "active",
                ).length;
                const manageable = !!scheme && !!staff && canManageScheme(records.book, staff, scheme);
                return (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
                    <div>
                      <p className="font-medium text-navy">{scheme?.name}</p>
                      <p className="text-sm text-muted">
                        {row.status === "active" ? "Participating" : "Ended"} · from {formatDate(row.effectiveFrom)}
                        {row.effectiveTo ? ` to ${formatDate(row.effectiveTo)}` : ""} · {enrolled} enrolled
                      </p>
                    </div>
                    {manageable && row.status === "active" ? (
                      <Button variant="secondary" onClick={() => records.endCompanyScheme(row.id)}>
                        End participation
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {canManage && manageableSchemes.length > 0 ? (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const ok = records.assignCompanyToScheme({
                  companyId: company.id,
                  schemeId: String(form.get("schemeId") ?? ""),
                  effectiveFrom: String(form.get("from") ?? ""),
                });
                if (ok) event.currentTarget.reset();
              }}
            >
              <select name="schemeId" required className={controlClass}>
                <option value="">Scheme</option>
                {manageableSchemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                ))}
              </select>
              <input name="from" type="date" required className={controlClass} />
              <Button type="submit">Add scheme</Button>
            </form>
          ) : null}
        </Section>
      ) : null}

      {tab === "Employees" ? (
        <Section
          title="Employment"
          description="These are employment records. A personal membership stays on the person and is not closed when employment ends."
          action={
            canManage ? <Button onClick={() => setAddingEmployee(true)}>Add employee</Button> : null
          }
        >
          <input
            value={employeeQuery}
            onChange={(event) => setEmployeeQuery(event.target.value)}
            placeholder="Search employees"
            className={`${controlClass} mb-3 max-w-sm`}
          />
          {shownEmployees.length === 0 ? (
            <p className="text-sm text-muted">No employment records match.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {shownEmployees.map((employment) => {
                const person = records.book.members.find((item) => item.id === employment.memberId);
                const memberships = seenMemberships.filter((membership) => membership.memberId === employment.memberId);
                const waiting = participations.filter(
                  (row) =>
                    row.status === "active" &&
                    !memberships.some(
                      (membership) =>
                        membership.schemeId === row.schemeId &&
                        membership.companyId === company.id &&
                        membership.status === "active",
                    ),
                );
                return (
                  <li key={employment.id} className="rounded-lg border border-line px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/members/${employment.memberId}`} className="font-medium text-navy hover:underline">
                          {person ? memberName(person) : "Person"}
                        </Link>
                        <p className="text-sm text-muted">
                          {employment.effectiveTo ? "Employment ended" : "Employed"} · from {formatDate(employment.effectiveFrom)}
                          {employment.effectiveTo ? ` to ${formatDate(employment.effectiveTo)}` : ""}
                        </p>
                      </div>
                      {canManage && !employment.effectiveTo ? (
                        <Button variant="secondary" onClick={() => records.endEmployment(employment.id)}>
                          End employment
                        </Button>
                      ) : null}
                    </div>
                    <ul className="mt-2 text-sm text-navy">
                      {memberships.length === 0 ? <li>No membership in your authority.</li> : null}
                      {memberships.map((membership) => {
                        const scheme = records.book.schemes.find((item) => item.id === membership.schemeId);
                        return (
                          <li key={membership.id}>
                            {scheme?.name} · {membership.membershipNumber} · {membership.companyId === company.id ? "Employer" : "Separate membership"} · {membership.status}
                          </li>
                        );
                      })}
                    </ul>
                    {canManage && !employment.effectiveTo
                      ? waiting.map((row) => {
                          const scheme = records.book.schemes.find((item) => item.id === row.schemeId);
                          if (!scheme || !staff || !canManageScheme(records.book, staff, scheme)) return null;
                          const rms = records.book.staff.filter(
                            (person) =>
                              person.active &&
                              person.roles.includes("relationship_manager") &&
                              person.leadId === scheme.leadId &&
                              records.book.schemeAssignments.some(
                                (assignment) =>
                                  assignment.schemeId === scheme.id &&
                                  assignment.relationshipManagerId === person.id,
                              ),
                          );
                          return (
                            <form
                              key={row.id}
                              className="mt-3 flex flex-wrap items-end gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const form = new FormData(event.currentTarget);
                                records.confirmEnrolment({
                                  memberId: employment.memberId,
                                  schemeId: scheme.id,
                                  companyId: company.id,
                                  relationshipManagerId: String(form.get("rm") ?? ""),
                                  monthlyContribution: Number(form.get("amount") ?? 0),
                                  retirementAge: Number(form.get("age") ?? 60),
                                  targetPot: Number(form.get("target") ?? 0),
                                });
                              }}
                            >
                              <p className="w-full text-sm text-muted">Not enrolled on {scheme.name}.</p>
                              <select name="rm" required className={controlClass}>
                                <option value="">Relationship manager</option>
                                {rms.map((person) => (
                                  <option key={person.id} value={person.id}>{person.name}</option>
                                ))}
                              </select>
                              <input name="amount" type="number" required placeholder="Monthly" className={controlClass} />
                              <input name="age" type="number" required placeholder="Retirement age" className={controlClass} />
                              <input name="target" type="number" required placeholder="Target pot" className={controlClass} />
                              <Button type="submit" variant="secondary">Confirm membership</Button>
                            </form>
                          );
                        })
                      : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      ) : null}

      {tab === "Contributions" ? (
        <Section
          title="Contributions"
          description={`Posted to employer memberships in ${schemeLabel} for ${month}. An unmatched receipt is not tied to a company until it is posted to a membership.`}
        >
          <label className="mb-3 block text-sm font-medium text-navy">
            Month
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={`${controlClass} mt-1 max-w-xs`} />
          </label>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact label="Posted value" value={ghs(postedValue)} />
            <Fact label="Posted transactions" value={String(posted.filter((row) => row.amount > 0 && !row.reversalOf).length)} />
            <Fact label="Missing or partial" value={String(exceptions.length)} />
          </dl>
          {exceptions.length > 0 ? (
            <ul className="mt-4 text-sm">
              {exceptions.map((row) => (
                <li key={row.membership.id}>
                  {memberName(row.person)} · {row.membership.membershipNumber} · {row.status === "missing" ? "Missing" : "Partial"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No missing or partial employer contributions in this month.</p>
          )}
        </Section>
      ) : null}

      {tab === "Activity" ? (
        <Section title="Activity">
          {activity.length === 0 ? (
            <p className="text-sm text-muted">No recorded changes for this company.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {activity.slice(0, 30).map((entry) => (
                <li key={entry.id}>{formatDate(entry.at)} · {entry.summary}</li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <Modal open={addingEmployee} title="Add employee" onClose={() => setAddingEmployee(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (saving.current) return;
            const form = new FormData(event.currentTarget);
            saving.current = true;
            const ok = records.linkEmployment({
              memberId: String(form.get("memberId") ?? ""),
              companyId: company.id,
              effectiveFrom: String(form.get("from") ?? ""),
            });
            saving.current = false;
            if (ok) setAddingEmployee(false);
          }}
        >
          <p className="text-sm text-muted">
            Choose a person already on file. This records employment at {company.name} and does not open a membership.
          </p>
          <label className="text-sm font-medium text-navy">
            Find a person
            <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} className={`${controlClass} mt-1`} />
          </label>
          <label className="text-sm font-medium text-navy">
            Person
            <select name="memberId" required className={`${controlClass} mt-1`}>
              <option value="">Choose a person</option>
              {people.map((member) => (
                <option key={member.id} value={member.id}>{memberName(member)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-navy">
            Start date
            <input name="from" type="date" required className={`${controlClass} mt-1`} />
          </label>
          <Button type="submit">Save employment</Button>
        </form>
      </Modal>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}
