"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";

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
import { formatDate } from "@/lib/format";
import { isManagement } from "@/lib/domain";

export function SchemesBoard() {
  const records = useRecords();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [lead, setLead] = useState("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const leads = records.book.staff.filter((person) => person.active && person.roles.includes("team_lead"));

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.schemes.filter((scheme) => {
      if (needle && !`${scheme.name} ${scheme.code}`.toLowerCase().includes(needle)) return false;
      if (status !== "all" && scheme.status !== status) return false;
      if (lead !== "all" && scheme.leadId !== lead) return false;
      return true;
    });
  }, [lead, query, records.schemes, status]);

  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const companies = new Set(
    records.book.companySchemes
      .filter((row) => row.status === "active" && records.schemes.some((scheme) => scheme.id === row.schemeId))
      .map((row) => row.companyId),
  );

  return (
    <div>
      <PageHeader
        title="Schemes"
        description="Manage pension schemes, participating companies, and assigned relationship managers."
        action={
          records.canManageSchemes ? <Button onClick={() => setCreating(true)}>Create scheme</Button> : null
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Schemes" value={String(records.schemes.length)} />
        <StatCard
          label="Open schemes"
          value={String(records.schemes.filter((scheme) => scheme.status === "open").length)}
        />
        <StatCard label="Participating companies" value={String(companies.size)} />
        <StatCard label="Memberships" value={String(records.memberships.length)} />
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-sm font-medium text-navy">
          Search
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Name or code" className={controlClass} />
        </label>
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-40">
          Status
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={controlClass}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        {records.staff && isManagement(records.staff) ? (
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-navy sm:w-52">
            Team lead
            <select value={lead} onChange={(event) => { setLead(event.target.value); setPage(1); }} className={controlClass}>
              <option value="all">All leads</option>
              {leads.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {records.schemes.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No schemes"
          description="Create a scheme and assign the relationship managers who report to you."
          action={records.canManageSchemes ? <Button onClick={() => setCreating(true)}>Create scheme</Button> : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={[
              { key: "name", header: "Scheme" },
              { key: "status", header: "Status" },
              { key: "lead", header: "Team lead" },
              { key: "rms", header: "RMs" },
              { key: "companies", header: "Companies" },
              { key: "members", header: "Members" },
              { key: "updated", header: "Updated" },
              { key: "action", header: "Actions" },
            ]}
            rows={visible.map((scheme) => ({
              id: scheme.id,
              cells: {
                name: (
                  <span>
                    <span className="font-medium text-navy">{scheme.name}</span>
                    <span className="block text-xs text-muted">{scheme.code}</span>
                  </span>
                ),
                status: <StatusBadge label={scheme.status === "open" ? "Open" : "Closed"} />,
                lead: records.book.staff.find((person) => person.id === scheme.leadId)?.name ?? "Unassigned",
                rms: String(records.book.schemeAssignments.filter((row) => row.schemeId === scheme.id).length),
                companies: String(
                  records.book.companySchemes.filter((row) => row.schemeId === scheme.id && row.status === "active").length,
                ),
                members: String(records.book.memberships.filter((row) => row.schemeId === scheme.id).length),
                updated: formatDate(scheme.updatedAt),
                action: (
                  <Link href={`/schemes/${scheme.id}`} className="font-medium text-navy hover:underline">
                    Open
                  </Link>
                ),
              },
            }))}
          />
          <Pagination page={page} pages={pages} onPage={setPage} />
        </>
      )}
      <Modal open={creating} title="Create scheme" onClose={() => setCreating(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ok = records.createScheme({
              name: String(form.get("name") ?? ""),
              code: String(form.get("code") ?? ""),
              leadId: String(form.get("leadId") ?? ""),
            });
            if (ok) setCreating(false);
          }}
        >
          <label className="text-sm font-medium text-navy">
            Scheme name
            <input name="name" required className={`${controlClass} mt-1`} />
          </label>
          <label className="text-sm font-medium text-navy">
            Scheme code
            <input name="code" required placeholder="MOP" className={`${controlClass} mt-1`} />
          </label>
          {records.staff && isManagement(records.staff) ? (
            <label className="text-sm font-medium text-navy">
              Owning team lead
              <select name="leadId" required className={`${controlClass} mt-1`}>
                <option value="">Choose a team lead</option>
                {leads.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <Button type="submit">Create scheme</Button>
        </form>
      </Modal>
    </div>
  );
}
