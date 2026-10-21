"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Building2 } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { companiesForStaff, isManagement, isTeamLead } from "@/lib/domain";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 12;

export function CompaniesBoard() {
  const records = useRecords();
  const saving = useRef(false);
  const [query, setQuery] = useState("");
  const [participation, setParticipation] = useState("all");
  const [manager, setManager] = useState("all");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; reference?: string; contactEmail?: string }>({});

  const staff = records.staff;
  const authorized = useMemo(
    () => (staff ? companiesForStaff(records.book, staff) : []),
    [records.book, staff],
  );
  const schemeLabel =
    records.schemeId === "all"
      ? "All schemes in your authority"
      : (records.schemes.find((scheme) => scheme.id === records.schemeId)?.name ?? "Scheme");

  const inScheme = useMemo(() => {
    if (records.schemeId === "all") return authorized;
    return authorized.filter((company) =>
      records.book.companySchemes.some(
        (row) =>
          row.companyId === company.id &&
          row.schemeId === records.schemeId &&
          row.status === "active",
      ),
    );
  }, [authorized, records.book.companySchemes, records.schemeId]);

  const participatingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const company of inScheme) {
      const active = records.book.companySchemes.some(
        (row) =>
          row.companyId === company.id &&
          row.status === "active" &&
          records.schemes.some((scheme) => scheme.id === row.schemeId) &&
          (records.schemeId === "all" || row.schemeId === records.schemeId),
      );
      if (active) ids.add(company.id);
    }
    return ids;
  }, [inScheme, records.book.companySchemes, records.schemeId, records.schemes]);

  const employeeIds = useMemo(() => {
    const companies = new Set(inScheme.map((company) => company.id));
    return new Set(
      records.book.employments
        .filter((employment) => companies.has(employment.companyId) && !employment.effectiveTo)
        .map((employment) => employment.memberId),
    );
  }, [inScheme, records.book.employments]);

  const membershipCount = useMemo(() => {
    const companies = new Set(inScheme.map((company) => company.id));
    return records.memberships.filter(
      (membership) =>
        membership.status === "active" &&
        !!membership.companyId &&
        companies.has(membership.companyId),
    ).length;
  }, [inScheme, records.memberships]);

  const managers = records.book.staff.filter(
    (person) => person.active && person.roles.includes("relationship_manager"),
  );
  const showManagerFilter = !!staff && (isManagement(staff) || isTeamLead(staff));

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inScheme.filter((company) => {
      if (needle && !`${company.name} ${company.reference}`.toLowerCase().includes(needle)) return false;
      const participating = participatingIds.has(company.id);
      if (participation === "participating" && !participating) return false;
      if (participation === "not_participating" && participating) return false;
      if (participation === "inactive" && company.status !== "inactive") return false;
      if (manager !== "all" && (company.relationshipManagerId ?? "") !== manager) return false;
      return true;
    });
  }, [inScheme, manager, participation, participatingIds, query]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtersOn = query !== "" || participation !== "all" || manager !== "all";

  function clearFilters() {
    setQuery("");
    setParticipation("all");
    setManager("all");
    setPage(1);
  }

  function schemeNames(companyId: string) {
    return records.book.companySchemes
      .filter(
        (row) =>
          row.companyId === companyId &&
          row.status === "active" &&
          records.schemes.some((scheme) => scheme.id === row.schemeId),
      )
      .map((row) => records.book.schemes.find((scheme) => scheme.id === row.schemeId)?.name ?? "Scheme");
  }

  function enrolledCount(companyId: string) {
    const employed = new Set(
      records.book.employments
        .filter((employment) => employment.companyId === companyId && !employment.effectiveTo)
        .map((employment) => employment.memberId),
    );
    return records.book.memberships.filter(
      (membership) =>
        membership.companyId === companyId &&
        membership.status === "active" &&
        employed.has(membership.memberId) &&
        records.schemes.some((scheme) => scheme.id === membership.schemeId),
    ).length;
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description={`Manage employers, scheme participation, and employee memberships. Scope: ${schemeLabel}.`}
        action={
          records.canManageSchemes ? <Button onClick={() => setAdding(true)}>Add company</Button> : null
        }
      />
      <div className={`mb-4 grid gap-4 sm:grid-cols-2 ${records.schemeId === "all" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <StatCard label="Companies" value={String(inScheme.length)} hint="Counted once, even on several schemes" />
        {records.schemeId === "all" ? (
          <StatCard label="Participating" value={String(participatingIds.size)} hint="At least one active scheme" />
        ) : null}
        <StatCard label="Employees" value={String(employeeIds.size)} hint="People with an active employment" />
        <StatCard label="Active memberships" value={String(membershipCount)} hint="Employer memberships in this scope" />
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-sm font-medium text-navy">
          Search
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Name or reference"
            className={controlClass}
          />
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-48">
          Participation
          <select
            value={participation}
            onChange={(event) => {
              setParticipation(event.target.value);
              setPage(1);
            }}
            className={controlClass}
          >
            <option value="all">All companies</option>
            <option value="participating">Participating</option>
            <option value="not_participating">Not participating</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        {showManagerFilter ? (
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-56">
            Relationship manager
            <select
              value={manager}
              onChange={(event) => {
                setManager(event.target.value);
                setPage(1);
              }}
              className={controlClass}
            >
              <option value="all">All managers</option>
              <option value="">Not assigned</option>
              {managers.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {!records.ready ? <div className="min-h-[40vh]" /> : null}
      {records.ready && inScheme.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies"
          description={
            records.schemeId === "all"
              ? "Add a company, then assign it to a scheme before enrolling anyone."
              : `No company in your authority participates in ${schemeLabel}.`
          }
          action={
            records.canManageSchemes && records.schemeId === "all" ? (
              <Button onClick={() => setAdding(true)}>Add company</Button>
            ) : undefined
          }
        />
      ) : null}
      {records.ready && inScheme.length > 0 && rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies match"
          description="Change the search or filters to see employers in this scope."
          action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : null}
      {rows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={[
                { key: "name", header: "Company" },
                { key: "reference", header: "Reference" },
                { key: "status", header: "Status" },
                { key: "schemes", header: "Schemes" },
                { key: "enrolled", header: "Enrolled" },
                { key: "manager", header: "Relationship manager" },
                { key: "updated", header: "Updated" },
                { key: "action", header: "Actions" },
              ]}
              rows={visible.map((company) => {
                const names = schemeNames(company.id);
                return {
                  id: company.id,
                  cells: {
                    name: <span className="font-medium text-navy">{company.name}</span>,
                    reference: company.reference,
                    status: (
                      <StatusBadge
                        label={
                          company.status === "inactive"
                            ? "Inactive"
                            : participatingIds.has(company.id)
                              ? "Participating"
                              : "Not participating"
                        }
                      />
                    ),
                    schemes: names.length === 0 ? "—" : names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", "),
                    enrolled: String(enrolledCount(company.id)),
                    manager:
                      records.book.staff.find((person) => person.id === company.relationshipManagerId)?.name ??
                      "Not assigned",
                    updated: company.updatedAt ? formatDate(company.updatedAt) : "—",
                    action: (
                      <Link href={`/companies/${company.id}`} className="font-medium text-navy hover:underline">
                        View details
                      </Link>
                    ),
                  },
                };
              })}
            />
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((company) => (
              <li key={company.id} className="rounded-[12px] border border-line bg-card px-4 py-3">
                <p className="font-medium text-navy">{company.name}</p>
                <p className="text-xs text-muted">{company.reference}</p>
                <p className="mt-2 text-sm text-muted">
                  {schemeNames(company.id).join(", ") || "No scheme"} · {enrolledCount(company.id)} enrolled
                </p>
                <Link href={`/companies/${company.id}`} className="mt-2 inline-block text-sm font-medium text-navy">
                  View details
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </>
      ) : null}

      <Modal open={adding} title="Add company" onClose={() => setAdding(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (saving.current) return;
            const form = new FormData(event.currentTarget);
            const name = String(form.get("name") ?? "").trim();
            const reference = String(form.get("reference") ?? "").trim();
            const contactEmail = String(form.get("contactEmail") ?? "").trim();
            const nextErrors: typeof errors = {};
            if (!name) nextErrors.name = "Enter the company name.";
            if (!reference) nextErrors.reference = "Enter a company reference.";
            else if (
              records.book.companies.some((company) => company.reference.toLowerCase() === reference.toLowerCase())
            ) {
              nextErrors.reference = "That company reference is already in use.";
            }
            if (contactEmail && !contactEmail.includes("@")) nextErrors.contactEmail = "Enter a valid contact email.";
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length > 0) return;
            saving.current = true;
            const ok = records.addCompany({
              name,
              reference,
              contactName: String(form.get("contactName") ?? ""),
              contactEmail,
              contactMobile: String(form.get("contactMobile") ?? ""),
            });
            saving.current = false;
            if (ok) {
              setAdding(false);
              setErrors({});
            }
          }}
        >
          <Field label="Company name" name="name" error={errors.name} />
          <Field label="Reference" name="reference" error={errors.reference} />
          <Field label="Contact name" name="contactName" />
          <Field label="Contact email" name="contactEmail" type="email" error={errors.contactEmail} />
          <Field label="Contact mobile" name="contactMobile" />
          <p className="text-sm text-muted">Adding a company does not enrol anyone.</p>
          <Button type="submit">Add company</Button>
        </form>
      </Modal>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="text-sm font-medium text-navy">
      {label}
      <input name={name} type={type} className={`${controlClass} mt-1`} />
      {error ? <span className="mt-1 block text-xs font-normal text-danger">{error}</span> : null}
    </label>
  );
}
