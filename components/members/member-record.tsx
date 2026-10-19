"use client";

import Link from "next/link";
import { LifeBuoy, UserRound, Users } from "lucide-react";
import { useEffect } from "react";

import { StatementActions } from "@/components/members/statement-actions";
import { useRecords } from "@/components/records/records-provider";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { fundById, memberBalance, splitTotal, type MoneySplit } from "@/lib/demo";
import { ghs } from "@/lib/format";

export function MemberRecord({ id }: { id: string }) {
  const { allMembers, allRequests, openDialog } = useRecords();
  const member = allMembers.find((item) => item.id === id);

  useEffect(() => {
    if (!member) return;
    document.title = `${member.name} · United Pension Trustees`;
  }, [member]);

  if (!member) {
    return (
      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <EmptyState
          icon={Users}
          title="Unitholder record not found"
          description="The reference does not match a unitholder on file."
          action={
            <Link href="/members" className={buttonClass()}>
              Back to members
            </Link>
          }
        />
      </section>
    );
  }

  const scheme = fundById(member.fundId);
  const memberRequests = allRequests.filter(
    (request) => request.memberId === member.id,
  );
  const { statement } = member;
  const rows: { label: string; split: MoneySplit }[] = [
    { label: "Contribution", split: statement.contribution },
    { label: "Gain/Loss", split: statement.gainLoss },
    { label: "Cumulative outflow", split: statement.outflow },
  ];

  return (
    <div>
      <p className="print-hide text-sm text-muted">
        <Link href="/members" className="font-medium text-navy hover:underline">
          Members
        </Link>
        <span className="px-2">/</span>
        {member.ref}
      </p>
      <div className="print-hide mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-navy">
            {member.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {scheme.name} · joined {member.joined}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-xs text-muted">
            Current balance as at {statement.asAt}
          </span>
          <span className="text-2xl font-medium tracking-tight text-navy tabular-nums">
            {ghs(memberBalance(member))}
          </span>
        </p>
      </div>

      <div className="print-hide mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-medium text-navy">Personal information</h2>
          <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-3 text-sm">
            <Field label="Name" value={member.name} />
            <Field label="Date of birth" value={member.dateOfBirth} />
            <Field label="SSNIT" value={member.ssnit} />
            <Field label="Email" value={member.email} />
            <Field label="Phone" value={member.phone} />
            <Field label="Nationality" value={member.nationality} />
            <Field label="Gender" value={member.gender} />
            <Field label="Marital status" value={member.maritalStatus} />
            <Field label="Address" value={member.address} />
          </dl>
        </section>
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-medium text-navy">Sponsor</h2>
          <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-3 text-sm">
            <Field label="Ref" value={member.sponsorRef} />
            <Field label="Name" value={member.sponsorName} />
            <Field label="Address" value={member.sponsorAddress} />
          </dl>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-navy">Beneficiaries</h2>
          </div>
          {member.beneficiaries.length === 0 ? (
            <EmptyState
              compact
              icon={UserRound}
              title="No beneficiaries on file"
              description="Add the people who should receive this unitholder's benefit."
              action={
                <button
                  type="button"
                  className={buttonClass()}
                  onClick={() => openDialog("beneficiary", member.id)}
                >
                  Add beneficiary
                </button>
              }
            />
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {member.beneficiaries.map((beneficiary) => (
                <li
                  key={beneficiary.name}
                  className="flex items-center justify-between rounded-md bg-[#F8F9FB] px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-navy">
                      {beneficiary.name}
                    </span>
                    <span className="text-muted">
                      {" "}
                      · {beneficiary.relationship}
                    </span>
                  </span>
                  <span className="tabular-nums text-navy">
                    {beneficiary.share}
                  </span>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="cursor-pointer text-sm font-medium text-navy hover:underline"
                  onClick={() => openDialog("beneficiary", member.id)}
                >
                  Add beneficiary
                </button>
              </li>
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-card print:mt-0 print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="hidden text-xs font-medium tracking-wide text-muted uppercase print:block">
              United Pension Trustees
            </p>
            <h2 className="text-sm font-medium text-navy print:mt-2 print:text-lg">
              {member.name}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {member.ref} · {scheme.name} · statement as at {statement.asAt}
            </p>
          </div>
          <div className="print-hide flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => openDialog("memberContribution", member.id)}
            >
              Record contribution
            </Button>
            <StatementActions member={member} fundName={scheme.name} />
          </div>
        </header>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-5 py-3 font-medium"> </th>
              <th className="px-4 py-3 text-right font-medium">Employee</th>
              <th className="px-4 py-3 text-right font-medium">Employer</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line">
                <th className="px-5 py-3 text-left font-medium text-navy">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-right tabular-nums">
                  {ghs(row.split.employee)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {ghs(row.split.employer)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {ghs(splitTotal(row.split))}
                </td>
              </tr>
            ))}
            <tr>
              <th className="px-5 py-3 text-left font-medium text-navy">
                Current balance
              </th>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-5 py-3 text-right font-medium text-navy tabular-nums">
                {ghs(memberBalance(member))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="print-hide mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium text-navy">Requests</h2>
        </header>
        {memberRequests.length === 0 ? (
          <EmptyState
            compact
            icon={LifeBuoy}
            title="No requests for this unitholder"
            description="Log an enquiry, withdrawal or claim against this record."
            action={
              <button
                type="button"
                className={buttonClass()}
                onClick={() => openDialog("request", member.id)}
              >
                Log request
              </button>
            }
          />
        ) : (
          <ul>
            {memberRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-navy">
                    {request.subject}
                  </p>
                  <p className="text-xs text-muted">
                    {request.id} · {request.channel} · {request.opened}
                  </p>
                </div>
                <StatusBadge label={request.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </>
  );
}
