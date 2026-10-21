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

function MonthGrid({
  cursor,
  rows,
  onPrev,
  onNext,
}: {
  cursor: Date;
  rows: { id: string; at: string }[];
  onPrev: () => void;
  onNext: () => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(first);
  const cells = [...Array(pad).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];

  return (
    <div className="mb-4 rounded-[12px] border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onPrev} className="cursor-pointer text-sm font-medium text-navy">Previous</button>
        <p className="text-sm font-medium text-navy">{label}</p>
        <button type="button" onClick={onNext} className="cursor-pointer text-sm font-medium text-navy">Next</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
        {cells.map((day, index) => {
          const count = day
            ? rows.filter((row) => new Date(row.at).getDate() === day).length
            : 0;
          return (
            <div key={index} className={`min-h-12 rounded-[8px] py-1 ${day ? "bg-[#F5F7FA] text-navy" : ""}`}>
              <div>{day ?? ""}</div>
              {count > 0 ? <div className="text-[11px] text-info">{count}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [cursor, setCursor] = useState(() => new Date());
  const rows = book.appointments.filter((row) => {
    if (!members.some((member) => member.id === row.memberId)) return false;
    if (staffId !== "all" && row.staffId !== staffId) return false;
    if (memberId !== "all" && row.memberId !== memberId) return false;
    if (mode === "calendar") {
      const at = new Date(row.at);
      return at.getFullYear() === cursor.getFullYear() && at.getMonth() === cursor.getMonth();
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Appointments" description="Meetings on your members, with the purpose, time, and status." />
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setMode("list")} className={`cursor-pointer rounded-[8px] px-3 py-1.5 text-sm ${mode === "list" ? "bg-navy text-white" : "border border-line bg-card text-navy"}`}>List</button>
        <button type="button" onClick={() => setMode("calendar")} className={`cursor-pointer rounded-[8px] px-3 py-1.5 text-sm ${mode === "calendar" ? "bg-navy text-white" : "border border-line bg-card text-navy"}`}>Calendar</button>
      </div>
      <Filters staffId={staffId} memberId={memberId} onStaff={setStaffId} onMember={setMemberId} />
      {mode === "calendar" ? (
        <MonthGrid
          cursor={cursor}
          rows={rows}
          onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        />
      ) : null}
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
    (role) => role === "relationship_manager" || role === "team_lead",
  );
  const overdueOnly = params.get("overdue") === "1";
  const [view, setView] = useState<"mine" | "overdue" | "today" | "upcoming" | "completed" | "team">(
    overdueOnly ? "overdue" : "mine",
  );
  const today = todayIso();
  const rows = book.tasks.filter((task) => {
    if (!members.some((member) => member.id === task.memberId)) return false;
    if (staffId !== "all" && task.staffId !== staffId) return false;
    if (memberId !== "all" && task.memberId !== memberId) return false;
    if (view === "mine") return task.staffId === staff?.id && !task.done;
    if (view === "overdue") return !task.done && task.due < today;
    if (view === "today") return !task.done && task.due === today;
    if (view === "upcoming") return !task.done && task.due > today;
    if (view === "completed") return task.done;
    return true;
  });

  return (
    <div>
      <PageHeader title="My Tasks" description="Follow-ups assigned across members. Complete a task only when your role allows it." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["mine", "My tasks"],
            ["overdue", "Overdue"],
            ["today", "Due today"],
            ["upcoming", "Upcoming"],
            ["completed", "Completed"],
            ["team", "Team tasks"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`cursor-pointer rounded-[8px] px-3 py-1.5 text-sm ${view === id ? "bg-navy text-white" : "border border-line bg-card text-navy"}`}
          >
            {label}
          </button>
        ))}
      </div>
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
  const { sendMessage, canMaintain, canAdviseMember } = useRecords();
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
      <PageHeader title="Messages" description="Notes with a member. A staff reply is recorded when it is sent." />
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
                {waiting && member && (canMaintain(member.id) || canAdviseMember(member)) ? (
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
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = book.documents.filter((row) => {
    if (!members.some((member) => member.id === row.memberId)) return false;
    if (staffId !== "all" && row.staffId !== staffId) return false;
    if (memberId !== "all" && row.memberId !== memberId) return false;
    if (!needle) return true;
    const member = book.members.find((item) => item.id === row.memberId);
    const haystack = `${row.name} ${row.tag} ${member ? memberName(member) : ""}`.toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <div>
      <PageHeader title="Documents" description="Files held on a member. Upload from the member file." />
      <div className="mb-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, member, or type"
          className={controlClass}
        />
      </div>
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
