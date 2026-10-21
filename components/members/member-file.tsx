"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useRecords } from "@/components/records/records-provider";
import { StatementActions } from "@/components/members/statement-actions";
import { Button, buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabList } from "@/components/ui/tabs";
import {
  DOCUMENT_TAGS,
  REQUEST_CHANNEL_LABEL,
  WITHDRAWAL_LABEL,
  memberName,
  type DocumentTag,
  type Member,
} from "@/lib/domain";
import { daysSince, formatDate, formatDateTime, formatUnits, ghs, todayIso } from "@/lib/format";
import {
  cashFlowSummary,
  channelLabel,
  contributionMonthStatus,
  currentMonth,
  destinationLabel,
  insuranceFlag,
  personHoldings,
} from "@/lib/pension";

export function MemberFile({ id }: { id: string }) {
  const records = useRecords();
  const member = records.members.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  if (!records.ready) {
    return <div className="min-h-[50vh]" />;
  }

  if (!member) {
    return (
      <Section title="Member">
        <p className="text-sm text-muted">This member is not on your list.</p>
        <Link href="/members" className="mt-3 inline-block text-sm font-medium text-navy">
          Back to members
        </Link>
      </Section>
    );
  }

  const visibleIds = new Set(records.memberships.map((membership) => membership.id));
  const holdings = personHoldings(records.book, member.id).rows.filter((row) =>
    visibleIds.has(row.membership.id),
  );
  const combinedPot = holdings
    .map((row) => row.position.pot)
    .filter((pot): pot is number => pot !== null);
  const combined =
    combinedPot.length === 0
      ? null
      : Math.round(combinedPot.reduce((sum, pot) => sum + pot, 0) * 100) / 100;
  const schemeName = (schemeId: string) =>
    records.book.schemes.find((scheme) => scheme.id === schemeId)?.name ?? "Scheme";
  const maintain = records.canMaintain(member.id);
  const attention = holdings.flatMap((row) => {
    const status = contributionMonthStatus(row.membership, records.book.contributions, currentMonth());
    return status === "missing" || status === "partial" ? [{ row, status }] : [];
  });
  const openWithdrawals = holdings.flatMap((row) =>
    row.position.openWithdrawal ? [row.position.openWithdrawal] : [],
  );
  const staffName = (staffId: string | null) =>
    records.book.staff.find((person) => person.id === staffId)?.name ?? "Staff";
  const openRequests = records.book.requests.filter(
    (row) => row.memberId === member.id && row.status === "open",
  ).length;
  const policies = records.book.insurance.filter((row) => row.memberId === member.id);
  const flags = policies
    .map((row) => ({ row, flag: insuranceFlag(row.renewalDate, row.active) }))
    .filter((item) => item.flag);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-tight font-semibold break-words text-navy sm:text-[28px]">{memberName(member)}</h1>
          <p className="mt-1 text-sm break-words text-muted">
            {holdings.length === 0
              ? "No membership in this view"
              : holdings
                  .map(
                    (row) =>
                      `${row.membership.membershipNumber} · ${schemeName(row.membership.schemeId)}`,
                  )
                  .join("  ·  ")}
          </p>
          <div className="mt-2">
            <StatusBadge
              label={holdings.some((row) => row.membership.status === "active") ? "Active" : "Closed"}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {maintain ? (
            <Button onClick={() => setEditing(true)}>Correct member</Button>
          ) : records.canFinance ? (
            <Button onClick={() => setContributing(true)}>Add contribution</Button>
          ) : null}
          <details className="relative">
            <summary className={`${buttonClass("secondary")} cursor-pointer list-none`}>Actions</summary>
            <div className="absolute right-0 z-20 mt-2 flex w-52 flex-col gap-2 rounded-[10px] border border-line bg-card p-2 shadow-sm">
              {maintain && records.canFinance ? (
                <Button variant="secondary" onClick={() => setContributing(true)}>Add contribution</Button>
              ) : null}
              <StatementActions member={member} />
            </div>
          </details>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          label="Combined pension value"
          value={combined === null ? "Unavailable" : ghs(combined)}
          hint="Each scheme is valued on its own unit price. The balances are separate."
        />
        <Summary
          label="Memberships"
          value={String(holdings.length)}
          hint={holdings.map((row) => schemeName(row.membership.schemeId)).join(", ") || "None in this view"}
        />
        <Summary
          label="Open withdrawals"
          value={String(openWithdrawals.length)}
          hint={openWithdrawals[0] ? WITHDRAWAL_LABEL[openWithdrawals[0].status] : "None"}
        />
        <Summary
          label="Open requests"
          value={String(openRequests)}
          hint={openRequests ? "Waiting for a reply" : "No open request"}
        />
      </div>

      <TabList
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "contributions", label: "Contributions" },
          { id: "withdrawals", label: "Withdrawals & Claims" },
          { id: "beneficiaries", label: "Beneficiaries" },
          { id: "documents", label: "Documents" },
          { id: "activity", label: "Activity & Communications" },
        ]}
      />

      {tab === "overview" ? (
      <Section title="Personal and membership">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="First name" value={member.firstName} />
          <Fact label="Last name" value={member.lastName} />
          <Fact label="Display name" value={member.displayName} />
          <Fact label="Email" value={member.email || "Not stated"} />
          <Fact label="Mobile" value={member.mobile} />
          <Fact label="Date of birth" value={formatDate(member.dateOfBirth)} />
          <Fact label="Gender" value={member.gender || "Not stated"} />
          <Fact label="Title" value={member.title || "Not stated"} />
          <Fact label="Profession" value={member.profession || "Not stated"} />
          <Fact label="Location" value={member.location} />
          <Fact label="Next of kin" value={member.nextOfKin || "Not stated"} />
          <Fact label="Next of kin contact" value={member.nextOfKinContact || "Not stated"} />
        </dl>
      </Section>
      ) : null}

      {tab === "overview"
        ? holdings.map(({ membership, position }) => (
            <Section
              key={membership.id}
              title={schemeName(membership.schemeId)}
              description={`${membership.membershipNumber} · ${membership.status === "active" ? "Active" : "Closed"} · since ${formatDate(membership.effectiveFrom)}`}
            >
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Fact label="Pot value" value={position.pot === null ? "Unavailable" : ghs(position.pot)} />
                <Fact label="Units held" value={formatUnits(position.units)} />
                <Fact
                  label="Unit price"
                  value={
                    position.price
                      ? `${position.price.price.toFixed(3)} · set ${formatDate(position.price.date)}`
                      : "Not set. The pot cannot be shown."
                  }
                />
                <Fact label="Monthly contribution" value={ghs(membership.monthlyContribution)} />
                <Fact label="Retirement age" value={String(membership.retirementAge)} />
                <Fact label="Target pot" value={ghs(membership.targetPot)} />
                <Fact label="Contributions this year" value={ghs(position.thisYear)} />
                <Fact label="Lifetime contributions" value={ghs(position.contributed)} />
                <Fact
                  label="Relationship manager"
                  value={
                    records.book.staff.find((person) => person.id === membership.relationshipManagerId)?.name ??
                    "Unassigned"
                  }
                />
              </dl>
              {maintain && membership.status === "active" ? (
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm("Close this membership? Other memberships stay open.")) {
                      records.closeMembership(membership.id);
                    }
                  }}
                >
                  Close membership
                </Button>
              ) : null}
            </Section>
          ))
        : null}

      {tab === "overview" && (attention.length > 0 || openWithdrawals.length > 0 || flags.length > 0) ? (
        <Section title="Items requiring attention">
          <ul className="flex flex-col gap-2 text-sm">
            {attention.map(({ row, status }) => (
              <li key={row.membership.id}>
                {schemeName(row.membership.schemeId)}:{" "}
                {status === "missing"
                  ? `no contribution posted for ${currentMonth()}.`
                  : `this month is short of ${ghs(row.membership.monthlyContribution)}.`}
              </li>
            ))}
            {openWithdrawals.map((row) => (
              <li key={row.id}>
                Withdrawal of {ghs(row.amount)} is {WITHDRAWAL_LABEL[row.status]}.
              </li>
            ))}
            {flags.map(({ row, flag }) => (
              <li key={row.id}>{flag}: {row.policyName}, renewal {formatDate(row.renewalDate)}.</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {tab === "contributions" ? (
      <Section
        title="Contributions"
        action={
          records.canFinance ? (
            <Button variant="secondary" onClick={() => setContributing(true)}>Add contribution</Button>
          ) : null
        }
      >
        {holdings.map(({ membership, position }) => (
          <div key={membership.id} className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-navy">
              {schemeName(membership.schemeId)} · {membership.membershipNumber}
            </h3>
        <Ledger
          empty="No contributions posted to this membership."
          headers={["Date", "Amount", "Unit price", "Units", "Channel", "Posted by", ""]}
          rows={position.contributions.map((row) => [
            formatDate(row.date),
            ghs(row.amount),
            row.unitPrice.toFixed(3),
            formatUnits(row.units),
            channelLabel(),
            staffName(row.postedBy),
            records.canFinance && !row.reversalOf && !position.contributions.some((item) => item.reversalOf === row.id) ? (
              <button
                key={row.id}
                type="button"
                className="cursor-pointer text-sm font-medium text-navy"
                onClick={() => records.reverseContribution(row.id)}
              >
                Reverse
              </button>
            ) : row.reversalOf ? (
              "Reversal"
            ) : (
              ""
            ),
          ])}
        />
          </div>
        ))}
      </Section>
      ) : null}

      {tab === "withdrawals" ? (
      <Section title="Withdrawals">
        {holdings.every((row) => row.position.withdrawals.length === 0) ? (
          <p className="text-sm text-muted">No withdrawals on this file.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {holdings.flatMap((holding) => holding.position.withdrawals.map((row) => (
              <article key={row.id} className="rounded-lg border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">
                      {schemeName(holding.membership.schemeId)} · {ghs(row.amount)} · {row.reason}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Submitted {formatDateTime(row.submittedAt)} · {destinationLabel(row.destinationType, row.destination)} · waiting {daysSince(row.submittedAt)} days
                    </p>
                  </div>
                  <StatusBadge label={WITHDRAWAL_LABEL[row.status]} />
                </div>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <Fact label="Name on the form" value={row.name} />
                  <Fact label="Mobile" value={row.mobile} />
                  <Fact label="Profession" value={row.profession} />
                  <Fact label="Location" value={row.location} />
                  <Fact label="Next of kin" value={row.nextOfKin} />
                  <Fact label="Next of kin contact" value={row.nextOfKinContact} />
                </dl>
                {row.declineReason ? <p className="mt-2 text-sm">Reason: {row.declineReason}</p> : null}
                <ul className="mt-3 text-sm text-muted">
                  {row.events.map((event, index) => (
                    <li key={`${row.id}-${index}`}>
                      {formatDateTime(event.at)} · {event.staffName} · {event.action}
                      {event.note ? ` · ${event.note}` : ""}
                    </li>
                  ))}
                </ul>
              </article>
            )))}
          </div>
        )}
      </Section>
      ) : null}

      {tab === "beneficiaries" ? (
        <Section
          title="Beneficiaries"
          description="Next of kin on the membership record, and beneficiaries named on policies."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label="Next of kin" value={member.nextOfKin || "Not stated"} />
            <Fact label="Next of kin contact" value={member.nextOfKinContact || "Not stated"} />
          </dl>
          <div className="mt-4">
            {policies.length === 0 ? (
              <p className="text-sm text-muted">No policy beneficiary on this file.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {policies.map((row) => (
                  <li key={row.id}>
                    <span className="font-medium text-navy">{row.beneficiary || "Not stated"}</span>
                    <span className="text-muted"> · {row.policyName} · {row.provider}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      ) : null}

      {tab === "activity" ? (
      <Section title="Requests">
        {records.book.requests.filter((row) => row.memberId === member.id).length === 0 ? (
          <p className="text-sm text-muted">No requests on this file.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {records.book.requests
              .filter((row) => row.memberId === member.id)
              .map((row) => (
                <li key={row.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-navy">{row.subject}</p>
                    <StatusBadge label={row.status === "open" ? "Open" : "Replied"} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(row.createdAt)} · {REQUEST_CHANNEL_LABEL[row.channel]}
                  </p>
                  <p className="mt-2 text-sm">{row.body}</p>
                  {row.reply ? (
                    <p className="mt-2 text-sm text-muted">
                      Reply {row.repliedAt ? formatDateTime(row.repliedAt) : ""}: {row.reply}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </Section>
      ) : null}

      {tab === "overview" ? <Planning memberId={member.id} canValue={records.canAdviseMember(member)} /> : null}
      {tab === "overview" ? (
        <Relationship member={member} sessionOpen={sessionOpen} setSessionOpen={setSessionOpen} include={["appointments"]} />
      ) : null}
      {tab === "documents" ? (
        <Relationship member={member} sessionOpen={sessionOpen} setSessionOpen={setSessionOpen} include={["documents"]} />
      ) : null}
      {tab === "activity" ? (
        <Relationship
          member={member}
          sessionOpen={sessionOpen}
          setSessionOpen={setSessionOpen}
          include={["sessions", "tasks", "messages"]}
        />
      ) : null}

      {tab === "activity" ? (
      <Section title="History on this member">
        <AuditList memberId={member.id} />
      </Section>
      ) : null}

      <EditIdentity
        open={editing}
        member={member}
        onClose={() => setEditing(false)}
        onSave={(patch) => {
          const ok = records.correctMember(member.id, patch);
          if (ok) setEditing(false);
        }}
      />
      <Modal open={contributing} title="Add contribution" onClose={() => setContributing(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ok = records.addContribution({
              membershipId: String(form.get("membershipId") ?? ""),
              date: String(form.get("date") ?? ""),
              amount: Number(form.get("amount") ?? 0),
            });
            if (ok) setContributing(false);
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
            Membership
            <select name="membershipId" required className={controlClass} defaultValue={holdings[0]?.membership.id}>
              {holdings.map((row) => (
                <option key={row.membership.id} value={row.membership.id}>
                  {schemeName(row.membership.schemeId)} · {row.membership.membershipNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
            Date received
            <input name="date" type="date" required defaultValue={todayIso()} className={controlClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
            Amount (GHS)
            <input name="amount" type="number" min="0.01" step="0.01" required className={controlClass} />
          </label>
          <p className="text-sm text-muted">Posted at that membership's unit price for the date, through MTN Mobile Money.</p>
          <Button type="submit">Post contribution</Button>
        </form>
      </Modal>
    </div>
  );
}

function Planning({ memberId, canValue }: { memberId: string; canValue: boolean }) {
  const { book, publishValuation } = useRecords();
  const assets = book.assets.filter((row) => row.memberId === memberId);
  const properties = book.properties.filter((row) => row.memberId === memberId);
  const goals = book.goals.filter((row) => row.memberId === memberId);
  const cash = book.cashFlow.filter((row) => row.memberId === memberId);
  const summary = cashFlowSummary(cash);
  const liabilities = book.liabilities.filter((row) => row.memberId === memberId);
  const policies = book.insurance.filter((row) => row.memberId === memberId);
  const retirement = book.retirement.find((row) => row.memberId === memberId);
  const risk = book.risk.find((row) => row.memberId === memberId);
  const emergency = book.emergency.find((row) => row.memberId === memberId);
  const monthsCovered =
    emergency && summary.expenses > 0
      ? Math.round((emergency.cashHeld / summary.expenses) * 10) / 10
      : null;

  return (
    <>
      <Section title="Assets">
        {assets.length === 0 ? <p className="text-sm text-muted">No assets on this file.</p> : (
          <Ledger
            headers={["Type", "Name", "Institution", "Balance", "Currency", "Updated"]}
            rows={assets.map((row) => [row.assetType, row.name, row.institution, ghs(row.balance), row.currency, formatDate(row.updatedAt)])}
          />
        )}
      </Section>
      <Section title="Properties">
        {properties.length === 0 ? <p className="text-sm text-muted">No properties on this file.</p> : properties.map((row) => (
          <article key={row.id} className="mb-3 last:mb-0">
            <p className="font-medium text-navy">{row.address}</p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              <Fact label="Type" value={row.propertyType} />
              <Fact label="Value stated by the member" value={ghs(row.memberValue)} />
              <Fact label="Valuation" value={row.valuation === null ? "Not published" : `${ghs(row.valuation)} · ${row.valuationBy}`} />
              <Fact label="Mortgage" value={ghs(row.mortgage)} />
              <Fact label="Other liens" value={ghs(row.otherLiens)} />
              <Fact label="Occupancy" value={row.occupancy} />
              <Fact label="Insurance" value={row.insurance || "None"} />
            </dl>
            <ul className="mt-2 text-xs text-muted">
              {row.fieldSources.map((source) => (
                <li key={source.field}>{source.field}: {source.source === "member" ? "Member" : "Relationship manager"} · {source.name}</li>
              ))}
            </ul>
            {canValue ? (
              <form
                className="mt-3 flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  publishValuation(row.id, Number(form.get("valuation") ?? 0));
                }}
              >
                <label className="text-sm font-medium text-navy">
                  Publish valuation
                  <input name="valuation" type="number" min="1" step="1" className={`${controlClass} mt-1`} />
                </label>
                <Button type="submit" variant="secondary">Save valuation</Button>
              </form>
            ) : null}
          </article>
        ))}
      </Section>
      <Section title="Goals">
        {goals.length === 0 ? <p className="text-sm text-muted">No goals on this file.</p> : (
          <Ledger
            headers={["Title", "Target", "Date", "Saved", "Monthly still needed", "Track"]}
            rows={goals.map((row) => [row.title, ghs(row.targetAmount), formatDate(row.targetDate), ghs(row.amountSaved), ghs(row.monthlyNeeded), row.onTrack ? "On track" : "Off track"])}
          />
        )}
      </Section>
      <Section title="Cash flow">
        {cash.length === 0 ? <p className="text-sm text-muted">No cash flow on this file.</p> : (
          <>
            <Ledger
              headers={["Name", "Kind", "Monthly", "Category"]}
              rows={cash.map((row) => [row.name, row.kind === "income" ? "Income" : "Expense", ghs(row.monthlyAmount), row.category])}
            />
            <p className="mt-3 text-sm text-muted">
              Surplus {ghs(summary.surplus)}. Savings rate {summary.savingsRate === null ? "unavailable" : `${Math.round(summary.savingsRate * 100)}%`}.
            </p>
          </>
        )}
      </Section>
      <Section title="Liabilities">
        {liabilities.length === 0 ? <p className="text-sm text-muted">No liabilities on this file.</p> : (
          <Ledger
            headers={["Name", "Lender", "Type", "Balance", "Rate", "Minimum", "Payoff"]}
            rows={liabilities.map((row) => [row.name, row.lender, row.type, ghs(row.balance), `${row.interestRate}%`, ghs(row.minimumPayment), formatDate(row.expectedPayoff)])}
          />
        )}
      </Section>
      <Section title="Insurance">
        {policies.length === 0 ? <p className="text-sm text-muted">No policies on this file.</p> : policies.map((row) => {
          const flag = insuranceFlag(row.renewalDate, row.active);
          return (
            <article key={row.id} className="mb-3 border-b border-line pb-3 last:mb-0 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-navy">{row.provider} · {row.policyName}</p>
                {flag ? <StatusBadge label={flag} /> : <StatusBadge label="Active" />}
              </div>
              <p className="mt-1 text-sm text-muted">
                {row.policyNumber} · cover {ghs(row.cover)} · premium {ghs(row.monthlyPremium)} · renewal {formatDate(row.renewalDate)} · beneficiary {row.beneficiary}
              </p>
            </article>
          );
        })}
      </Section>
      <Section title="Retirement plan">
        {retirement ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label="Retirement age" value={String(retirement.retirementAge)} />
            <Fact label="Monthly savings" value={ghs(retirement.monthlySavings)} />
            <Fact label="Pension already held" value={ghs(retirement.pensionHeld)} />
            <Fact label="Desired monthly income" value={ghs(retirement.desiredMonthlyIncome)} />
            <Fact label="Reachable" value={retirement.reachable ? "Looks reachable" : "Does not look reachable"} />
          </dl>
        ) : <p className="text-sm text-muted">No retirement plan on this file.</p>}
      </Section>
      <Section title="Risk profile">
        {risk ? (
          <p className="text-sm">{risk.result[0].toUpperCase() + risk.result.slice(1)} · completed {formatDate(risk.completedAt)}</p>
        ) : <p className="text-sm text-muted">No risk profile on this file.</p>}
      </Section>
      <Section title="Emergency fund">
        {emergency ? (
          <p className="text-sm">
            Cash {ghs(emergency.cashHeld)}. Target {emergency.targetMonths} months.
            {monthsCovered === null ? " Monthly expenses are not on the file, so cover cannot be worked out." : ` That cash covers ${monthsCovered} months.`}
          </p>
        ) : <p className="text-sm text-muted">No emergency fund on this file.</p>}
      </Section>
    </>
  );
}

function Relationship({
  member,
  sessionOpen,
  setSessionOpen,
  include,
}: {
  member: Member;
  sessionOpen: boolean;
  setSessionOpen: (open: boolean) => void;
  include: Array<"appointments" | "sessions" | "tasks" | "messages" | "documents">;
}) {
  const records = useRecords();
  const appointments = records.book.appointments.filter((row) => row.memberId === member.id);
  const sessions = records.book.sessions.filter((row) => row.memberId === member.id);
  const tasks = records.book.tasks.filter((row) => row.memberId === member.id);
  const messages = records.book.messages.filter((row) => row.memberId === member.id);
  const documents = records.book.documents.filter((row) => row.memberId === member.id);
  const advise = records.canAdviseMember(member);
  const today = todayIso();
  const show = (key: (typeof include)[number]) => include.includes(key);

  return (
    <div className="flex flex-col gap-6 rounded-[12px] border border-line bg-card px-5 py-4">
      {show("appointments") ? (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-navy">Appointments</h3>
        </div>
        {appointments.length === 0 ? <p className="text-sm text-muted">No appointments.</p> : (
          <ul className="flex flex-col gap-2">
            {appointments.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{row.type} · {formatDateTime(row.at)} · {row.durationMinutes} min</span>
                <StatusBadge label={row.status[0].toUpperCase() + row.status.slice(1)} />
                {advise && row.status === "requested" ? (
                  <span className="flex gap-2">
                    <Button variant="secondary" onClick={() => records.setAppointmentStatus(row.id, "confirmed")}>Confirm</Button>
                    <Button variant="secondary" onClick={() => records.setAppointmentStatus(row.id, "cancelled")}>Cancel</Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      ) : null}
      {show("sessions") ? (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-navy">Sessions</h3>
          {advise ? <Button variant="secondary" onClick={() => setSessionOpen(true)}>Log session</Button> : null}
        </div>
        {sessions.length === 0 ? <p className="text-sm text-muted">No published sessions.</p> : sessions.map((row) => (
          <article key={row.id} className="mb-3 text-sm">
            <p className="font-medium text-navy">{row.title} · {formatDateTime(row.at)}</p>
            <p className="mt-1">Assessment: {row.assessment}</p>
            <p>Discussed: {row.discussion}</p>
            <p>Recommendations: {row.recommendations}</p>
            {row.notes ? <p>Notes: {row.notes}</p> : null}
          </article>
        ))}
      </div>
      ) : null}
      {show("tasks") ? (
      <div>
        <h3 className="mb-2 text-sm font-medium text-navy">Tasks</h3>
        {tasks.length === 0 ? <p className="text-sm text-muted">No tasks.</p> : (
          <ul className="flex flex-col gap-2 text-sm">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {task.title} · {task.owner === "staff" ? "Staff" : "Member"} · due {formatDate(task.due)} · {task.priority}
                  {!task.done && task.due < today ? " · overdue" : ""}
                  {task.done ? " · done" : ""}
                </span>
                {advise && !task.done ? (
                  <Button variant="secondary" onClick={() => records.completeTask(task.id)}>Mark done</Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      ) : null}
      {show("messages") ? (
      <div>
        <h3 className="mb-2 text-sm font-medium text-navy">Messages</h3>
        {messages.length === 0 ? <p className="text-sm text-muted">No messages.</p> : messages.map((row) => (
          <p key={row.id} className="mb-2 text-sm">
            <span className="text-muted">{formatDateTime(row.at)} · {row.from === "member" ? "Member" : "Staff"} · </span>
            {row.body}
          </p>
        ))}
        {advise ? (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const ok = records.sendMessage(member.id, String(form.get("body") ?? ""));
              if (ok) event.currentTarget.reset();
            }}
          >
            <input name="body" placeholder="Write to the member" className={controlClass} />
            <Button type="submit" variant="secondary">Send</Button>
          </form>
        ) : null}
      </div>
      ) : null}
      {show("documents") ? (
      <div>
        <h3 className="mb-2 text-sm font-medium text-navy">Documents</h3>
        {documents.length === 0 ? <p className="text-sm text-muted">No documents.</p> : (
          <ul className="text-sm">
            {documents.map((row) => (
              <li key={row.id}>{row.name} · {row.tag} · {row.uploadedBy === "member" ? "Member" : "Staff"} · {formatDate(row.uploadedAt)}</li>
            ))}
          </ul>
        )}
        {advise ? (
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const file = form.get("file");
              const name = file instanceof File ? file.name : "";
              const ok = records.uploadDocument({
                memberId: member.id,
                name,
                tag: String(form.get("tag") ?? "other") as DocumentTag,
              });
              if (ok) event.currentTarget.reset();
            }}
          >
            <label className="text-sm font-medium text-navy">
              File
              <input name="file" type="file" required className="mt-1 block text-sm" />
            </label>
            <label className="text-sm font-medium text-navy">
              Tag
              <select name="tag" className={`${controlClass} mt-1`}>
                {DOCUMENT_TAGS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="secondary">Upload</Button>
          </form>
        ) : null}
      </div>
      ) : null}
      {show("sessions") ? (
      <Modal open={sessionOpen} title="Log session" onClose={() => setSessionOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ok = records.publishSession({
              memberId: member.id,
              title: String(form.get("title") ?? ""),
              assessment: String(form.get("assessment") ?? ""),
              discussion: String(form.get("discussion") ?? ""),
              recommendations: String(form.get("recommendations") ?? ""),
              notes: String(form.get("notes") ?? ""),
              followUp: String(form.get("followUp") ?? ""),
              followUpDue: String(form.get("followUpDue") ?? ""),
            });
            if (ok) setSessionOpen(false);
          }}
        >
          <Text name="title" label="Title" />
          <Text name="assessment" label="Assessment" />
          <Text name="discussion" label="Discussion" />
          <Text name="recommendations" label="Recommendations" />
          <Text name="notes" label="Notes" />
          <Text name="followUp" label="Follow-up task" required={false} />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
            Follow-up due
            <input name="followUpDue" type="date" className={controlClass} />
          </label>
          <Button type="submit">Publish session</Button>
        </form>
      </Modal>
      ) : null}
    </div>
  );
}

function AuditList({ memberId }: { memberId: string }) {
  const { book } = useRecords();
  const rows = book.audit.filter((entry) => entry.memberId === memberId);
  if (rows.length === 0) return <p className="text-sm text-muted">No staff changes on this file yet.</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {rows.map((entry) => (
        <li key={entry.id}>
          <span className="text-muted">{formatDateTime(entry.at)} · {entry.staffName} · </span>
          {entry.summary}
          {entry.previousValue ? ` Previous: ${entry.previousValue}.` : ""}
        </li>
      ))}
    </ul>
  );
}

function EditIdentity({
  open,
  member,
  onClose,
  onSave,
}: {
  open: boolean;
  member: Member;
  onClose: () => void;
  onSave: (patch: Partial<Member>) => void;
}) {
  return (
    <Modal open={open} title="Correct member" onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            firstName: String(form.get("firstName") ?? ""),
            lastName: String(form.get("lastName") ?? ""),
            displayName: String(form.get("displayName") ?? ""),
            email: String(form.get("email") ?? ""),
            mobile: String(form.get("mobile") ?? ""),
            dateOfBirth: String(form.get("dateOfBirth") ?? ""),
            gender: String(form.get("gender") ?? ""),
            title: String(form.get("title") ?? ""),
            profession: String(form.get("profession") ?? ""),
            location: String(form.get("location") ?? ""),
            nextOfKin: String(form.get("nextOfKin") ?? ""),
            nextOfKinContact: String(form.get("nextOfKinContact") ?? ""),
          });
        }}
      >
        <Text name="firstName" label="First name" defaultValue={member.firstName} />
        <Text name="lastName" label="Last name" defaultValue={member.lastName} />
        <Text name="displayName" label="Display name" defaultValue={member.displayName} />
        <Text name="email" label="Email" defaultValue={member.email} />
        <Text name="mobile" label="Mobile" defaultValue={member.mobile} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
          Date of birth
          <input name="dateOfBirth" type="date" defaultValue={member.dateOfBirth} className={controlClass} />
        </label>
        <Text name="gender" label="Gender" defaultValue={member.gender} />
        <Text name="title" label="Title" defaultValue={member.title} />
        <Text name="profession" label="Profession" defaultValue={member.profession} />
        <Text name="location" label="Location" defaultValue={member.location} />
        <Text name="nextOfKin" label="Next of kin" defaultValue={member.nextOfKin} />
        <Text name="nextOfKinContact" label="Next of kin contact" defaultValue={member.nextOfKinContact} />
        <Button type="submit">Save correction</Button>
      </form>
    </Modal>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-[12px] border border-line bg-card px-5 py-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[26px] leading-none font-semibold text-navy tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
    </article>
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

function Ledger({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>{headers.map((header) => <th key={header} className="px-2 py-2 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-2 align-middle">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ul className="flex flex-col gap-3 md:hidden">
      {rows.map((row, index) => (
        <li key={index} className="rounded-[10px] border border-line px-3 py-3">
          <dl className="flex flex-col gap-2">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="flex items-start justify-between gap-3 text-sm">
                {headers[cellIndex] ? (
                  <dt className="shrink-0 text-xs text-muted">{headers[cellIndex]}</dt>
                ) : null}
                <dd className={`min-w-0 break-words text-foreground ${headers[cellIndex] ? "text-right" : ""}`}>{cell}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
    </>
  );
}

function Text({
  name,
  label,
  defaultValue,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required={required} className={controlClass} />
    </label>
  );
}
