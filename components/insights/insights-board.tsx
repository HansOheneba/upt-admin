"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useRecords } from "@/components/records/records-provider";
import { DataTable } from "@/components/ui/data-table";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { WITHDRAWAL_LABEL } from "@/lib/domain";
import { ghs } from "@/lib/format";
import { buildInsights, shareLabel, type ShareRow } from "@/lib/insights";

export function MemberPicture() {
  const { book, members, canAdviseMember } = useRecords();
  const insights = useMemo(() => {
    const adviseIds = new Set(
      members.filter((member) => canAdviseMember(member)).map((member) => member.id),
    );
    return buildInsights(book, members, adviseIds);
  }, [book, canAdviseMember, members]);

  if (members.length === 0) return null;

  const potKnown = insights.combinedPot !== null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium text-navy">Members on your list</h2>
        <p className="mt-1 text-sm text-muted">
        {`${insights.activeCount} active${insights.closedCount > 0 ? ` · ${insights.closedCount} closed` : ""}. ${
          potKnown
            ? "Pots use the current unit price."
            : "No unit price is set, so pots are unavailable."
        }`}
        </p>
      </div>

      {insights.findings.length > 0 ? (
        <section className="rounded-xl border border-line bg-card px-5 py-4">
          <h2 className="text-sm font-medium text-navy">What stands out</h2>
          <ul className="mt-3 space-y-2">
            {insights.findings.map((finding) => (
              <li key={finding.id} className="text-sm leading-6 text-foreground">
                {finding.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Combined pot"
          value={insights.combinedPot === null ? "Unavailable" : ghs(insights.combinedPot)}
          hint={
            insights.averagePot === null
              ? "Active members"
              : `Average ${ghs(insights.averagePot)}`
          }
        />
        <StatCard
          label="Largest share"
          value={
            insights.largest && insights.combinedPot
              ? shareLabel(insights.largest.pot, insights.combinedPot)
              : "—"
          }
          hint={insights.largest ? insights.largest.name : "No pot to compare"}
        />
        <StatCard
          label="In this month"
          value={ghs(insights.monthReceived)}
          hint={`Of ${ghs(insights.monthExpected)} expected`}
        />
        <StatCard
          label="Open withdrawals"
          value={String(insights.openWithdrawalCount)}
          hint={ghs(insights.openWithdrawalAmount)}
        />
      </div>

      <Section title="Needs a look">
        {insights.attention.length === 0 ? (
          <p className="text-sm text-muted">
            Contributions, withdrawals, and the wider picture are in line for these members.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {insights.attention.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
                <Link
                  href={`/members/${row.id}`}
                  className="shrink-0 text-sm font-medium text-navy hover:underline sm:w-48"
                >
                  {row.name}
                </Link>
                <p className="text-sm leading-6 text-foreground">{row.reasons.join(" ")}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Pot by location">
          <ShareList rows={insights.locations} total={insights.combinedPot} />
        </Section>
        <Section title="Pot by profession">
          <ShareList rows={insights.professions} total={insights.combinedPot} />
        </Section>
      </div>

      <Section title="Contribution this month">
        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          <Count label="Received" value={insights.contribution.received} />
          <Count label="Partial" value={insights.contribution.partial} />
          <Count label="Missing" value={insights.contribution.missing} />
        </div>
        <MixBar
          parts={[
            { label: "Received", value: insights.contribution.received, className: "bg-success" },
            { label: "Partial", value: insights.contribution.partial, className: "bg-gold" },
            { label: "Missing", value: insights.contribution.missing, className: "bg-[#8A3030]" },
          ]}
        />
      </Section>

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy">Progress toward the target pot</h2>
        <DataTable
          columns={[
            { key: "name", header: "Member" },
            { key: "pot", header: "Pot", className: "text-right" },
            { key: "target", header: "Target", className: "text-right" },
            { key: "share", header: "Of target", className: "text-right" },
            { key: "years", header: "To retirement", className: "text-right" },
          ]}
          rows={insights.targets.map((row) => ({
            id: row.id,
            cells: {
              name: (
                <Link href={`/members/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.name}
                </Link>
              ),
              pot: row.pot === null ? "Unavailable" : ghs(row.pot),
              target: ghs(row.target),
              share: row.pot === null || row.target <= 0 ? "—" : shareLabel(row.pot, row.target),
              years: yearsLabel(row.years),
            },
          }))}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy">Open withdrawals</h2>
        {insights.openWithdrawals.length === 0 ? (
          <p className="text-sm text-muted">No withdrawal is open.</p>
        ) : (
          <DataTable
            columns={[
              { key: "name", header: "Member" },
              { key: "reason", header: "Reason" },
              { key: "status", header: "Stage" },
              { key: "amount", header: "Amount", className: "text-right" },
              { key: "pot", header: "Pot", className: "text-right" },
            ]}
            rows={insights.openWithdrawals.map((row) => ({
              id: row.id,
              cells: {
                name: (
                  <Link
                    href={`/members/${row.memberId}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
                reason: row.reason,
                status: WITHDRAWAL_LABEL[row.status],
                amount: (
                  <span className={row.exceedsPot ? "text-[#8A3030]" : undefined}>{ghs(row.amount)}</span>
                ),
                pot: row.pot === null ? "Unavailable" : ghs(row.pot),
              },
            }))}
          />
        )}
      </div>

      {insights.planning ? <Planning planning={insights.planning} /> : null}
    </div>
  );
}

function Planning({ planning }: { planning: NonNullable<ReturnType<typeof buildInsights>["planning"]> }) {
  return (
    <Section title="Wider picture">
      <p className="text-sm text-muted">
        {`On file for ${planning.onFile} of ${planning.advised} ${planning.advised === 1 ? "member you advise" : "members you advise"}.`}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count label="Conservative" value={planning.risk.conservative} />
        <Count label="Moderate" value={planning.risk.moderate} />
        <Count label="Aggressive" value={planning.risk.aggressive} />
        <Count label="No risk profile" value={planning.risk.missing} />
      </dl>
      <div className="mt-4 space-y-3 text-sm">
        <PictureLine
          label="Goals"
          text={
            planning.goalsOffTrack.length === 0
              ? planning.goalsOnTrack === 0
                ? "No goals on file."
                : "Goals on file are on track."
              : planning.goalsOffTrack
                  .map((goal) => `${goal.name}: ${goal.title} is off track`)
                  .join(". ")
          }
        />
        <PictureLine
          label="Insurance"
          text={
            planning.insuranceOnFile === 0
              ? "No cover on file."
              : planning.insurance.length === 0
                ? "No expired or renewing cover."
                : planning.insurance
                    .map((policy) => `${policy.name}: ${policy.policy} · ${policy.flag}`)
                    .join(". ")
          }
        />
        <PictureLine
          label="Emergency cash"
          text={
            planning.emergencyOnFile === 0
              ? "No emergency cash on file."
              : planning.emergencyShort.length === 0
                ? "Emergency cash on file meets its target."
                : planning.emergencyShort
                    .map((row) =>
                      row.covered === null
                        ? `${row.name}: target ${row.target} months`
                        : `${row.name}: ${row.covered} of ${row.target} months`,
                    )
                    .join(". ")
          }
        />
        <PictureLine
          label="Retirement"
          text={
            planning.retirementOnFile === 0
              ? "No retirement plan on file."
              : planning.retirementUnreachable.length === 0
                ? "Retirement plans on file are reachable."
                : planning.retirementUnreachable
                    .map((row) => `${row.name}: income on file is not reachable`)
                    .join(". ")
          }
        />
        {planning.cashDeficit.length > 0 ? (
          <PictureLine
            label="Cash flow"
            text={planning.cashDeficit
              .map((row) => `${row.name}: short ${ghs(Math.abs(row.surplus))} a month`)
              .join(". ")}
          />
        ) : null}
        {planning.noPicture.length > 0 ? (
          <PictureLine
            label="Not on file"
            text={planning.noPicture.map((row) => row.name).join(", ")}
          />
        ) : null}
      </div>
    </Section>
  );
}

function PictureLine({ label, text }: { label: string; text: string }) {
  return (
    <p>
      <span className="font-medium text-navy">{label}. </span>
      <span className="text-foreground">{text}</span>
    </p>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-medium tabular-nums text-navy">{value}</p>
    </div>
  );
}

function ShareList({ rows, total }: { rows: ShareRow[]; total: number | null }) {
  if (total === null) {
    return <p className="text-sm text-muted">Pots are unavailable until a unit price is set.</p>;
  }
  const max = rows[0]?.amount ?? 0;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-navy">
              {row.label}
              <span className="text-muted">
                {" "}
                · {row.count} {row.count === 1 ? "member" : "members"}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {ghs(row.amount)} · {shareLabel(row.amount, total)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#EEF1F6]">
            <div
              className={`h-2 rounded-full ${row.amount === max && max > 0 ? "bg-gold" : "bg-navy"}`}
              style={{
                width:
                  row.amount <= 0 || max <= 0
                    ? "0%"
                    : `${Math.max(4, Math.round((row.amount / max) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MixBar({
  parts,
}: {
  parts: { label: string; value: number; className: string }[];
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-[#EEF1F6]">
      {parts.map((part) =>
        part.value === 0 ? null : (
          <div
            key={part.label}
            className={part.className}
            style={{ width: `${(part.value / total) * 100}%` }}
            title={`${part.label}: ${part.value}`}
          />
        ),
      )}
    </div>
  );
}

function yearsLabel(years: number) {
  if (years <= 0) return "Retirement age reached";
  return years === 1 ? "1 year" : `${years} years`;
}
