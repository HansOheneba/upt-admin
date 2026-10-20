"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { WITHDRAWAL_LABEL, memberName, type WithdrawalStatus } from "@/lib/domain";
import { daysSince, formatDate, formatDateTime, formatUnits, ghs, todayIso } from "@/lib/format";
import { destinationLabel, memberPosition } from "@/lib/pension";

const STAGES: WithdrawalStatus[] = ["received", "checking", "approved", "paid", "declined"];

export function WithdrawalsBoard() {
  const params = useSearchParams();
  const records = useRecords();
  const [stage, setStage] = useState(params.get("stage") ?? "all");
  const [selected, setSelected] = useState<string | null>(params.get("id"));
  const visible = useMemo(
    () => new Set(records.members.map((member) => member.id)),
    [records.members],
  );
  const rows = records.book.withdrawals.filter(
    (row) => visible.has(row.memberId) && (stage === "all" || row.status === stage),
  );
  const current = rows.find((row) => row.id === selected) ?? null;

  return (
    <div>
      <PageHeader
        title="Withdrawals"
        description="Received, under review, approved, then payment. A withdrawal cannot skip a stage, and the approver cannot mark it paid."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <StageButton active={stage === "all"} onClick={() => setStage("all")} label="All" />
        {STAGES.map((item) => (
          <StageButton
            key={item}
            active={stage === item}
            onClick={() => setStage(item)}
            label={WITHDRAWAL_LABEL[item]}
          />
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No withdrawals in this stage"
          description="Member submissions appear here as Received."
          action={<Button onClick={() => setStage("all")}>Show all stages</Button>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "member", header: "Member" },
            { key: "amount", header: "Amount", className: "text-right" },
            { key: "reason", header: "Reason" },
            { key: "destination", header: "Destination" },
            { key: "submitted", header: "Submitted" },
            { key: "stage", header: "Stage" },
            { key: "age", header: "Waiting" },
          ]}
          rows={rows.map((row) => {
            const member = records.book.members.find((item) => item.id === row.memberId);
            return {
              id: row.id,
              cells: {
                member: (
                  <button
                    type="button"
                    className="cursor-pointer text-left font-medium text-navy hover:underline"
                    onClick={() => setSelected(row.id)}
                  >
                    {member ? memberName(member) : row.name}
                    <span className="block text-xs font-normal text-muted">
                      {member?.memberNumber}
                    </span>
                  </button>
                ),
                amount: ghs(row.amount),
                reason: row.reason,
                destination: destinationLabel(row.destinationType, row.destination),
                submitted: formatDate(row.submittedAt),
                stage: <StatusBadge label={WITHDRAWAL_LABEL[row.status]} />,
                age: row.status === "paid" || row.status === "declined" ? "—" : `${daysSince(row.submittedAt)} days`,
              },
            };
          })}
        />
      )}
      {current ? (
        <WithdrawalDetail
          id={current.id}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function StageButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${active ? "bg-navy text-white" : "border border-line bg-card text-navy"}`}
    >
      {label}
    </button>
  );
}

function WithdrawalDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const records = useRecords();
  const row = records.book.withdrawals.find((item) => item.id === id);
  if (!row) return null;
  const member = records.book.members.find((item) => item.id === row.memberId);
  const position = member ? memberPosition(records.book, member.id) : null;
  const earlier = records.book.withdrawals.filter(
    (item) => item.memberId === row.memberId && item.id !== row.id,
  );
  const approver = records.book.staff.find((person) => person.id === row.approvedBy);

  return (
    <section className="mt-4 rounded-xl border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-navy">
            {member ? memberName(member) : row.name} · {ghs(row.amount)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {row.reason} · {destinationLabel(row.destinationType, row.destination)}
          </p>
        </div>
        <button type="button" onClick={onClose} className="cursor-pointer text-sm text-muted">
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div>
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            <Item label="Name" value={row.name} />
            <Item label="Mobile" value={row.mobile} />
            <Item label="Profession" value={row.profession} />
            <Item label="Location" value={row.location} />
            <Item label="Next of kin" value={row.nextOfKin} />
            <Item label="Next of kin contact" value={row.nextOfKinContact} />
          </dl>
          <img
            src={row.signatureDataUrl}
            alt="Signature"
            className="mt-3 h-16 rounded border border-line bg-white"
          />
          {position ? (
            <p className="mt-3 text-sm">
              Pot {position.pot === null ? "unavailable" : ghs(position.pot)} · {formatUnits(position.units)} units
              {member ? (
                <>
                  {" · "}
                  <Link href={`/members/${member.id}`} className="font-medium text-navy">
                    Open file
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          {approver ? <p className="mt-1 text-sm text-muted">Approved by {approver.name}</p> : null}
          {row.declineReason ? <p className="mt-2 text-sm">Decline reason: {row.declineReason}</p> : null}
          <h3 className="mt-4 text-sm font-medium text-navy">Earlier withdrawals</h3>
          {earlier.length === 0 ? (
            <p className="mt-1 text-sm text-muted">None.</p>
          ) : (
            <ul className="mt-1 text-sm text-muted">
              {earlier.map((item) => (
                <li key={item.id}>
                  {formatDate(item.submittedAt)} · {ghs(item.amount)} · {item.reason} · {WITHDRAWAL_LABEL[item.status]}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 text-sm font-medium text-navy">History</h3>
          <ul className="mt-1 text-sm text-muted">
            {row.events.map((event, index) => (
              <li key={index}>
                {formatDateTime(event.at)} · {event.staffName} · {event.action}
                {event.note ? ` · ${event.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <Actions rowId={row.id} status={row.status} approvedBy={row.approvedBy} />
      </div>
    </section>
  );
}

function Actions({
  rowId,
  status,
  approvedBy,
}: {
  rowId: string;
  status: WithdrawalStatus;
  approvedBy: string | null;
}) {
  const records = useRecords();
  const selfApproved = approvedBy === records.staff?.id;

  return (
    <div className="flex flex-col gap-3">
      {records.canReview && status === "received" ? (
        <Button onClick={() => records.startReview(rowId)}>Move to under review</Button>
      ) : null}
      {records.canReview && status === "checking" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            records.approveWithdrawal(rowId, String(form.get("note") ?? ""));
          }}
        >
          <textarea name="note" required placeholder="Approval note" className={`${controlClass} h-20 py-2`} />
          <Button type="submit">Approve</Button>
        </form>
      ) : null}
      {records.canReview && status === "approved" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            records.returnWithdrawal(rowId, String(form.get("reason") ?? ""));
          }}
        >
          <textarea name="reason" required placeholder="Reason for sending it back" className={`${controlClass} h-20 py-2`} />
          <Button type="submit" variant="secondary">Send back to review</Button>
        </form>
      ) : null}
      {records.canFinance && status === "approved" ? (
        selfApproved ? (
          <p className="text-sm text-muted">You approved this withdrawal, so someone else marks it paid.</p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              records.completePayment(rowId, {
                reference: String(form.get("reference") ?? ""),
                paidAt: String(form.get("paidAt") ?? ""),
              });
            }}
          >
            <input name="reference" required placeholder="Payment reference" className={controlClass} />
            <input name="paidAt" type="date" required defaultValue={todayIso()} className={controlClass} />
            <Button type="submit">Mark payment completed</Button>
          </form>
        )
      ) : null}
      {records.canReview && status !== "paid" && status !== "declined" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            records.declineWithdrawal(rowId, String(form.get("reason") ?? ""));
          }}
        >
          <textarea name="reason" required placeholder="Reason the member can be told" className={`${controlClass} h-20 py-2`} />
          <Button type="submit" variant="secondary">Decline</Button>
        </form>
      ) : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
