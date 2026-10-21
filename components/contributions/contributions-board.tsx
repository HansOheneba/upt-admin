"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleDollarSign } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { downloadCsv } from "@/lib/csv";
import { memberName, seesOrganisation } from "@/lib/domain";
import { formatDate, formatUnits, ghs, todayIso } from "@/lib/format";
import { channelLabel, contributionMonthStatus, currentMonth, inRange } from "@/lib/pension";

const PAGE_SIZE = 12;

export function ContributionsBoard() {
  const records = useRecords();
  const { book, memberships, postPayment, canFinance, schemeId, schemes, staff } = records;
  const [from, setFrom] = useState(() => `${currentMonth()}-01`);
  const [to, setTo] = useState(todayIso());
  const [exceptionMonth, setExceptionMonth] = useState(currentMonth());
  const [exceptionType, setExceptionType] = useState<"all" | "missing" | "partial">("all");
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<{ paymentId: string; membershipId: string } | null>(null);
  const [selectedException, setSelectedException] = useState<string | null>(null);
  const [postedPage, setPostedPage] = useState(1);
  const [exceptionPage, setExceptionPage] = useState(1);

  const rangeInvalid = Boolean(from && to && from > to);
  const schemeLabel =
    schemeId === "all" ? "All schemes in your authority" : (schemes.find((scheme) => scheme.id === schemeId)?.name ?? "Scheme");
  const showScheme = schemeId === "all";
  const canSeeReceipts = !!staff && seesOrganisation(staff);

  const visible = useMemo(() => new Set(memberships.map((membership) => membership.id)), [memberships]);
  const posted = useMemo(
    () =>
      rangeInvalid
        ? []
        : book.contributions
            .filter((row) => visible.has(row.membershipId) && inRange(row.date, from, to))
            .sort((a, b) => b.date.localeCompare(a.date) || b.postedAt.localeCompare(a.postedAt)),
    [book.contributions, from, rangeInvalid, to, visible],
  );
  const originals = posted.filter((row) => row.amount > 0 && !row.reversalOf);
  const postedValue = originals.reduce((sum, row) => sum + row.amount, 0);
  const postedNet = posted.reduce((sum, row) => sum + row.amount, 0);

  const pending = useMemo(() => {
    if (!canSeeReceipts || rangeInvalid) return [];
    const needle = query.trim().toLowerCase();
    return book.payments
      .filter((payment) => inRange(payment.receivedAt, from, to))
      .filter((payment) => {
        if (!needle) return true;
        return `${payment.reference} ${payment.payerName} ${payment.mobile}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [book.payments, canSeeReceipts, from, query, rangeInvalid, to]);
  const pendingAmount = pending.reduce((sum, payment) => sum + payment.amount, 0);

  const exceptions = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(exceptionMonth)) return [];
    return memberships
      .map((membership) => {
        const status = contributionMonthStatus(membership, book.contributions, exceptionMonth);
        if (status !== "missing" && status !== "partial") return null;
        if (exceptionType !== "all" && status !== exceptionType) return null;
        const received = book.contributions
          .filter((row) => row.membershipId === membership.id && row.date.startsWith(exceptionMonth))
          .reduce((sum, row) => sum + row.amount, 0);
        const member = book.members.find((item) => item.id === membership.memberId);
        const outstanding = Math.max(0, Math.round((membership.monthlyContribution - received) * 100) / 100);
        return member ? { member, membership, status, received, outstanding } : null;
      })
      .filter((row): row is NonNullable<typeof row> => !!row);
  }, [book.contributions, book.members, exceptionMonth, exceptionType, memberships]);
  const missingCount = exceptions.filter((row) => row.status === "missing").length;
  const partialCount = exceptions.filter((row) => row.status === "partial").length;
  const outstandingTotal = exceptions.reduce((sum, row) => sum + row.outstanding, 0);
  const selected = exceptions.find((row) => row.membership.id === selectedException) ?? null;
  const selectedHistory = selected
    ? book.contributions
        .filter((row) => row.membershipId === selected.membership.id && row.date.startsWith(exceptionMonth))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const postedPages = Math.max(1, Math.ceil(posted.length / PAGE_SIZE));
  const postedRows = posted.slice((postedPage - 1) * PAGE_SIZE, postedPage * PAGE_SIZE);
  const exceptionPages = Math.max(1, Math.ceil(exceptions.length / PAGE_SIZE));
  const exceptionRows = exceptions.slice((exceptionPage - 1) * PAGE_SIZE, exceptionPage * PAGE_SIZE);
  const confirmingPayment = confirming
    ? book.payments.find((payment) => payment.id === confirming.paymentId) ?? null
    : null;
  const confirmingMembership = confirming
    ? memberships.find((membership) => membership.id === confirming.membershipId) ?? null
    : null;

  function schemeName(scheme: string) {
    return book.schemes.find((item) => item.id === scheme)?.name ?? "Scheme";
  }

  function companyName(companyId: string | null) {
    if (!companyId) return "Personal";
    return book.companies.find((company) => company.id === companyId)?.name ?? "Company";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contributions"
        description={`Posted contributions for ${schemeLabel}. The date range below applies to posted rows, the export, and unmatched receipts. Contribution exceptions use ${exceptionMonth} and are not calculated from that range.`}
        action={
          <Button
            variant="secondary"
            disabled={rangeInvalid}
            onClick={() => {
              downloadCsv(`contributions-${from}-${to}.csv`, [
                ["Date", "Member", "Scheme", "Membership", "Amount", "Unit price", "Units", "Channel", "Reversal of"],
                ...posted.map((row) => {
                  const member = book.members.find((item) => item.id === row.memberId);
                  const membership = book.memberships.find((item) => item.id === row.membershipId);
                  return [
                    row.date,
                    member ? memberName(member) : "",
                    membership ? schemeName(membership.schemeId) : "",
                    membership?.membershipNumber ?? "",
                    ghs(row.amount),
                    row.unitPrice.toFixed(3),
                    formatUnits(row.units),
                    channelLabel(),
                    row.reversalOf ?? "",
                  ];
                }),
              ]);
            }}
          >
            Export period
          </Button>
        }
      />
      <p className="text-sm text-muted">
        Export covers {schemeLabel}
        {rangeInvalid ? "." : `, ${formatDate(from)} to ${formatDate(to)}.`}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-navy">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPostedPage(1);
            }}
            className={`${controlClass} mt-1`}
          />
        </label>
        <label className="text-sm font-medium text-navy">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPostedPage(1);
            }}
            className={`${controlClass} mt-1`}
          />
        </label>
        <Button
          variant="secondary"
          onClick={() => {
            const day = todayIso();
            setFrom(day);
            setTo(day);
            setPostedPage(1);
          }}
        >
          Today
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setFrom(`${currentMonth()}-01`);
            setTo(todayIso());
            setPostedPage(1);
          }}
        >
          This month
        </Button>
      </div>
      {rangeInvalid ? (
        <p className="text-sm text-danger">The start date is after the end date. Choose a range that runs forward.</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Posted contributions"
          value={rangeInvalid ? "—" : ghs(postedValue)}
          hint={
            rangeInvalid
              ? "Waiting for a valid date range"
              : `${originals.length} transaction${originals.length === 1 ? "" : "s"} · ${ghs(postedNet)} net of reversals`
          }
        />
        <StatCard
          label="Pending reconciliation"
          value={!canSeeReceipts || rangeInvalid ? "—" : ghs(pendingAmount)}
          hint={
            canSeeReceipts
              ? rangeInvalid
                ? "Waiting for a valid date range"
                : `${pending.length} received in this period and not yet posted to a membership`
              : "Finance reconciles receipts that are not yet on a membership"
          }
        />
        <StatCard
          label="Contribution exceptions"
          value={String(exceptions.length)}
          hint={`${missingCount} missing · ${partialCount} partial · ${ghs(outstandingTotal)} outstanding in ${exceptionMonth}`}
        />
      </div>

      {canSeeReceipts ? (
        <section id="reconciliation">
          <h2 className="text-base font-semibold text-navy">Pending reconciliation</h2>
          <p className="mt-1 mb-3 text-[13px] text-muted">
            These receipts were received in the selected dates and have not been posted. They are not missing contributions, and they are not on a scheme until finance posts them to one membership.
            {schemeId === "all"
              ? " Choose the membership, including the scheme, before posting."
              : ` Posting from here uses memberships on ${schemeLabel}.`}
          </p>
          <label className="mb-3 flex max-w-md flex-col gap-1.5 text-sm font-medium text-navy">
            Search receipts
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Reference, payer, or mobile"
              className={controlClass}
            />
          </label>
          {pending.length === 0 ? (
            <EmptyState
              icon={CircleDollarSign}
              title="No unmatched payments"
              description="Receipts in this period that are not yet posted to a membership show up here."
            />
          ) : (
            <DataTable
              columns={[
                { key: "date", header: "Date received" },
                { key: "amount", header: "Amount received", className: "text-right" },
                { key: "channel", header: "Channel" },
                { key: "name", header: "Payer" },
                { key: "ref", header: "Reference" },
                { key: "status", header: "Status" },
                { key: "match", header: "Membership" },
              ]}
              rows={pending.map((payment) => ({
                id: payment.id,
                cells: {
                  date: formatDate(payment.receivedAt),
                  amount: ghs(payment.amount),
                  channel: channelLabel(),
                  name: payment.payerName || "Not stated",
                  ref: (
                    <span>
                      {payment.reference}
                      <span className="block text-xs text-muted">{payment.mobile}</span>
                    </span>
                  ),
                  status: <StatusBadge label="Unmatched" />,
                  match: canFinance ? (
                    <form
                      className="flex min-w-64 gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const membershipId = match[payment.id];
                        if (!membershipId) return;
                        setConfirming({ paymentId: payment.id, membershipId });
                      }}
                    >
                      <select
                        value={match[payment.id] ?? ""}
                        onChange={(event) =>
                          setMatch((current) => ({ ...current, [payment.id]: event.target.value }))
                        }
                        className={controlClass}
                        aria-label={`Membership for ${payment.reference}`}
                      >
                        <option value="">Choose a membership</option>
                        {memberships
                          .filter((membership) => membership.status === "active")
                          .map((membership) => {
                            const member = book.members.find((item) => item.id === membership.memberId);
                            if (!member) return null;
                            return (
                              <option key={membership.id} value={membership.id}>
                                {memberName(member)} · {schemeName(membership.schemeId)} · {membership.membershipNumber} · {companyName(membership.companyId)}
                              </option>
                            );
                          })}
                      </select>
                      <Button type="submit" variant="secondary" disabled={!match[payment.id]}>
                        Post
                      </Button>
                    </form>
                  ) : (
                    "Finance posts this"
                  ),
                },
              }))}
            />
          )}
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-navy">Contribution exceptions</h2>
            <p className="mt-1 text-[13px] text-muted">
              Missing means nothing was posted for {exceptionMonth}. Partial means the posted amount is below the monthly contribution. An unmatched receipt is not treated as a contribution.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm font-medium text-navy">
              Exception month
              <input
                type="month"
                value={exceptionMonth}
                onChange={(event) => {
                  setExceptionMonth(event.target.value);
                  setExceptionPage(1);
                  setSelectedException(null);
                }}
                className={`${controlClass} mt-1`}
              />
            </label>
            <label className="text-sm font-medium text-navy">
              Type
              <select
                value={exceptionType}
                onChange={(event) => {
                  setExceptionType(event.target.value as "all" | "missing" | "partial");
                  setExceptionPage(1);
                }}
                className={`${controlClass} mt-1`}
              >
                <option value="all">Missing and partial</option>
                <option value="missing">Missing</option>
                <option value="partial">Partial</option>
              </select>
            </label>
          </div>
        </div>
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted">No missing or partial contributions for {exceptionMonth} on {schemeLabel}.</p>
        ) : (
          <>
            <DataTable
              columns={[
                { key: "member", header: "Member" },
                { key: "scheme", header: "Scheme" },
                { key: "company", header: "Employer" },
                { key: "expected", header: "Expected", className: "text-right" },
                { key: "received", header: "Posted", className: "text-right" },
                { key: "difference", header: "Outstanding", className: "text-right" },
                { key: "period", header: "Period" },
                { key: "status", header: "Type" },
              ]}
              rows={exceptionRows.map(({ member, membership, status, received, outstanding }) => ({
                id: membership.id,
                cells: {
                  member: (
                    <button
                      type="button"
                      className="cursor-pointer text-left font-medium text-navy hover:underline"
                      onClick={() => setSelectedException(membership.id)}
                    >
                      {memberName(member)}
                      <span className="block text-xs font-normal text-muted">{membership.membershipNumber}</span>
                    </button>
                  ),
                  scheme: schemeName(membership.schemeId),
                  company: companyName(membership.companyId),
                  expected: ghs(membership.monthlyContribution),
                  received: ghs(received),
                  difference: ghs(outstanding),
                  period: exceptionMonth,
                  status: <StatusBadge label={status === "missing" ? "Missing" : "Partial"} />,
                },
              }))}
            />
            <Pagination page={exceptionPage} pages={exceptionPages} onPage={setExceptionPage} />
          </>
        )}
        {selected ? (
          <div className="mt-4">
            <Section
              title={`${memberName(selected.member)} · ${selected.membership.membershipNumber}`}
              description={`Posted contributions for ${exceptionMonth}. The expected amount is not a contribution record. Unmatched receipts are not included.`}
              action={
                <Link href={`/members/${selected.member.id}`} className="text-sm font-medium text-navy hover:underline">
                  Open member
                </Link>
              }
            >
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Scheme</dt>
                  <dd className="text-sm text-navy">{schemeName(selected.membership.schemeId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Employer</dt>
                  <dd className="text-sm text-navy">{companyName(selected.membership.companyId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Expected</dt>
                  <dd className="text-sm text-navy">{ghs(selected.membership.monthlyContribution)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Outstanding</dt>
                  <dd className="text-sm text-navy">{ghs(selected.outstanding)}</dd>
                </div>
              </dl>
              {selectedHistory.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Nothing has been posted to this membership for {exceptionMonth}.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2 text-sm">
                  {selectedHistory.map((row) => (
                    <li key={row.id}>
                      {formatDate(row.date)} · {ghs(row.amount)}
                      {row.reversalOf ? " · reversal" : ""} · {channelLabel()}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-navy">Posted in this period</h2>
        {posted.length === 0 ? (
          <p className="text-sm text-muted">
            {rangeInvalid ? "Fix the date range to see posted contributions." : `Nothing posted for ${schemeLabel} between these dates.`}
          </p>
        ) : (
          <>
            <DataTable
              columns={[
                { key: "date", header: "Date" },
                { key: "member", header: "Member" },
                ...(showScheme ? [{ key: "scheme", header: "Scheme" }] : []),
                { key: "amount", header: "Amount", className: "text-right" },
                { key: "price", header: "Unit price" },
                { key: "units", header: "Units", className: "text-right" },
                { key: "channel", header: "Channel" },
              ]}
              rows={postedRows.map((row) => {
                const member = book.members.find((item) => item.id === row.memberId);
                const membership = book.memberships.find((item) => item.id === row.membershipId);
                return {
                  id: row.id,
                  cells: {
                    date: formatDate(row.date),
                    member: member ? (
                      <span>
                        {memberName(member)}
                        {row.reversalOf ? " · reversal" : ""}
                        <span className="block text-xs text-muted">{membership?.membershipNumber}</span>
                      </span>
                    ) : (
                      ""
                    ),
                    scheme: membership ? schemeName(membership.schemeId) : "",
                    amount: ghs(row.amount),
                    price: row.unitPrice.toFixed(3),
                    units: formatUnits(row.units),
                    channel: channelLabel(),
                  },
                };
              })}
            />
            <Pagination page={postedPage} pages={postedPages} onPage={setPostedPage} />
          </>
        )}
      </section>

      <Modal
        open={!!confirmingPayment && !!confirmingMembership}
        title="Post this receipt"
        onClose={() => setConfirming(null)}
      >
        {confirmingPayment && confirmingMembership ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const ok = postPayment(confirmingPayment.id, confirmingMembership.id);
              if (ok) setConfirming(null);
            }}
          >
            <p className="text-sm text-navy">
              {ghs(confirmingPayment.amount)} from {confirmingPayment.reference} will be posted to one membership. This does not post it to any other scheme.
            </p>
            <dl className="grid gap-2 text-sm">
              <Row
                label="Member"
                value={(() => {
                  const person = book.members.find((item) => item.id === confirmingMembership.memberId);
                  return person ? memberName(person) : "Member";
                })()}
              />
              <Row label="Scheme" value={schemeName(confirmingMembership.schemeId)} />
              <Row label="Membership" value={confirmingMembership.membershipNumber} />
              <Row label="Employer" value={companyName(confirmingMembership.companyId)} />
              <Row label="Received" value={formatDate(confirmingPayment.receivedAt)} />
            </dl>
            <div className="flex gap-2">
              <Button type="submit">Post to this membership</Button>
              <Button type="button" variant="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-navy">{value}</dd>
    </div>
  );
}
