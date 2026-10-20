"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { LifeBuoy } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { REQUEST_CHANNEL_LABEL, memberName } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";

export function RequestsBoard() {
  const params = useSearchParams();
  const records = useRecords();
  const [openOnly, setOpenOnly] = useState(params.get("status") !== "all");
  const [selected, setSelected] = useState<string | null>(null);
  const visible = new Set(records.members.map((member) => member.id));
  const rows = records.book.requests.filter(
    (row) => visible.has(row.memberId) && (!openOnly || row.status === "open"),
  );
  const current = records.book.requests.find((row) => row.id === selected) ?? null;
  const member = current
    ? records.book.members.find((item) => item.id === current.memberId)
    : null;

  return (
    <div>
      <PageHeader
        title="Member requests"
        description="Reply once. The member sees it in the app, and the same reply goes by SMS and email."
        action={
          <Button variant="secondary" onClick={() => setOpenOnly((value) => !value)}>
            {openOnly ? "Show replied" : "Open only"}
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={openOnly ? "No open requests" : "No requests"}
          description="Messages members send from the app, SMS, or email show up here."
          action={
            openOnly ? <Button onClick={() => setOpenOnly(false)}>Show replied</Button> : undefined
          }
        />
      ) : (
        <DataTable
          columns={[
            { key: "member", header: "Member" },
            { key: "subject", header: "Subject" },
            { key: "channel", header: "Channel" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
          rows={rows.map((row) => {
            const person = records.book.members.find((item) => item.id === row.memberId);
            return {
              id: row.id,
              cells: {
                member: (
                  <button
                    type="button"
                    className="cursor-pointer font-medium text-navy hover:underline"
                    onClick={() => setSelected(row.id)}
                  >
                    {person ? memberName(person) : "Member"}
                  </button>
                ),
                subject: row.subject,
                channel: REQUEST_CHANNEL_LABEL[row.channel],
                date: formatDateTime(row.createdAt),
                status: <StatusBadge label={row.status === "open" ? "Open" : "Replied"} />,
              },
            };
          })}
        />
      )}
      {current ? (
        <section className="mt-4 rounded-xl border border-line bg-card p-5">
          <p className="text-xs text-muted">
            {member ? memberName(member) : "Member"} · {REQUEST_CHANNEL_LABEL[current.channel]} · {formatDateTime(current.createdAt)}
          </p>
          <h2 className="mt-1 text-base font-medium text-navy">{current.subject}</h2>
          <p className="mt-3 text-sm">{current.body}</p>
          {current.reply ? (
            <p className="mt-3 text-sm text-muted">
              Reply {current.repliedAt ? formatDateTime(current.repliedAt) : ""}: {current.reply}
            </p>
          ) : records.canCorrect ? (
            <form
              className="mt-4 flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const ok = records.replyToRequest(current.id, String(form.get("reply") ?? ""));
                if (ok) setSelected(null);
              }}
            >
              <textarea name="reply" required placeholder="Reply" className={`${controlClass} h-28 py-2`} />
              <Button type="submit">Send reply</Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">Member services sends the reply.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
