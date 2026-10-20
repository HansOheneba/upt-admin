"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, ClipboardList, FileText, MessagesSquare } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { memberName } from "@/lib/domain";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";

function useWorkFilters() {
  const { book, members } = useRecords();
  const [staffId, setStaffId] = useState("all");
  const [memberId, setMemberId] = useState("all");
  return { book, members, staffId, setStaffId, memberId, setMemberId };
}

function Filters({
  staffId,
  memberId,
  onStaff,
  onMember,
}: {
  staffId: string;
  memberId: string;
  onStaff: (value: string) => void;
  onMember: (value: string) => void;
}) {
  const { book, members } = useRecords();
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <select value={staffId} onChange={(event) => onStaff(event.target.value)} className={controlClass}>
        <option value="all">All staff</option>
        {book.staff.filter((person) => person.active).map((person) => (
          <option key={person.id} value={person.id}>{person.name}</option>
        ))}
      </select>
      <select value={memberId} onChange={(event) => onMember(event.target.value)} className={`${controlClass} max-w-xs`}>
        <option value="all">All members</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>{memberName(member)}</option>
        ))}
      </select>
    </div>
  );
}

export function AppointmentsBoard() {
  const { book, members, staffId, setStaffId, memberId, setMemberId } = useWorkFilters();
  const { setAppointmentStatus, canAdviseMember } = useRecords();
  const rows = book.appointments.filter((row) => {
    if (!members.some((member) => member.id === row.memberId)) return false;
    if (staffId !== "all" && row.staffId !== staffId) return false;
    if (memberId !== "all" && row.memberId !== memberId) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Appointments" description="Confirm, reschedule, or cancel a meeting." />
      <Filters staffId={staffId} memberId={memberId} onStaff={setStaffId} onMember={setMemberId} />
      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No appointments" description="Requested and upcoming meetings show up here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const member = book.members.find((item) => item.id === row.memberId);
            const owner = book.staff.find((item) => item.id === row.staffId);
            const advise = member ? canAdviseMember(member) : false;
            return (
              <li key={row.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy">
                      {member ? <Link href={`/members/${member.id}`} className="hover:underline">{memberName(member)}</Link> : "Member"} · {row.type}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDateTime(row.at)} · {row.durationMinutes} min · {owner?.name}
                    </p>
                  </div>
                  <StatusBadge label={row.status[0].toUpperCase() + row.status.slice(1)} />
                </div>
                {advise && row.status !== "cancelled" && row.status !== "completed" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.status === "requested" ? (
                      <Button variant="secondary" onClick={() => setAppointmentStatus(row.id, "confirmed")}>Confirm</Button>
                    ) : null}
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        setAppointmentStatus(row.id, "confirmed", `${String(form.get("at"))}:00.000Z`);
                      }}
                    >
                      <input name="at" type="datetime-local" required className={controlClass} />
                      <Button type="submit" variant="secondary">Reschedule</Button>
                    </form>
                    <Button variant="secondary" onClick={() => setAppointmentStatus(row.id, "cancelled")}>Cancel</Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function TasksBoard() {
  const params = useSearchParams();
  const { book, members, staffId, setStaffId, memberId, setMemberId } = useWorkFilters();
  const { completeTask, addTask, canAdviseMember, staff } = useRecords();
  const canAdd = !!staff?.roles.some(
    (role) => role === "relationship_manager" || role === "supervisor",
  );
  const overdueOnly = params.get("overdue") === "1";
  const today = todayIso();
  const rows = book.tasks.filter((task) => {
    if (!members.some((member) => member.id === task.memberId)) return false;
    if (staffId !== "all" && task.staffId !== staffId) return false;
    if (memberId !== "all" && task.memberId !== memberId) return false;
    if (overdueOnly && (task.done || task.due >= today)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Tasks" description="Follow-ups across members. Overdue tasks are called out." />
      <Filters staffId={staffId} memberId={memberId} onStaff={setStaffId} onMember={setMemberId} />
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tasks" description="Add a follow-up from a member file, or after a session." />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((task) => {
            const member = book.members.find((item) => item.id === task.memberId);
            const overdue = !task.done && task.due < today;
            return (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy">
                    {member ? <Link href={`/members/${member.id}`} className="hover:underline">{memberName(member)}</Link> : "Member"} · {task.title}
                  </p>
                  <p className="text-muted">
                    {task.owner === "staff" ? "Staff" : "Member"} · due {formatDate(task.due)} · {task.priority}
                    {overdue ? " · overdue" : ""}
                    {task.done ? " · done" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {overdue ? <StatusBadge label="Overdue" /> : null}
                  {member && canAdviseMember(member) && !task.done ? (
                    <Button variant="secondary" onClick={() => completeTask(task.id)}>Mark done</Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canAdd ? <form
        className="mt-6 grid max-w-lg gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const target = String(form.get("memberId") ?? "");
          const ok = addTask({
            memberId: target,
            title: String(form.get("title") ?? ""),
            owner: String(form.get("owner") ?? "staff") as "staff" | "member",
            due: String(form.get("due") ?? ""),
            priority: String(form.get("priority") ?? "normal") as "low" | "normal" | "high",
          });
          if (ok) event.currentTarget.reset();
        }}
      >
        <h2 className="text-sm font-medium text-navy">Add a task</h2>
        <select name="memberId" required className={controlClass} defaultValue="">
          <option value="" disabled>Member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{memberName(member)}</option>
          ))}
        </select>
        <input name="title" required placeholder="What needs doing" className={controlClass} />
        <div className="grid grid-cols-3 gap-2">
          <select name="owner" className={controlClass}>
            <option value="staff">Staff</option>
            <option value="member">Member</option>
          </select>
          <input name="due" type="date" required className={controlClass} />
          <select name="priority" className={controlClass}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <Button type="submit">Add task</Button>
      </form> : null}
    </div>
  );
}

export function MessagesBoard() {
  const { book, members, staffId, setStaffId, memberId, setMemberId } = useWorkFilters();
  const { sendMessage, canCorrect, canAdviseMember } = useRecords();
  const rows = [...book.messages].reverse().filter((row) => {
    if (!members.some((member) => member.id === row.memberId)) return false;
    if (staffId !== "all" && row.staffId !== staffId) return false;
    if (memberId !== "all" && row.memberId !== memberId) return false;
    return true;
  });
  const unanswered = new Set(
    book.messages
      .filter((row) => row.from === "member")
      .filter((row) => {
        const later = book.messages.some(
          (item) =>
            item.memberId === row.memberId &&
            item.from === "staff" &&
            item.at > row.at,
        );
        return !later;
      })
      .map((row) => row.id),
  );

  return (
    <div>
      <PageHeader title="Messages" description="Notes with a member that have not been answered." />
      <Filters staffId={staffId} memberId={memberId} onStaff={setStaffId} onMember={setMemberId} />
      {rows.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No messages" description="What a member writes, and what staff send back, is kept here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const member = book.members.find((item) => item.id === row.memberId);
            const waiting = unanswered.has(row.id);
            return (
              <li key={row.id} className="rounded-xl border border-line bg-card p-4 text-sm">
                <p className="text-muted">
                  {member ? memberName(member) : "Member"} · {formatDateTime(row.at)} · {row.from === "member" ? "Member" : "Staff"}
                  {waiting ? " · not answered" : ""}
                </p>
                <p className="mt-1">{row.body}</p>
                {waiting && member && (canCorrect || canAdviseMember(member)) ? (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const ok = sendMessage(member.id, String(form.get("body") ?? ""));
                      if (ok) event.currentTarget.reset();
                    }}
                  >
                    <input name="body" required placeholder="Reply" className={controlClass} />
                    <Button type="submit" variant="secondary">Send</Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DocumentsBoard() {
  const { book, members, staffId, setStaffId, memberId, setMemberId } = useWorkFilters();
  const rows = book.documents.filter((row) => {
    if (!members.some((member) => member.id === row.memberId)) return false;
    if (staffId !== "all" && row.staffId !== staffId) return false;
    if (memberId !== "all" && row.memberId !== memberId) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Documents" description="Files on a member. Upload from the member file." />
      <Filters staffId={staffId} memberId={memberId} onStaff={setStaffId} onMember={setMemberId} />
      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Open a member file to upload a statement, identity document, or plan."
          action={<Link href="/members" className="text-sm font-medium text-navy">Open members</Link>}
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {rows.map((row) => {
            const member = book.members.find((item) => item.id === row.memberId);
            return (
              <li key={row.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy">{row.name}</p>
                  <p className="text-muted">
                    {member ? memberName(member) : "Member"} · {row.tag} · {row.uploadedBy === "member" ? "Member" : "Staff"} · {formatDate(row.uploadedAt)}
                  </p>
                </div>
                {member ? <Link href={`/members/${member.id}`} className="font-medium text-navy">Open file</Link> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
