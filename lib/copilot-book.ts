import type { Book } from "@/lib/domain";
import { WITHDRAWAL_LABEL, memberName } from "@/lib/domain";
import { ghs } from "@/lib/format";
import { personHoldings } from "@/lib/pension";

export type CopilotMember = {
  id: string;
  ref: string;
  name: string;
  mobile: string;
  email: string;
  location: string;
  status: string;
  balance: number | null;
  units: number;
  monthlyContribution: number;
  openWithdrawal: string;
  openRequest: boolean;
};

export type CopilotBook = {
  fundName: string;
  unitPrice: number | null;
  unitPriceDate: string;
  members: CopilotMember[];
  openWithdrawals: number;
  openRequests: number;
  unmatchedPayments: number;
};

export function toCopilotBook(book: Book, memberIds: string[]): CopilotBook {
  const allowed = new Set(memberIds);
  const members = book.members.filter((member) => allowed.has(member.id)).map((member) => {
    const holdings = personHoldings(book, member.id);
    const open = holdings.rows.find((row) => row.position.openWithdrawal)?.position.openWithdrawal;
    const active = holdings.rows.filter((row) => row.membership.status === "active");
    return {
      id: member.id,
      ref: holdings.rows.map((row) => row.membership.membershipNumber).join(", "),
      name: memberName(member),
      mobile: member.mobile,
      email: member.email,
      location: member.location,
      status: active.length ? "active" : "closed",
      balance: holdings.combinedPot,
      units: holdings.rows.reduce((sum, row) => sum + row.position.units, 0),
      monthlyContribution: active.reduce((sum, row) => sum + row.membership.monthlyContribution, 0),
      openWithdrawal: open ? `${WITHDRAWAL_LABEL[open.status]} ${ghs(open.amount)}` : "",
      openRequest: book.requests.some(
        (request) => request.memberId === member.id && request.status === "open",
      ),
    };
  });
  const schemeNames = [
    ...new Set(
      book.memberships
        .filter((membership) => allowed.has(membership.memberId))
        .map((membership) => book.schemes.find((scheme) => scheme.id === membership.schemeId)?.name)
        .filter((name): name is string => !!name),
    ),
  ];

  return {
    fundName: schemeNames.join(", ") || "Schemes",
    unitPrice: null,
    unitPriceDate: "",
    members,
    openWithdrawals: book.withdrawals.filter(
      (row) =>
        allowed.has(row.memberId) &&
        (row.status === "received" || row.status === "checking" || row.status === "approved"),
    ).length,
    openRequests: book.requests.filter(
      (row) => allowed.has(row.memberId) && row.status === "open",
    ).length,
    unmatchedPayments: book.payments.length,
  };
}

function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function readCopilotBook(value: unknown): CopilotBook | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.members) || raw.members.length > 400) return null;
  const members = raw.members.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = text(row.id, 80);
    const name = text(row.name, 160);
    if (!id || !name) return [];
    const balance = typeof row.balance === "number" ? row.balance : null;
    return [
      {
        id,
        ref: text(row.ref, 40),
        name,
        mobile: text(row.mobile, 40),
        email: text(row.email, 160),
        location: text(row.location, 80),
        status: text(row.status, 20),
        balance,
        units: typeof row.units === "number" ? row.units : 0,
        monthlyContribution:
          typeof row.monthlyContribution === "number" ? row.monthlyContribution : 0,
        openWithdrawal: text(row.openWithdrawal, 80),
        openRequest: row.openRequest === true,
      } satisfies CopilotMember,
    ];
  });
  if (members.length === 0 && raw.members.length > 0) return null;
  return {
    fundName: text(raw.fundName, 80) || "My Own Pension",
    unitPrice: typeof raw.unitPrice === "number" ? raw.unitPrice : null,
    unitPriceDate: text(raw.unitPriceDate, 20),
    members,
    openWithdrawals: typeof raw.openWithdrawals === "number" ? raw.openWithdrawals : 0,
    openRequests: typeof raw.openRequests === "number" ? raw.openRequests : 0,
    unmatchedPayments: typeof raw.unmatchedPayments === "number" ? raw.unmatchedPayments : 0,
  };
}

function potLabel(member: CopilotMember) {
  return member.balance === null ? "unavailable" : ghs(member.balance);
}

export function buildMemberContext(book: CopilotBook, member: CopilotMember) {
  return [
    `Scheme: ${book.fundName}`,
    `Unit price: ${book.unitPrice === null ? "not set" : book.unitPrice} on ${book.unitPriceDate || "unknown"}`,
    `${member.name} (${member.ref}), ${member.status}, ${member.location}, mobile ${member.mobile}.`,
    `Pot ${potLabel(member)}, units ${member.units}, monthly contribution ${ghs(member.monthlyContribution)}.`,
    member.openWithdrawal
      ? `Open withdrawal: ${member.openWithdrawal}.`
      : "No open withdrawal.",
    member.openRequest ? "An open request has no reply." : "No open request.",
  ].join("\n");
}

export function buildBookContext(book: CopilotBook, focus: CopilotMember[]) {
  const people = (focus.length > 0 ? focus : book.members)
    .map(
      (member) =>
        `- ${member.name} (${member.ref}): pot ${potLabel(member)}, ${member.location}, ${member.status}${member.openWithdrawal ? `, withdrawal ${member.openWithdrawal}` : ""}${member.openRequest ? ", open request" : ""}`,
    )
    .join("\n");
  return [
    `Scheme: ${book.fundName}`,
    `Unit price: ${book.unitPrice === null ? "not set, pots unavailable" : `${book.unitPrice} from ${book.unitPriceDate}`}`,
    `Open withdrawals: ${book.openWithdrawals}. Open requests: ${book.openRequests}. Unmatched payments: ${book.unmatchedPayments}.`,
    "Members:",
    people,
  ].join("\n");
}

export function resolveMentionedMembers(question: string, members: CopilotMember[]) {
  const normalised = question.toLowerCase();
  return members.filter((member) => {
    const name = member.name.toLowerCase();
    if (name.length >= 3 && normalised.includes(name)) return true;
    const parts = name.split(/\s+/).filter((part) => part.length >= 3);
    return parts.some((part) => normalised.includes(part) && members.filter((item) => item.name.toLowerCase().includes(part)).length === 1);
  });
}

export function fallbackAnswer(
  question: string,
  book: CopilotBook,
  focus: CopilotMember | null,
) {
  if (focus) {
    return `${focus.name} holds ${potLabel(focus)}. ${focus.openWithdrawal ? `The open withdrawal is ${focus.openWithdrawal}.` : "There is no open withdrawal."} ${focus.openRequest ? "A request still needs a reply." : "No request is waiting."}`;
  }
  const asked = question.toLowerCase();
  if (book.unitPrice === null) {
    return "No unit price is set, so every pot is unavailable. Finance needs to set today's price before pots, new contributions, or payments can be worked out.";
  }
  if (/withdraw/.test(asked)) {
    const moving = book.members.filter((member) => member.openWithdrawal);
    if (moving.length === 0) return "No withdrawal is still moving.";
    return `${moving.length} withdrawals are still moving. The first file is **${moving[0].name}**, ${moving[0].openWithdrawal}. Open that withdrawal and move it one stage.`;
  }
  const ranked = [...book.members].sort((a, b) => (b.balance ?? -1) - (a.balance ?? -1));
  const lead = ranked[0];
  if (!lead) return "There are no members on this book.";
  if (/request|reply|open work/.test(asked)) {
    const waiting = book.members.filter((member) => member.openRequest || member.openWithdrawal);
    if (waiting.length === 0) return "Nothing is waiting on a person.";
    return `**${waiting[0].name}** is the file to pick up. ${waiting.length} members have an open request or withdrawal.`;
  }
  return `**${lead.name}** holds the largest pot at ${potLabel(lead)}. ${book.openWithdrawals} withdrawals are still moving and ${book.openRequests} requests have no reply.`;
}
