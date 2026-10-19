"use client";

import Link from "next/link";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { memberBalance } from "@/lib/demo";
import { ghs } from "@/lib/format";

export function MemberDirectory() {
  const { members, fund, openDialog } = useRecords();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;

    return members.filter((member) =>
      `${member.name} ${member.ref} ${member.sponsorName} ${member.ssnit}`
        .toLowerCase()
        .includes(needle),
    );
  }, [members, query]);

  return (
    <div>
      <PageHeader
        title="Members"
        description={`Unitholders on ${fund.name}. Open a record for personal details, the sponsor, beneficiaries and the statement.`}
        action={
          <Button onClick={() => openDialog("member")}>Register member</Button>
        }
      />
      {members.length === 0 ? (
        <section className="overflow-hidden rounded-xl border border-line bg-card">
          <EmptyState
            icon={Users}
            title={`No unitholders on ${fund.name}`}
            description="Register a unitholder to open their record, beneficiaries and statement."
            action={
              <Button onClick={() => openDialog("member")}>
                Register member
              </Button>
            }
          />
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex max-w-sm flex-col gap-1.5 text-sm font-medium text-navy">
            Search unitholders
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, reference, sponsor or SSNIT"
              className={controlClass}
            />
          </label>
          {filtered.length === 0 ? (
            <section className="overflow-hidden rounded-xl border border-line bg-card">
              <EmptyState
                icon={Search}
                title="No matching unitholders"
                description="Try another name, reference, sponsor or SSNIT number."
                action={
                  <Button onClick={() => setQuery("")}>Clear search</Button>
                }
              />
            </section>
          ) : (
            <DataTable
              columns={[
                { key: "name", header: "Member" },
                { key: "ref", header: "Ref" },
                { key: "sponsor", header: "Sponsor" },
                { key: "balance", header: "Balance", className: "text-right" },
              ]}
              rows={filtered.map((member) => ({
                id: member.id,
                cells: {
                  name: (
                    <Link
                      href={`/members/${member.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {member.name}
                    </Link>
                  ),
                  ref: <span className="tabular-nums">{member.ref}</span>,
                  sponsor: member.sponsorName,
                  balance: (
                    <span className="tabular-nums">
                      {ghs(memberBalance(member))}
                    </span>
                  ),
                },
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
