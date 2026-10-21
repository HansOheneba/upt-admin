import type {
  Book,
  DocumentTag,
  Member,
  Membership,
  Role,
  Staff,
  Withdrawal,
} from "@/lib/domain";
import {
  canAccessScheme,
  canAdministerStaff,
  canCreateScheme,
  canManageCompany,
  canManageScheme,
  canMaintainMember,
  canPostMoney,
  canReviewWithdrawal,
  isManagement,
  isTeamLead,
  memberName,
  membershipById,
  schemeById,
  visibleMemberships,
} from "@/lib/domain";
import { ghs } from "@/lib/format";
import { membershipPosition, priceOn, pricesForScheme, unitsFor } from "@/lib/pension";

export type ActionResult = { book: Book } | { error: string };

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function staffById(book: Book, staffId: string) {
  return book.staff.find((person) => person.id === staffId) ?? null;
}

function memberById(book: Book, memberId: string) {
  return book.members.find((member) => member.id === memberId) ?? null;
}

function writeAudit(
  book: Book,
  staff: Staff,
  entry: {
    memberId: string | null;
    action: string;
    field: string;
    previousValue: string;
    newValue: string;
    summary: string;
    schemeId?: string | null;
    companyId?: string | null;
  },
): Book {
  return {
    ...book,
    audit: [
      {
        id: id("aud"),
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        schemeId: entry.schemeId ?? null,
        companyId: entry.companyId ?? null,
        ...entry,
      },
      ...book.audit,
    ],
  };
}

function abovePot(book: Book, row: Withdrawal) {
  const position = membershipPosition(book, row.membershipId);
  if (position.pot === null) return "The pot is unavailable, so this cannot be paid.";
  if (row.amount > position.pot) return "The amount is above the pot, so it cannot be paid.";
  return null;
}

function nextMembershipNumber(book: Book, code: string) {
  const numbers = book.memberships
    .filter((membership) => membership.membershipNumber.startsWith(`${code}-`))
    .map((membership) => {
      const match = membership.membershipNumber.match(/(\d+)$/);
      return match ? Number(match[1]) : 10000;
    });
  return `${code}-${Math.max(10000, ...numbers, 10000) + 1}`;
}

function fail(error: string): ActionResult {
  return { error };
}

export function registerMember(
  book: Book,
  staff: Staff,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    dateOfBirth: string;
    gender: string;
    title: string;
    profession: string;
    location: string;
    nextOfKin: string;
    nextOfKinContact: string;
    schemeId: string;
    monthlyContribution: number;
    retirementAge: number;
    targetPot: number;
  },
): ActionResult {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName || !input.mobile.trim()) {
    return fail("Enter the member's name and mobile.");
  }
  if (!staff.roles.includes("relationship_manager")) {
    return fail("A relationship manager registers a client onto their own portfolio.");
  }
  const scheme = schemeById(book, input.schemeId);
  if (!scheme) return fail("Choose a scheme.");
  if (scheme.status !== "open") return fail("This scheme is closed to new memberships.");
  if (!canAccessScheme(book, staff, scheme.id)) {
    return fail("You are not assigned to that scheme.");
  }
  const member: Member = {
    id: id("mem"),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    email: input.email.trim(),
    mobile: input.mobile.trim(),
    dateOfBirth: input.dateOfBirth,
    gender: input.gender.trim(),
    title: input.title.trim(),
    profession: input.profession.trim(),
    location: input.location.trim(),
    nextOfKin: input.nextOfKin.trim(),
    nextOfKinContact: input.nextOfKinContact.trim(),
  };
  const membership: Membership = {
    id: id("memship"),
    memberId: member.id,
    schemeId: scheme.id,
    membershipNumber: nextMembershipNumber(book, scheme.code),
    status: "active",
    effectiveFrom: nowIso().slice(0, 10),
    effectiveTo: null,
    companyId: null,
    relationshipManagerId: staff.id,
    monthlyContribution: input.monthlyContribution,
    retirementAge: input.retirementAge,
    targetPot: input.targetPot,
  };
  const next = writeAudit(
    {
      ...book,
      members: [member, ...book.members],
      memberships: [membership, ...book.memberships],
    },
    staff,
    {
      memberId: member.id,
      action: "member.register",
      field: "Membership",
      previousValue: "",
      newValue: membership.membershipNumber,
      summary: `${staff.name} registered ${memberName(member)} on ${scheme.name}.`,
    },
  );
  return { book: next };
}

const IDENTITY_FIELDS: { key: keyof Member; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "displayName", label: "Display name" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "title", label: "Title" },
  { key: "profession", label: "Profession" },
  { key: "location", label: "Location" },
  { key: "nextOfKin", label: "Next of kin" },
  { key: "nextOfKinContact", label: "Next of kin contact" },
];

export function correctMember(
  book: Book,
  staff: Staff,
  memberId: string,
  patch: Partial<Member>,
): ActionResult {
  const member = memberById(book, memberId);
  if (!member) return fail("Member not found.");
  if (!canMaintainMember(book, staff, memberId)) {
    return fail("This client is outside your portfolio.");
  }
  let next = book;
  const updated = { ...member };
  for (const field of IDENTITY_FIELDS) {
    if (!(field.key in patch)) continue;
    const previous = String(member[field.key] ?? "");
    const value = patch[field.key];
    const nextValue = String(value ?? "");
    if (previous === nextValue) continue;
    (updated as Record<string, unknown>)[field.key] = value;
    next = writeAudit(next, staff, {
      memberId,
      action: "member.correct",
      field: field.label,
      previousValue: previous,
      newValue: nextValue,
      summary: `${staff.name} corrected ${field.label.toLowerCase()} for ${memberName(member)}.`,
    });
  }
  return {
    book: {
      ...next,
      members: next.members.map((item) => (item.id === memberId ? updated : item)),
    },
  };
}

export function closeMembership(book: Book, staff: Staff, membershipId: string): ActionResult {
  const membership = membershipById(book, membershipId);
  if (!membership) return fail("Membership not found.");
  const member = memberById(book, membership.memberId);
  if (!member) return fail("Member not found.");
  if (!canMaintainMember(book, staff, member.id)) {
    return fail("This client is outside your portfolio.");
  }
  if (membership.status === "closed") return fail("This membership is already closed.");
  const next = writeAudit(
    {
      ...book,
      memberships: book.memberships.map((item) =>
        item.id === membershipId
          ? { ...item, status: "closed" as const, effectiveTo: nowIso().slice(0, 10) }
          : item,
      ),
    },
    staff,
    {
      memberId: member.id,
      action: "membership.close",
      field: "Membership status",
      previousValue: "Active",
      newValue: "Closed",
      summary: `${staff.name} closed ${membership.membershipNumber} for ${memberName(member)}.`,
    },
  );
  return { book: next };
}

export function setUnitPrice(
  book: Book,
  staff: Staff,
  input: { schemeId: string; date: string; price: number },
): ActionResult {
  if (!canPostMoney(staff)) return fail("Your role cannot set a unit price.");
  const scheme = schemeById(book, input.schemeId);
  if (!scheme) return fail("Choose a scheme.");
  if (!canAccessScheme(book, staff, scheme.id)) return fail("That scheme is outside your authority.");
  if (!input.date) return fail("Enter the date this price applies.");
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return fail("Enter a unit price above zero.");
  }
  const series = pricesForScheme(book, scheme.id);
  if (series.some((row) => row.date === input.date)) {
    return fail("A price is already stored for that date.");
  }
  const previous = [...series].sort((a, b) => b.date.localeCompare(a.date))[0];
  const row = {
    id: id("px"),
    schemeId: scheme.id,
    date: input.date,
    price: input.price,
    setBy: staff.id,
    setAt: nowIso(),
  };
  return {
    book: writeAudit({ ...book, unitPrices: [...book.unitPrices, row] }, staff, {
      memberId: null,
      action: "unit_price.set",
      field: "Unit price",
      previousValue: previous ? `${previous.price} on ${previous.date}` : "",
      newValue: `${input.price} on ${input.date}`,
      summary: `${staff.name} set the ${scheme.name} unit price to ${input.price} for ${input.date}.`,
    }),
  };
}

function postedRow(
  book: Book,
  staff: Staff,
  input: {
    membershipId: string;
    date: string;
    amount: number;
    paymentId: string | null;
    reference?: string;
  },
): ActionResult {
  if (!canPostMoney(staff)) return fail("Your role cannot post a contribution.");
  const membership = membershipById(book, input.membershipId);
  if (!membership) return fail("Choose a membership.");
  const member = memberById(book, membership.memberId);
  if (!member) return fail("Choose a member.");
  if (!canAccessScheme(book, staff, membership.schemeId)) {
    return fail("That scheme is outside your authority.");
  }
  if (membership.status !== "active") return fail("This membership is closed.");
  if (input.paymentId) {
    if (!book.payments.some((payment) => payment.id === input.paymentId)) {
      return fail("That payment is no longer unmatched.");
    }
    if (book.contributions.some((row) => row.paymentId === input.paymentId)) {
      return fail("This payment is already posted.");
    }
  }
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    return fail("Enter the amount received.");
  }
  const price = priceOn(pricesForScheme(book, membership.schemeId), input.date);
  if (!price) return fail("No unit price applies on that date.");
  const row = {
    id: id("con"),
    memberId: membership.memberId,
    membershipId: membership.id,
    date: input.date,
    amount: input.amount,
    unitPrice: price.price,
    units: unitsFor(input.amount, price.price),
    channel: "mtn_momo" as const,
    postedBy: staff.id,
    postedAt: nowIso(),
    reversalOf: null,
    paymentId: input.paymentId,
  };
  const payments = input.paymentId
    ? book.payments.filter((payment) => payment.id !== input.paymentId)
    : book.payments;
  return {
    book: writeAudit(
      { ...book, contributions: [...book.contributions, row], payments },
      staff,
      {
        memberId: membership.memberId,
        schemeId: membership.schemeId,
        action: "contribution.post",
        field: "Contribution",
        previousValue: "",
        newValue: input.reference
          ? `${input.reference} · ${ghs(input.amount)} · ${membership.membershipNumber}`
          : `${ghs(input.amount)} on ${input.date}`,
        summary: input.reference
          ? `${staff.name} posted ${ghs(input.amount)} from ${input.reference} to ${membership.membershipNumber} on ${schemeById(book, membership.schemeId)?.name ?? "the scheme"}.`
          : `${staff.name} posted a contribution of ${ghs(input.amount)} for ${memberName(member)}.`,
      },
    ),
  };
}

export function postPayment(
  book: Book,
  staff: Staff,
  paymentId: string,
  membershipId: string,
): ActionResult {
  const payment = book.payments.find((item) => item.id === paymentId);
  if (!payment) return fail("That payment is no longer unmatched.");
  return postedRow(book, staff, {
    membershipId,
    date: payment.receivedAt.slice(0, 10),
    amount: payment.amount,
    paymentId,
    reference: payment.reference,
  });
}

export function addContribution(
  book: Book,
  staff: Staff,
  input: { membershipId: string; date: string; amount: number },
): ActionResult {
  return postedRow(book, staff, { ...input, paymentId: null });
}

export function reverseContribution(
  book: Book,
  staff: Staff,
  contributionId: string,
): ActionResult {
  if (!canPostMoney(staff)) return fail("Your role cannot reverse a contribution.");
  const original = book.contributions.find((row) => row.id === contributionId);
  if (!original) return fail("Contribution not found.");
  if (original.reversalOf) return fail("A reversing row cannot be reversed again.");
  if (book.contributions.some((row) => row.reversalOf === original.id)) {
    return fail("This contribution already has a reversing row.");
  }
  const member = memberById(book, original.memberId);
  const row = {
    ...original,
    id: id("con"),
    amount: -original.amount,
    units: -original.units,
    postedBy: staff.id,
    postedAt: nowIso(),
    reversalOf: original.id,
    paymentId: null,
  };
  return {
    book: writeAudit({ ...book, contributions: [...book.contributions, row] }, staff, {
      memberId: original.memberId,
      action: "contribution.reverse",
      field: "Contribution",
      previousValue: `${ghs(original.amount)} on ${original.date}`,
      newValue: `${ghs(row.amount)} reversing ${original.id}`,
      summary: `${staff.name} reversed a contribution of ${ghs(original.amount)} for ${member ? memberName(member) : "a member"}.`,
    }),
  };
}

function withWithdrawal(
  book: Book,
  staff: Staff,
  withdrawal: Withdrawal,
  audit: {
    action: string;
    previousValue: string;
    newValue: string;
    summary: string;
  },
): Book {
  return writeAudit(
    {
      ...book,
      withdrawals: book.withdrawals.map((row) =>
        row.id === withdrawal.id ? withdrawal : row,
      ),
    },
    staff,
    {
      memberId: withdrawal.memberId,
      field: "Status",
      ...audit,
    },
  );
}

export function startReview(book: Book, staff: Staff, withdrawalId: string): ActionResult {
  if (!canReviewWithdrawal(staff)) return fail("Your role cannot review a withdrawal.");
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "received") return fail("Only a received withdrawal can move to review.");
  const next: Withdrawal = {
    ...row,
    status: "checking",
    events: [
      ...row.events,
      { at: nowIso(), staffId: staff.id, staffName: staff.name, action: "Under review", note: "" },
    ],
  };
  const member = memberById(book, row.memberId);
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.review",
      previousValue: "Received",
      newValue: "Under review",
      summary: `${staff.name} moved ${member ? memberName(member) : "a member"}'s withdrawal to review.`,
    }),
  };
}

export function approveWithdrawal(
  book: Book,
  staff: Staff,
  withdrawalId: string,
  note: string,
): ActionResult {
  if (!canReviewWithdrawal(staff)) return fail("Your role cannot approve a withdrawal.");
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "checking") return fail("Approve a withdrawal from under review.");
  if (!note.trim()) return fail("Add a note for the approval.");
  const blocked = abovePot(book, row);
  if (blocked) return fail(blocked);
  const next: Withdrawal = {
    ...row,
    status: "approved",
    approvedBy: staff.id,
    events: [
      ...row.events,
      {
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        action: "Approved",
        note: note.trim(),
      },
    ],
  };
  const member = memberById(book, row.memberId);
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.approve",
      previousValue: "Under review",
      newValue: "Approved",
      summary: `${staff.name} approved ${member ? memberName(member) : "a member"}'s withdrawal.`,
    }),
  };
}

export function returnWithdrawal(
  book: Book,
  staff: Staff,
  withdrawalId: string,
  reason: string,
): ActionResult {
  if (!canReviewWithdrawal(staff)) return fail("Your role cannot send a withdrawal back.");
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "approved") return fail("Only an approved withdrawal can return to review.");
  if (!reason.trim()) return fail("Give the reason for sending it back.");
  const next: Withdrawal = {
    ...row,
    status: "checking",
    approvedBy: null,
    events: [
      ...row.events,
      {
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        action: "Returned to review",
        note: reason.trim(),
      },
    ],
  };
  const member = memberById(book, row.memberId);
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.return",
      previousValue: "Approved",
      newValue: "Under review",
      summary: `${staff.name} sent ${member ? memberName(member) : "a member"}'s withdrawal back to review.`,
    }),
  };
}

export function completePayment(
  book: Book,
  staff: Staff,
  withdrawalId: string,
  input: { reference: string; paidAt: string },
): ActionResult {
  if (!canPostMoney(staff)) return fail("Your role cannot pay a withdrawal.");
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "approved") return fail("Pay a withdrawal after it is approved.");
  if (row.approvedBy === staff.id) {
    return fail("The person who approved this withdrawal cannot mark it paid.");
  }
  if (!input.reference.trim() || !input.paidAt) {
    return fail("Enter the payment reference and the date paid.");
  }
  const blocked = abovePot(book, row);
  if (blocked) return fail(blocked);
  const membership = membershipById(book, row.membershipId);
  const price = membership
    ? priceOn(pricesForScheme(book, membership.schemeId), input.paidAt)
    : null;
  if (!price) return fail("No unit price applies on the payment date.");
  const unitsTaken = unitsFor(row.amount, price.price);
  const next: Withdrawal = {
    ...row,
    status: "paid",
    paidBy: staff.id,
    paidAt: input.paidAt,
    paymentReference: input.reference.trim(),
    unitsTaken,
    unitPriceUsed: price.price,
    events: [
      ...row.events,
      {
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        action: "Payment completed",
        note: input.reference.trim(),
      },
    ],
  };
  const member = memberById(book, row.memberId);
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.pay",
      previousValue: "Approved",
      newValue: "Payment completed",
      summary: `${staff.name} completed payment on ${member ? memberName(member) : "a member"}'s withdrawal.`,
    }),
  };
}

export function declineWithdrawal(
  book: Book,
  staff: Staff,
  withdrawalId: string,
  reason: string,
): ActionResult {
  if (!canReviewWithdrawal(staff)) return fail("Your role cannot decline a withdrawal.");
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status === "paid" || row.status === "declined") {
    return fail("This withdrawal can no longer be declined.");
  }
  if (!reason.trim()) return fail("Give a reason the member can be told.");
  const previous = row.status;
  const next: Withdrawal = {
    ...row,
    status: "declined",
    declineReason: reason.trim(),
    events: [
      ...row.events,
      {
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        action: "Declined",
        note: reason.trim(),
      },
    ],
  };
  const member = memberById(book, row.memberId);
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.decline",
      previousValue: previous,
      newValue: "Declined",
      summary: `${staff.name} declined ${member ? memberName(member) : "a member"}'s withdrawal.`,
    }),
  };
}

export function replyToRequest(
  book: Book,
  staff: Staff,
  requestId: string,
  reply: string,
): ActionResult {
  const request = book.requests.find((item) => item.id === requestId);
  if (!request) return fail("Request not found.");
  if (request.status === "replied") return fail("This request already has a reply.");
  if (!reply.trim()) return fail("Write the reply.");
  const member = memberById(book, request.memberId);
  const text = reply.trim();
  return {
    book: writeAudit(
      {
        ...book,
        requests: book.requests.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: "replied",
                reply: text,
                repliedAt: nowIso(),
                repliedBy: staff.id,
              }
            : item,
        ),
      },
      staff,
      {
        memberId: request.memberId,
        action: "request.reply",
        field: "Reply",
        previousValue: "",
        newValue: text,
        summary: `${staff.name} replied to ${member ? memberName(member) : "a member"}. The reply is in the app, and the same reply was sent by SMS and email.`,
      },
    ),
  };
}

export function setAppointmentStatus(
  book: Book,
  staff: Staff,
  appointmentId: string,
  status: "confirmed" | "cancelled",
  at?: string,
): ActionResult {
  const appointment = book.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return fail("Appointment not found.");
  const member = memberById(book, appointment.memberId);
  const nextAt = at || appointment.at;
  return {
    book: writeAudit(
      {
        ...book,
        appointments: book.appointments.map((item) =>
          item.id === appointmentId ? { ...item, status, at: nextAt } : item,
        ),
      },
      staff,
      {
        memberId: appointment.memberId,
        action: status === "confirmed" ? "appointment.confirm" : "appointment.cancel",
        field: "Appointment",
        previousValue: appointment.status,
        newValue: status === "confirmed" && at ? `confirmed ${at}` : status,
        summary: `${staff.name} ${status === "confirmed" ? "confirmed" : "cancelled"} an appointment with ${member ? memberName(member) : "a member"}.`,
      },
    ),
  };
}

export function publishSession(
  book: Book,
  staff: Staff,
  input: {
    memberId: string;
    title: string;
    assessment: string;
    discussion: string;
    recommendations: string;
    notes: string;
    followUp: string;
    followUpDue: string;
  },
): ActionResult {
  const member = memberById(book, input.memberId);
  if (!member) return fail("Member not found.");
  if (!input.title.trim() || !input.discussion.trim()) {
    return fail("Add a title and what was discussed.");
  }
  const session = {
    id: id("ses"),
    memberId: input.memberId,
    staffId: staff.id,
    title: input.title.trim(),
    assessment: input.assessment.trim(),
    discussion: input.discussion.trim(),
    recommendations: input.recommendations.trim(),
    notes: input.notes.trim(),
    published: true,
    at: nowIso(),
  };
  let next: Book = { ...book, sessions: [session, ...book.sessions] };
  if (input.followUp.trim()) {
    next = {
      ...next,
      tasks: [
        {
          id: id("task"),
          memberId: input.memberId,
          title: input.followUp.trim(),
          owner: "staff",
          staffId: staff.id,
          due: input.followUpDue || nowIso().slice(0, 10),
          priority: "normal",
          done: false,
        },
        ...next.tasks,
      ],
    };
  }
  return {
    book: writeAudit(next, staff, {
      memberId: input.memberId,
      action: "session.publish",
      field: "Session",
      previousValue: "",
      newValue: session.title,
      summary: `${staff.name} published a session for ${memberName(member)}.`,
    }),
  };
}

export function addTask(
  book: Book,
  staff: Staff,
  input: {
    memberId: string;
    title: string;
    owner: "staff" | "member";
    due: string;
    priority: "low" | "normal" | "high";
  },
): ActionResult {
  const member = memberById(book, input.memberId);
  if (!member) return fail("Choose a member.");
  if (!input.title.trim() || !input.due) return fail("Add a task and a due date.");
  return {
    book: writeAudit(
      {
        ...book,
        tasks: [
          {
            id: id("task"),
            memberId: input.memberId,
            title: input.title.trim(),
            owner: input.owner,
            staffId: input.owner === "staff" ? staff.id : null,
            due: input.due,
            priority: input.priority,
            done: false,
          },
          ...book.tasks,
        ],
      },
      staff,
      {
        memberId: input.memberId,
        action: "task.add",
        field: "Task",
        previousValue: "",
        newValue: input.title.trim(),
        summary: `${staff.name} added a task for ${memberName(member)}.`,
      },
    ),
  };
}

export function completeTask(book: Book, staff: Staff, taskId: string): ActionResult {
  const task = book.tasks.find((item) => item.id === taskId);
  if (!task) return fail("Task not found.");
  const member = memberById(book, task.memberId);
  return {
    book: writeAudit(
      {
        ...book,
        tasks: book.tasks.map((item) =>
          item.id === taskId ? { ...item, done: true } : item,
        ),
      },
      staff,
      {
        memberId: task.memberId,
        action: "task.done",
        field: "Task",
        previousValue: "Open",
        newValue: "Done",
        summary: `${staff.name} completed “${task.title}” for ${member ? memberName(member) : "a member"}.`,
      },
    ),
  };
}

export function sendMessage(
  book: Book,
  staff: Staff,
  memberId: string,
  body: string,
): ActionResult {
  const member = memberById(book, memberId);
  if (!member) return fail("Member not found.");
  if (!body.trim()) return fail("Write the message.");
  return {
    book: writeAudit(
      {
        ...book,
        messages: [
          {
            id: id("msg"),
            memberId,
            from: "staff",
            staffId: staff.id,
            body: body.trim(),
            at: nowIso(),
          },
          ...book.messages,
        ],
      },
      staff,
      {
        memberId,
        action: "message.send",
        field: "Message",
        previousValue: "",
        newValue: body.trim(),
        summary: `${staff.name} wrote to ${memberName(member)}.`,
      },
    ),
  };
}

export function uploadDocument(
  book: Book,
  staff: Staff,
  input: { memberId: string; name: string; tag: DocumentTag },
): ActionResult {
  const member = memberById(book, input.memberId);
  if (!member) return fail("Member not found.");
  if (!input.name.trim()) return fail("Choose a file.");
  return {
    book: writeAudit(
      {
        ...book,
        documents: [
          {
            id: id("doc"),
            memberId: input.memberId,
            membershipId: null,
            name: input.name.trim(),
            tag: input.tag,
            uploadedBy: "staff",
            staffId: staff.id,
            uploadedAt: nowIso(),
          },
          ...book.documents,
        ],
      },
      staff,
      {
        memberId: input.memberId,
        action: "document.upload",
        field: "Document",
        previousValue: "",
        newValue: input.name.trim(),
        summary: `${staff.name} uploaded ${input.name.trim()} for ${memberName(member)}.`,
      },
    ),
  };
}

export function publishValuation(
  book: Book,
  staff: Staff,
  propertyId: string,
  valuation: number,
): ActionResult {
  const property = book.properties.find((item) => item.id === propertyId);
  if (!property) return fail("Property not found.");
  if (!Number.isFinite(valuation) || valuation <= 0) return fail("Enter the valuation.");
  const member = memberById(book, property.memberId);
  return {
    book: writeAudit(
      {
        ...book,
        properties: book.properties.map((item) =>
          item.id === propertyId
            ? {
                ...item,
                valuation,
                valuationBy: staff.name,
                fieldSources: [
                  ...item.fieldSources.filter((source) => source.field !== "Valuation"),
                  {
                    field: "Valuation",
                    source: "relationship_manager" as const,
                    name: staff.name,
                  },
                ],
              }
            : item,
        ),
      },
      staff,
      {
        memberId: property.memberId,
        action: "property.valuation",
        field: "Valuation",
        previousValue: property.valuation === null ? "" : String(property.valuation),
        newValue: String(valuation),
        summary: `${staff.name} published a valuation for ${member ? memberName(member) : "a member"}.`,
      },
    ),
  };
}

export function addStaff(
  book: Book,
  staff: Staff,
  input: { name: string; email: string; roles: Role[]; leadId?: string | null },
): ActionResult {
  if (!canAdministerStaff(staff)) return fail("Your role cannot change staff access.");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) return fail("Enter a name and work email.");
  if (input.roles.length === 0) return fail("Choose at least one role.");
  if (book.staff.some((person) => person.email.toLowerCase() === email && person.active)) {
    return fail("That work email is already on the staff list.");
  }
  if (input.roles.includes("relationship_manager") && !input.leadId) {
    return fail("Choose the team lead this relationship manager reports to.");
  }
  const person: Staff = {
    id: id("stf"),
    name,
    email,
    roles: input.roles,
    active: true,
    leadId: input.roles.includes("relationship_manager") ? input.leadId ?? null : null,
  };
  return {
    book: writeAudit({ ...book, staff: [...book.staff, person] }, staff, {
      memberId: null,
      action: "staff.add",
      field: "Staff",
      previousValue: "",
      newValue: `${name} · ${email}`,
      summary: `${staff.name} added ${name} to the staff list.`,
    }),
  };
}

export function removeStaff(book: Book, staff: Staff, staffId: string): ActionResult {
  const person = staffById(book, staffId);
  if (!person || !person.active) return fail("Staff member not found.");
  if (person.id === staff.id) return fail("You cannot remove your own access.");
  const managers = book.staff.filter(
    (item) => item.active && item.roles.includes("management") && item.id !== person.id,
  );
  if (person.roles.includes("management") && managers.length === 0) {
    return fail("Keep at least one Management user.");
  }
  return {
    book: writeAudit(
      {
        ...book,
        staff: book.staff.map((item) =>
          item.id === staffId ? { ...item, active: false } : item,
        ),
      },
      staff,
      {
        memberId: null,
        action: "staff.remove",
        field: "Staff",
        previousValue: "Active",
        newValue: "Removed",
        summary: `${staff.name} removed ${person.name}'s access.`,
      },
    ),
  };
}

export function createScheme(
  book: Book,
  staff: Staff,
  input: { name: string; code: string; leadId?: string | null },
): ActionResult {
  if (!canCreateScheme(staff)) return fail("Your role cannot create a scheme.");
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name || !code) return fail("Enter a scheme name and code.");
  if (book.schemes.some((scheme) => scheme.code.toLowerCase() === code.toLowerCase())) {
    return fail("That scheme code is already in use.");
  }
  const leadId = isManagement(staff) ? input.leadId || staff.id : staff.id;
  const lead = book.staff.find(
    (person) => person.active && person.id === leadId && person.roles.includes("team_lead"),
  );
  if (!lead && !isTeamLead(staff)) return fail("Choose the team lead who will own this scheme.");
  const ownerId = lead?.id ?? staff.id;
  if (!isManagement(staff) && ownerId !== staff.id) {
    return fail("A team lead creates a scheme they will own.");
  }
  const now = nowIso();
  const scheme = {
    id: id("sch"),
    name,
    code,
    status: "open" as const,
    leadId: ownerId,
    createdAt: now,
    updatedAt: now,
  };
  return {
    book: writeAudit({ ...book, schemes: [...book.schemes, scheme] }, staff, {
      memberId: null,
      schemeId: scheme.id,
      action: "scheme.create",
      field: "Scheme",
      previousValue: "",
      newValue: `${name} · ${code}`,
      summary: `${staff.name} opened ${name}.`,
    }),
  };
}

export function updateScheme(
  book: Book,
  staff: Staff,
  schemeId: string,
  input: { name?: string; status?: "open" | "closed" },
): ActionResult {
  const scheme = schemeById(book, schemeId);
  if (!scheme) return fail("Scheme not found.");
  if (!canManageScheme(book, staff, scheme)) return fail("This scheme is outside your authority.");
  const name = input.name?.trim() || scheme.name;
  const status = input.status ?? scheme.status;
  return {
    book: writeAudit(
      {
        ...book,
        schemes: book.schemes.map((item) =>
          item.id === scheme.id ? { ...item, name, status, updatedAt: nowIso() } : item,
        ),
      },
      staff,
      {
        memberId: null,
        schemeId: scheme.id,
        action: "scheme.update",
        field: "Scheme",
        previousValue: `${scheme.name} · ${scheme.status}`,
        newValue: `${name} · ${status}`,
        summary: `${staff.name} updated ${name}.`,
      },
    ),
  };
}

export function setSchemeManagers(
  book: Book,
  staff: Staff,
  schemeId: string,
  relationshipManagerIds: string[],
): ActionResult {
  const scheme = schemeById(book, schemeId);
  if (!scheme) return fail("Scheme not found.");
  if (!canManageScheme(book, staff, scheme) || !scheme.leadId) {
    return fail("This scheme is outside your authority.");
  }
  if (isTeamLead(staff) && scheme.leadId !== staff.id && !isManagement(staff)) {
    return fail("This scheme is outside your authority.");
  }
  const eligible = new Set(
    book.staff
      .filter(
        (person) =>
          person.active &&
          person.roles.includes("relationship_manager") &&
          person.leadId === scheme.leadId,
      )
      .map((person) => person.id),
  );
  if (relationshipManagerIds.some((managerId) => !eligible.has(managerId))) {
    return fail("Assign only relationship managers who report to this scheme's team lead.");
  }
  const now = nowIso();
  const kept = book.schemeAssignments.filter((row) => row.schemeId !== scheme.id);
  const next = relationshipManagerIds.map((relationshipManagerId) => {
    const existing = book.schemeAssignments.find(
      (row) => row.schemeId === scheme.id && row.relationshipManagerId === relationshipManagerId,
    );
    return (
      existing ?? {
        id: id("sra"),
        schemeId: scheme.id,
        relationshipManagerId,
        assignedAt: now,
        assignedBy: staff.id,
      }
    );
  });
  return {
    book: writeAudit(
      {
        ...book,
        schemeAssignments: [...kept, ...next],
        schemes: book.schemes.map((item) =>
          item.id === scheme.id ? { ...item, updatedAt: now } : item,
        ),
      },
      staff,
      {
        memberId: null,
        schemeId: scheme.id,
        action: "scheme.assign_rm",
        field: "Relationship managers",
        previousValue: String(
          book.schemeAssignments.filter((row) => row.schemeId === scheme.id).length,
        ),
        newValue: String(next.length),
        summary: `${staff.name} updated relationship managers on ${scheme.name}.`,
      },
    ),
  };
}

export function assignCompanyToScheme(
  book: Book,
  staff: Staff,
  input: { companyId: string; schemeId: string; effectiveFrom: string },
): ActionResult {
  const scheme = schemeById(book, input.schemeId);
  const company = book.companies.find((item) => item.id === input.companyId);
  if (!scheme || !company) return fail("Choose a company and a scheme.");
  if (!canManageScheme(book, staff, scheme)) return fail("This scheme is outside your authority.");
  if (scheme.status !== "open") return fail("This scheme is closed to new companies.");
  if (company.status === "inactive") return fail("This company is inactive.");
  const existing = book.companySchemes.find(
    (row) =>
      row.companyId === company.id && row.schemeId === scheme.id && row.status === "active",
  );
  if (existing) return fail("That company is already on this scheme.");
  const row = {
    id: id("csa"),
    companyId: company.id,
    schemeId: scheme.id,
    effectiveFrom: input.effectiveFrom || nowIso().slice(0, 10),
    effectiveTo: null,
    status: "active" as const,
  };
  return {
    book: writeAudit(
      {
        ...book,
        companySchemes: [...book.companySchemes, row],
        companies: book.companies.map((item) =>
          item.id === company.id ? { ...item, updatedAt: nowIso() } : item,
        ),
      },
      staff,
      {
      memberId: null,
      schemeId: scheme.id,
      companyId: company.id,
      action: "scheme.assign_company",
      field: "Company",
      previousValue: "",
      newValue: company.name,
      summary: `${staff.name} assigned ${company.name} to ${scheme.name}.`,
    },
    ),
  };
}

export function endCompanyScheme(
  book: Book,
  staff: Staff,
  assignmentId: string,
): ActionResult {
  const row = book.companySchemes.find((item) => item.id === assignmentId);
  if (!row || row.status !== "active") return fail("That scheme participation is not active.");
  const scheme = schemeById(book, row.schemeId);
  const company = book.companies.find((item) => item.id === row.companyId);
  if (!scheme || !company) return fail("Choose a company and a scheme.");
  if (!canManageScheme(book, staff, scheme)) return fail("This scheme is outside your authority.");
  const today = nowIso().slice(0, 10);
  return {
    book: writeAudit(
      {
        ...book,
        companySchemes: book.companySchemes.map((item) =>
          item.id === row.id ? { ...item, status: "ended" as const, effectiveTo: today } : item,
        ),
        companies: book.companies.map((item) =>
          item.id === company.id ? { ...item, updatedAt: nowIso() } : item,
        ),
      },
      staff,
      {
        memberId: null,
        schemeId: scheme.id,
        companyId: company.id,
        action: "scheme.end_company",
        field: "Scheme participation",
        previousValue: "Active",
        newValue: "Ended",
        summary: `${staff.name} ended ${company.name}'s participation in ${scheme.name}. Memberships were left unchanged.`,
      },
    ),
  };
}

export function confirmEnrolment(
  book: Book,
  staff: Staff,
  input: {
    memberId: string;
    schemeId: string;
    companyId: string | null;
    relationshipManagerId: string;
    monthlyContribution: number;
    retirementAge: number;
    targetPot: number;
  },
): ActionResult {
  const scheme = schemeById(book, input.schemeId);
  const member = memberById(book, input.memberId);
  if (!scheme || !member) return fail("Choose a person and a scheme.");
  if (!canManageScheme(book, staff, scheme)) return fail("This scheme is outside your authority.");
  if (scheme.status !== "open") return fail("This scheme is closed to new memberships.");
  const already = book.memberships.some(
    (membership) =>
      membership.memberId === member.id &&
      membership.schemeId === scheme.id &&
      membership.status === "active",
  );
  if (already) return fail("This person already has an active membership on that scheme.");
  if (input.companyId) {
    const employed = book.employments.some(
      (employment) =>
        employment.memberId === member.id &&
        employment.companyId === input.companyId &&
        !employment.effectiveTo,
    );
    const participating = book.companySchemes.some(
      (row) =>
        row.companyId === input.companyId && row.schemeId === scheme.id && row.status === "active",
    );
    if (!employed || !participating) {
      return fail("Confirm an employee of a company that participates in this scheme.");
    }
    const employer = book.companies.find((item) => item.id === input.companyId);
    if (!employer || employer.status !== "active") return fail("This company is inactive.");
  }
  const manager = book.staff.find((person) => person.id === input.relationshipManagerId);
  if (
    !manager ||
    !manager.active ||
    !manager.roles.includes("relationship_manager") ||
    manager.leadId !== scheme.leadId ||
    !book.schemeAssignments.some(
      (row) => row.schemeId === scheme.id && row.relationshipManagerId === manager.id,
    )
  ) {
    return fail("Choose a relationship manager assigned to this scheme.");
  }
  const membership: Membership = {
    id: id("memship"),
    memberId: member.id,
    schemeId: scheme.id,
    membershipNumber: nextMembershipNumber(book, scheme.code),
    status: "active",
    effectiveFrom: nowIso().slice(0, 10),
    effectiveTo: null,
    companyId: input.companyId,
    relationshipManagerId: manager.id,
    monthlyContribution: input.monthlyContribution,
    retirementAge: input.retirementAge,
    targetPot: input.targetPot,
  };
  return {
    book: writeAudit({ ...book, memberships: [membership, ...book.memberships] }, staff, {
      memberId: member.id,
      schemeId: scheme.id,
      companyId: input.companyId,
      action: "membership.open",
      field: "Membership",
      previousValue: "",
      newValue: membership.membershipNumber,
      summary: `${staff.name} opened ${scheme.name} membership ${membership.membershipNumber} for ${memberName(member)}.`,
    }),
  };
}

export function markWithdrawalReady(book: Book, staff: Staff, withdrawalId: string): ActionResult {
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "received") return fail("Only a received withdrawal can be marked ready.");
  const membership = membershipById(book, row.membershipId);
  if (!membership || membership.relationshipManagerId !== staff.id) {
    return fail("This withdrawal is outside your portfolio.");
  }
  const next: Withdrawal = {
    ...row,
    rmReadyAt: nowIso(),
    events: [
      ...row.events,
      {
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        action: "Ready for review",
        note: "",
      },
    ],
  };
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.ready",
      previousValue: "",
      newValue: "Ready for review",
      summary: `${staff.name} marked a withdrawal ready for compliance review.`,
    }),
  };
}

export function escalateWithdrawal(
  book: Book,
  staff: Staff,
  withdrawalId: string,
  note: string,
): ActionResult {
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status === "paid" || row.status === "declined") {
    return fail("This withdrawal can no longer be escalated.");
  }
  if (!note.trim()) return fail("Add a note for the team lead.");
  const membership = membershipById(book, row.membershipId);
  if (!membership || membership.relationshipManagerId !== staff.id) {
    return fail("This withdrawal is outside your portfolio.");
  }
  const next: Withdrawal = {
    ...row,
    escalatedAt: nowIso(),
    escalatedBy: staff.id,
    escalationNote: note.trim(),
    events: [
      ...row.events,
      {
        at: nowIso(),
        staffId: staff.id,
        staffName: staff.name,
        action: "Escalated",
        note: note.trim(),
      },
    ],
  };
  return {
    book: withWithdrawal(book, staff, next, {
      action: "withdrawal.escalate",
      previousValue: "",
      newValue: note.trim(),
      summary: `${staff.name} escalated a withdrawal to their team lead.`,
    }),
  };
}

export function addCompany(
  book: Book,
  staff: Staff,
  input: {
    name: string;
    reference: string;
    contactName?: string;
    contactEmail?: string;
    contactMobile?: string;
  },
): ActionResult {
  if (!isManagement(staff) && !isTeamLead(staff)) return fail("Your role cannot add a company.");
  const name = input.name.trim();
  const reference = input.reference.trim().toUpperCase();
  const contactEmail = input.contactEmail?.trim() ?? "";
  if (!name || !reference) return fail("Enter the company name and reference.");
  if (contactEmail && !contactEmail.includes("@")) return fail("Enter a valid contact email.");
  if (book.companies.some((company) => company.reference.toLowerCase() === reference.toLowerCase())) {
    return fail("That company reference is already in use.");
  }
  const company = {
    id: id("co"),
    name,
    reference,
    status: "active" as const,
    contactName: input.contactName?.trim() ?? "",
    contactEmail,
    contactMobile: input.contactMobile?.trim() ?? "",
    relationshipManagerId: null,
    updatedAt: nowIso(),
  };
  return {
    book: writeAudit({ ...book, companies: [...book.companies, company] }, staff, {
      memberId: null,
      companyId: company.id,
      action: "company.add",
      field: "Company",
      previousValue: "",
      newValue: name,
      summary: `${staff.name} added ${name}.`,
    }),
  };
}

export function setCompanyManager(
  book: Book,
  staff: Staff,
  companyId: string,
  relationshipManagerId: string | null,
): ActionResult {
  const company = book.companies.find((item) => item.id === companyId);
  if (!company) return fail("Company not found.");
  if (!canManageCompany(book, staff, company.id)) return fail("This company is outside your authority.");
  const manager = relationshipManagerId ? staffById(book, relationshipManagerId) : null;
  if (relationshipManagerId) {
    if (!manager || !manager.active || !manager.roles.includes("relationship_manager")) {
      return fail("Choose a relationship manager.");
    }
    if (!isManagement(staff) && manager.leadId !== staff.id) {
      return fail("Choose a relationship manager who reports to you.");
    }
  }
  const previous = staffById(book, company.relationshipManagerId ?? "")?.name ?? "";
  return {
    book: writeAudit(
      {
        ...book,
        companies: book.companies.map((item) =>
          item.id === company.id
            ? { ...item, relationshipManagerId, updatedAt: nowIso() }
            : item,
        ),
      },
      staff,
      {
        memberId: null,
        companyId: company.id,
        action: "company.manager",
        field: "Relationship manager",
        previousValue: previous,
        newValue: manager?.name ?? "",
        summary: manager
          ? `${staff.name} assigned ${manager.name} to ${company.name}.`
          : `${staff.name} cleared the relationship manager on ${company.name}.`,
      },
    ),
  };
}

export function setReportingLine(
  book: Book,
  staff: Staff,
  staffId: string,
  leadId: string,
): ActionResult {
  if (!isManagement(staff)) return fail("Management sets reporting lines.");
  const person = staffById(book, staffId);
  const lead = staffById(book, leadId);
  if (!person || !person.roles.includes("relationship_manager")) {
    return fail("Choose a relationship manager.");
  }
  if (!lead || !lead.active || !lead.roles.includes("team_lead")) {
    return fail("Choose a team lead.");
  }
  return {
    book: writeAudit(
      {
        ...book,
        staff: book.staff.map((item) => (item.id === person.id ? { ...item, leadId } : item)),
      },
      staff,
      {
        memberId: null,
        action: "staff.lead",
        field: "Team lead",
        previousValue: person.leadId ?? "",
        newValue: lead.name,
        summary: `${staff.name} set ${person.name}'s team lead to ${lead.name}.`,
      },
    ),
  };
}

export function linkEmployment(
  book: Book,
  staff: Staff,
  input: { memberId: string; companyId: string; effectiveFrom?: string },
): ActionResult {
  if (!canManageCompany(book, staff, input.companyId)) return fail("Your role cannot record employment.");
  const member = memberById(book, input.memberId);
  const company = book.companies.find((item) => item.id === input.companyId);
  if (!member || !company) return fail("Choose a person and a company.");
  if (company.status !== "active") return fail("This company is inactive.");
  if (
    !isManagement(staff) &&
    !visibleMemberships(book, staff).some((membership) => membership.memberId === member.id)
  ) {
    return fail("This person is outside your schemes.");
  }
  if (
    book.employments.some(
      (employment) =>
        employment.memberId === member.id &&
        employment.companyId === company.id &&
        !employment.effectiveTo,
    )
  ) {
    return fail("This person is already employed by that company.");
  }
  const effectiveFrom = input.effectiveFrom || nowIso().slice(0, 10);
  if (!effectiveFrom) return fail("Enter the employment start date.");
  const employment = {
    id: id("emp"),
    memberId: member.id,
    companyId: company.id,
    effectiveFrom,
    effectiveTo: null,
  };
  return {
    book: writeAudit(
      {
        ...book,
        employments: [...book.employments, employment],
        companies: book.companies.map((item) =>
          item.id === company.id ? { ...item, updatedAt: nowIso() } : item,
        ),
      },
      staff,
      {
        memberId: member.id,
        companyId: company.id,
        action: "employment.add",
        field: "Employment",
        previousValue: "",
        newValue: company.name,
        summary: `${staff.name} recorded ${memberName(member)} at ${company.name}. No membership was opened.`,
      },
    ),
  };
}

export function endEmployment(book: Book, staff: Staff, employmentId: string): ActionResult {
  const employment = book.employments.find((item) => item.id === employmentId);
  if (!employment || employment.effectiveTo) return fail("That employment is not active.");
  if (!canManageCompany(book, staff, employment.companyId)) {
    return fail("This company is outside your authority.");
  }
  const member = memberById(book, employment.memberId);
  const company = book.companies.find((item) => item.id === employment.companyId);
  if (!member || !company) return fail("Choose a person and a company.");
  const today = nowIso().slice(0, 10);
  return {
    book: writeAudit(
      {
        ...book,
        employments: book.employments.map((item) =>
          item.id === employment.id ? { ...item, effectiveTo: today } : item,
        ),
        companies: book.companies.map((item) =>
          item.id === company.id ? { ...item, updatedAt: nowIso() } : item,
        ),
      },
      staff,
      {
        memberId: member.id,
        companyId: company.id,
        action: "employment.end",
        field: "Employment",
        previousValue: "Active",
        newValue: "Ended",
        summary: `${staff.name} ended ${memberName(member)}'s employment at ${company.name}. Memberships were left unchanged.`,
      },
    ),
  };
}
