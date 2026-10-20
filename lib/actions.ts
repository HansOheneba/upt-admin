import type {
  Book,
  DocumentTag,
  Member,
  Role,
  Staff,
  Withdrawal,
} from "@/lib/domain";
import { memberName } from "@/lib/domain";
import { ghs } from "@/lib/format";
import { priceOn, unitsFor } from "@/lib/pension";

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
        ...entry,
      },
      ...book.audit,
    ],
  };
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
  const numbers = book.members.map((member) => {
    const match = member.memberNumber.match(/(\d+)$/);
    return match ? Number(match[1]) : 10000;
  });
  const member: Member = {
    id: id("mem"),
    memberNumber: `MOP-${Math.max(10000, ...numbers) + 1}`,
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
    scheme: "My Own Pension",
    memberSince: nowIso().slice(0, 10),
    status: "active",
    monthlyContribution: input.monthlyContribution,
    retirementAge: input.retirementAge,
    targetPot: input.targetPot,
    relationshipManagerId: null,
  };
  const next = writeAudit(
    { ...book, members: [member, ...book.members] },
    staff,
    {
      memberId: member.id,
      action: "member.register",
      field: "Member",
      previousValue: "",
      newValue: member.memberNumber,
      summary: `${staff.name} registered ${memberName(member)}.`,
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
  { key: "monthlyContribution", label: "Monthly contribution" },
  { key: "retirementAge", label: "Retirement age" },
  { key: "targetPot", label: "Target pot" },
];

export function correctMember(
  book: Book,
  staff: Staff,
  memberId: string,
  patch: Partial<Member>,
): ActionResult {
  const member = memberById(book, memberId);
  if (!member) return fail("Member not found.");
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

export function closeMember(book: Book, staff: Staff, memberId: string): ActionResult {
  const member = memberById(book, memberId);
  if (!member) return fail("Member not found.");
  if (member.status === "closed") return fail("This account is already closed.");
  const next = writeAudit(
    {
      ...book,
      members: book.members.map((item) =>
        item.id === memberId ? { ...item, status: "closed" } : item,
      ),
    },
    staff,
    {
      memberId,
      action: "member.close",
      field: "Account status",
      previousValue: "Active",
      newValue: "Closed",
      summary: `${staff.name} closed ${memberName(member)}'s account.`,
    },
  );
  return { book: next };
}

export function setUnitPrice(
  book: Book,
  staff: Staff,
  input: { date: string; price: number },
): ActionResult {
  if (!input.date) return fail("Enter the date this price applies.");
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return fail("Enter a unit price above zero.");
  }
  if (book.unitPrices.some((row) => row.date === input.date)) {
    return fail("A price is already stored for that date.");
  }
  const previous = [...book.unitPrices].sort((a, b) => b.date.localeCompare(a.date))[0];
  const row = {
    id: id("px"),
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
      summary: `${staff.name} set the unit price to ${input.price} for ${input.date}.`,
    }),
  };
}

function postedRow(
  book: Book,
  staff: Staff,
  input: {
    memberId: string;
    date: string;
    amount: number;
    paymentId: string | null;
  },
): ActionResult {
  const member = memberById(book, input.memberId);
  if (!member) return fail("Choose a member.");
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    return fail("Enter the amount received.");
  }
  const price = priceOn(book.unitPrices, input.date);
  if (!price) return fail("No unit price applies on that date.");
  const row = {
    id: id("con"),
    memberId: input.memberId,
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
        memberId: input.memberId,
        action: "contribution.post",
        field: "Contribution",
        previousValue: "",
        newValue: `${ghs(input.amount)} on ${input.date}`,
        summary: `${staff.name} posted a contribution of ${ghs(input.amount)} for ${memberName(member)}.`,
      },
    ),
  };
}

export function postPayment(
  book: Book,
  staff: Staff,
  paymentId: string,
  memberId: string,
): ActionResult {
  const payment = book.payments.find((item) => item.id === paymentId);
  if (!payment) return fail("That payment is no longer unmatched.");
  return postedRow(book, staff, {
    memberId,
    date: payment.receivedAt.slice(0, 10),
    amount: payment.amount,
    paymentId,
  });
}

export function addContribution(
  book: Book,
  staff: Staff,
  input: { memberId: string; date: string; amount: number },
): ActionResult {
  return postedRow(book, staff, { ...input, paymentId: null });
}

export function reverseContribution(
  book: Book,
  staff: Staff,
  contributionId: string,
): ActionResult {
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
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "checking") return fail("Approve a withdrawal from under review.");
  if (!note.trim()) return fail("Add a note for the approval.");
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
  const row = book.withdrawals.find((item) => item.id === withdrawalId);
  if (!row) return fail("Withdrawal not found.");
  if (row.status !== "approved") return fail("Pay a withdrawal after it is approved.");
  if (row.approvedBy === staff.id) {
    return fail("The person who approved this withdrawal cannot mark it paid.");
  }
  if (!input.reference.trim() || !input.paidAt) {
    return fail("Enter the payment reference and the date paid.");
  }
  const price = priceOn(book.unitPrices, input.paidAt);
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
  input: { name: string; email: string; roles: Role[] },
): ActionResult {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) return fail("Enter a name and work email.");
  if (input.roles.length === 0) return fail("Choose at least one role.");
  if (book.staff.some((person) => person.email.toLowerCase() === email && person.active)) {
    return fail("That work email is already on the staff list.");
  }
  const person: Staff = { id: id("stf"), name, email, roles: input.roles, active: true };
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
  const supervisors = book.staff.filter(
    (item) => item.active && item.roles.includes("supervisor") && item.id !== person.id,
  );
  if (person.roles.includes("supervisor") && supervisors.length === 0) {
    return fail("Keep at least one supervisor.");
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
