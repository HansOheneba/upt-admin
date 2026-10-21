"use client";

import Link from "next/link";
import { useState } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { companiesForStaff, memberName } from "@/lib/domain";
import { formatDate, ghs } from "@/lib/format";
import { currentMonth, currentUnitPrice, periodFigures, pricesForScheme, schemeValue } from "@/lib/pension";

const TABS = [
  "Overview",
  "Companies",
  "Relationship managers",
  "Members",
  "Contributions",
  "Withdrawals",
  "Pricing",
  "Activity",
] as const;

export function SchemeWorkspace({ id }: { id: string }) {
  const records = useRecords();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const scheme = records.book.schemes.find((item) => item.id === id);
  if (!records.ready) return <div className="min-h-[50vh]" />;
  if (!scheme || !records.schemes.some((item) => item.id === scheme.id)) {
    return (
      <Section title="Scheme">
        <p className="text-sm text-muted">This scheme is outside your authority.</p>
        <Link href="/schemes" className="mt-3 inline-block text-sm font-medium text-navy">Back to schemes</Link>
      </Section>
    );
  }

  const memberships = records.book.memberships.filter((membership) => membership.schemeId === scheme.id);
  const managers = records.book.schemeAssignments.filter((row) => row.schemeId === scheme.id);
  const companies = records.book.companySchemes.filter((row) => row.schemeId === scheme.id && row.status === "active");
  const eligibleManagers = records.book.staff.filter(
    (person) =>
      person.active &&
      person.roles.includes("relationship_manager") &&
      person.leadId === scheme.leadId,
  );
  const canEdit = records.canManageSchemes && (records.staff?.roles.includes("management") || scheme.leadId === records.staff?.id);
  const worth = schemeValue(records.book, memberships);
  const price = currentUnitPrice(pricesForScheme(records.book, scheme.id));
  const figures = periodFigures(records.book, memberships, currentMonth());

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={scheme.name}
        description={`${scheme.code} · ${records.book.staff.find((person) => person.id === scheme.leadId)?.name ?? "No team lead"}`}
        action={<StatusBadge label={scheme.status === "open" ? "Open" : "Closed"} />}
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
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => records.updateScheme(scheme.id, { status: scheme.status === "open" ? "closed" : "open" })}
          >
            {scheme.status === "open" ? "Close scheme" : "Reopen scheme"}
          </Button>
        </div>
      ) : null}

      {tab === "Overview" ? (
        <Section title="Position" description="This month. Each membership uses this scheme's unit price.">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Memberships" value={String(memberships.length)} />
            <Fact label="Companies" value={String(companies.length)} />
            <Fact label="Relationship managers" value={String(managers.length)} />
            <Fact label="Contributions this month" value={ghs(figures.contributions)} />
            <Fact label="Distributions this month" value={ghs(figures.distributions)} />
            <Fact label="Average per payment" value={figures.averagePayment === null ? "—" : ghs(figures.averagePayment)} />
            <Fact label="Average per contributing member" value={figures.averageMember === null ? "—" : ghs(figures.averageMember)} />
            <Fact label="Pension value" value={worth.total === null ? "Unavailable" : ghs(worth.total)} />
            <Fact
              label="Unit price"
              value={price ? `${price.price.toFixed(3)} from ${formatDate(price.date)}` : "Not set"}
            />
          </dl>
        </Section>
      ) : null}

      {tab === "Companies" ? (
        <Section title="Participating companies">
          {companies.length === 0 ? <p className="text-sm text-muted">No company is assigned.</p> : (
            <ul className="flex flex-col gap-4">
              {companies.map((assignment) => {
                const company = records.book.companies.find((item) => item.id === assignment.companyId);
                const waiting = records.book.employments.filter((employment) => {
                  if (employment.companyId !== assignment.companyId || employment.effectiveTo) return false;
                  return !memberships.some(
                    (membership) =>
                      membership.memberId === employment.memberId &&
                      membership.companyId === assignment.companyId &&
                      membership.status === "active",
                  );
                });
                return (
                  <li key={assignment.id} className="rounded-lg border border-line p-4">
                    <p className="font-medium text-navy">{company?.name} · {company?.reference}</p>
                    <p className="mt-1 text-sm text-muted">From {formatDate(assignment.effectiveFrom)}</p>
                    {waiting.length === 0 ? (
                      <p className="mt-3 text-sm text-muted">No employee is waiting for an enrolment decision.</p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-3">
                        {waiting.map((employment) => {
                          const person = records.book.members.find((item) => item.id === employment.memberId);
                          if (!person) return null;
                          return (
                            <li key={employment.id}>
                              <p className="text-sm font-medium text-navy">{memberName(person)} needs an eligibility decision.</p>
                              {canEdit ? (
                                <form
                                  className="mt-2 flex flex-wrap items-end gap-2"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    const form = new FormData(event.currentTarget);
                                    records.confirmEnrolment({
                                      memberId: person.id,
                                      schemeId: scheme.id,
                                      companyId: assignment.companyId,
                                      relationshipManagerId: String(form.get("rm") ?? ""),
                                      monthlyContribution: Number(form.get("amount") ?? 0),
                                      retirementAge: Number(form.get("age") ?? 60),
                                      targetPot: Number(form.get("target") ?? 0),
                                    });
                                  }}
                                >
                                  <select name="rm" required className={controlClass}>
                                    <option value="">Relationship manager</option>
                                    {eligibleManagers
                                      .filter((person) => managers.some((row) => row.relationshipManagerId === person.id))
                                      .map((person) => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                      ))}
                                  </select>
                                  <input name="amount" type="number" required placeholder="Monthly" className={controlClass} />
                                  <input name="age" type="number" required placeholder="Retirement age" className={controlClass} />
                                  <input name="target" type="number" required placeholder="Target pot" className={controlClass} />
                                  <Button type="submit">Confirm membership</Button>
                                </form>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit ? (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const ok = records.assignCompanyToScheme({
                  companyId: String(form.get("companyId") ?? ""),
                  schemeId: scheme.id,
                  effectiveFrom: String(form.get("from") ?? ""),
                });
                if (ok) event.currentTarget.reset();
              }}
            >
              <select name="companyId" required className={controlClass}>
                <option value="">Company</option>
                {(records.staff ? companiesForStaff(records.book, records.staff) : []).map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <input name="from" type="date" required className={controlClass} />
              <Button type="submit">Assign company</Button>
            </form>
          ) : null}
        </Section>
      ) : null}

      {tab === "Relationship managers" ? (
        <Section title="Assigned relationship managers" description="Only relationship managers who report to this scheme's team lead can be assigned.">
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              records.setSchemeManagers(scheme.id, form.getAll("rm").map(String));
            }}
          >
            {eligibleManagers.length === 0 ? (
              <p className="text-sm text-muted">No relationship manager reports to this team lead yet.</p>
            ) : (
              eligibleManagers.map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm text-navy">
                  <input
                    type="checkbox"
                    name="rm"
                    value={person.id}
                    defaultChecked={managers.some((row) => row.relationshipManagerId === person.id)}
                    disabled={!canEdit}
                  />
                  {person.name}
                  <span className="text-muted">
                    {records.book.schemeAssignments.filter((row) => row.relationshipManagerId === person.id).length} schemes
                    · {records.book.memberships.filter((membership) => membership.relationshipManagerId === person.id).length} memberships
                  </span>
                </label>
              ))
            )}
            {canEdit && eligibleManagers.length > 0 ? <Button type="submit" className="mt-2 w-fit">Save assignments</Button> : null}
          </form>
        </Section>
      ) : null}

      {tab === "Members" ? (
        <Section title="Memberships">
          <ul className="divide-y divide-line">
            {memberships.map((membership) => {
              const person = records.book.members.find((item) => item.id === membership.memberId);
              return (
                <li key={membership.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <Link href={`/members/${membership.memberId}`} className="font-medium text-navy hover:underline">
                    {person ? memberName(person) : "Member"}
                    <span className="block text-xs font-normal text-muted">{membership.membershipNumber}</span>
                  </Link>
                  <StatusBadge label={membership.status === "active" ? "Active" : "Closed"} />
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {tab === "Contributions" ? (
        <Section title="Contributions this month">
          <p className="text-sm text-navy">{ghs(figures.contributions)} net this month.</p>
          <Link href="/contributions" className="mt-3 inline-block text-sm font-medium text-navy">Open contributions</Link>
        </Section>
      ) : null}

      {tab === "Withdrawals" ? (
        <Section title="Withdrawals">
          <p className="text-sm text-navy">
            {records.book.withdrawals.filter((row) => memberships.some((membership) => membership.id === row.membershipId) && row.status !== "paid" && row.status !== "declined").length} still moving.
          </p>
          <Link href="/withdrawals" className="mt-3 inline-block text-sm font-medium text-navy">Open withdrawals</Link>
        </Section>
      ) : null}

      {tab === "Pricing" ? (
        <Section title="Unit price">
          <p className="text-sm text-navy">{price ? `${price.price.toFixed(3)} from ${formatDate(price.date)}` : "No price is set."}</p>
          <Link href="/unit-price" className="mt-3 inline-block text-sm font-medium text-navy">Open fund settings</Link>
        </Section>
      ) : null}

      {tab === "Activity" ? (
        <Section title="Activity">
          <ul className="flex flex-col gap-2 text-sm">
            {records.book.audit.filter((entry) => entry.schemeId === scheme.id).slice(0, 20).map((entry) => (
              <li key={entry.id}>{formatDate(entry.at)} · {entry.summary}</li>
            ))}
          </ul>
        </Section>
      ) : null}
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
