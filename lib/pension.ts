import type {
  Book,
  Contribution,
  Membership,
  UnitPrice,
  Withdrawal,
} from "@/lib/domain";
import { todayIso } from "@/lib/format";

export function unitsFor(amount: number, price: number) {
  if (price <= 0) return 0;
  return Math.round((amount / price) * 100) / 100;
}

export function sortedPrices(prices: UnitPrice[]) {
  return [...prices].sort((a, b) => a.date.localeCompare(b.date) || a.setAt.localeCompare(b.setAt));
}

export function currentUnitPrice(prices: UnitPrice[]) {
  const sorted = sortedPrices(prices);
  return sorted[sorted.length - 1] ?? null;
}

export function priceOn(prices: UnitPrice[], date: string) {
  const day = date.slice(0, 10);
  const applicable = sortedPrices(prices).filter((price) => price.date <= day);
  return applicable[applicable.length - 1] ?? null;
}

export function pricesForScheme(book: Book, schemeId: string) {
  return book.unitPrices.filter((price) => price.schemeId === schemeId);
}

export function membershipContributions(book: Book, membershipId: string) {
  return book.contributions
    .filter((row) => row.membershipId === membershipId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.postedAt.localeCompare(b.postedAt));
}

export function unitsHeld(contributions: Contribution[], withdrawals: Withdrawal[]) {
  const credited = contributions.reduce((sum, row) => sum + row.units, 0);
  const taken = withdrawals
    .filter((row) => row.status === "paid" && row.unitsTaken !== null)
    .reduce((sum, row) => sum + (row.unitsTaken ?? 0), 0);
  return Math.round((credited - taken) * 100) / 100;
}

export function potFor(units: number, price: UnitPrice | null) {
  if (!price || price.price <= 0) return null;
  return Math.round(units * price.price * 100) / 100;
}

export function membershipPosition(book: Book, membershipId: string) {
  const membership = book.memberships.find((item) => item.id === membershipId) ?? null;
  const price = membership ? currentUnitPrice(pricesForScheme(book, membership.schemeId)) : null;
  const contributions = membershipContributions(book, membershipId);
  const withdrawals = book.withdrawals.filter((row) => row.membershipId === membershipId);
  const units = unitsHeld(contributions, withdrawals);
  const contributed = contributions.reduce((sum, row) => sum + row.amount, 0);
  const thisYear = contributions
    .filter((row) => row.date.startsWith(String(new Date().getFullYear())))
    .reduce((sum, row) => sum + row.amount, 0);
  const latest = [...contributions].reverse().find((row) => row.amount > 0) ?? null;
  const openWithdrawal =
    withdrawals.find((row) =>
      row.status === "received" || row.status === "checking" || row.status === "approved",
    ) ?? null;
  return {
    price,
    units,
    pot: potFor(units, price),
    contributed,
    thisYear,
    latest,
    contributions,
    withdrawals,
    openWithdrawal,
    membership,
  };
}

export function personHoldings(book: Book, memberId: string) {
  const rows = book.memberships
    .filter((membership) => membership.memberId === memberId)
    .map((membership) => ({
      membership,
      position: membershipPosition(book, membership.id),
    }));
  const known = rows
    .map((row) => row.position.pot)
    .filter((pot): pot is number => pot !== null);
  const combinedPot =
    known.length === 0 ? null : Math.round(known.reduce((sum, pot) => sum + pot, 0) * 100) / 100;
  return { rows, combinedPot, gaps: rows.length - known.length };
}

export type MonthStatus = "received" | "partial" | "missing" | "closed";

export function contributionMonthStatus(
  membership: Pick<Membership, "id" | "status" | "effectiveFrom" | "monthlyContribution">,
  contributions: Contribution[],
  month: string,
): MonthStatus {
  if (membership.status === "closed") return "closed";
  if (membership.effectiveFrom.slice(0, 7) > month) return "closed";
  const received = contributions
    .filter((row) => row.membershipId === membership.id && row.date.startsWith(month))
    .reduce((sum, row) => sum + row.amount, 0);
  if (membership.monthlyContribution <= 0) return received > 0 ? "received" : "missing";
  if (received <= 0) return "missing";
  if (received + 0.001 < membership.monthlyContribution) return "partial";
  return "received";
}

export function currentMonth(now = new Date()) {
  return todayIso(now).slice(0, 7);
}

export function openWithdrawal(book: Book, memberId: string) {
  return (
    book.withdrawals.find(
      (row) =>
        row.memberId === memberId &&
        (row.status === "received" ||
          row.status === "checking" ||
          row.status === "approved"),
    ) ?? null
  );
}

export function openMembershipWithdrawal(book: Book, membershipId: string) {
  return (
    book.withdrawals.find(
      (row) =>
        row.membershipId === membershipId &&
        (row.status === "received" ||
          row.status === "checking" ||
          row.status === "approved"),
    ) ?? null
  );
}

export function openRequest(book: Book, memberId: string) {
  return book.requests.some(
    (row) => row.memberId === memberId && row.status === "open",
  );
}

export function overdueTasks(book: Book, memberId: string, today = todayIso()) {
  return book.tasks.filter(
    (task) => task.memberId === memberId && !task.done && task.due < today,
  );
}

export function monthsTouched(from: string, to: string, today = todayIso()) {
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00`);
  const cap = new Date(`${today.slice(0, 7)}-01T00:00:00`);
  const months: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && cursor <= cap) {
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    months.push(month);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function periodStart(kind: "month" | "quarter", now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (kind === "month") {
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  }
  const quarterMonth = Math.floor(month / 3) * 3;
  return `${year}-${String(quarterMonth + 1).padStart(2, "0")}-01`;
}

export function inRange(iso: string, from: string, to: string) {
  const day = iso.slice(0, 10);
  return day >= from.slice(0, 10) && day <= to.slice(0, 10);
}

export function channelLabel() {
  return "MTN Mobile Money";
}

export function destinationLabel(type: "momo" | "bank", destination: string) {
  return type === "momo"
    ? `Mobile Money ${destination}`
    : `Bank ${destination}`;
}

export function cashFlowSummary(items: { kind: "income" | "expense"; monthlyAmount: number }[]) {
  const income = items
    .filter((item) => item.kind === "income")
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  const expenses = items
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  const surplus = Math.round((income - expenses) * 100) / 100;
  const savingsRate = income > 0 ? surplus / income : null;
  return { income, expenses, surplus, savingsRate };
}

export function insuranceFlag(renewalDate: string, active: boolean, today = todayIso()) {
  if (!active || renewalDate < today) return "Expired" as const;
  const renewal = new Date(`${renewalDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const days = Math.round((renewal.getTime() - now.getTime()) / 86_400_000);
  if (days <= 30) return "Renewing soon" as const;
  return null;
}

export function schemeValue(book: Book, memberships: Membership[]) {
  let total = 0;
  let gaps = 0;
  let units = 0;
  let valued = 0;
  for (const membership of memberships) {
    const position = membershipPosition(book, membership.id);
    units += position.units;
    if (position.pot === null) gaps += 1;
    else {
      valued += 1;
      total += position.pot;
    }
  }
  return {
    units: Math.round(units * 100) / 100,
    total: valued === 0 ? null : Math.round(total * 100) / 100,
    gaps,
  };
}

export function periodFigures(book: Book, memberships: Membership[], month: string) {
  const ids = new Set(memberships.map((membership) => membership.id));
  const rows = book.contributions.filter(
    (row) => ids.has(row.membershipId) && row.date.startsWith(month),
  );
  const contributions = Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
  const payments = rows.filter((row) => row.amount > 0 && !row.reversalOf);
  const paymentTotal = payments.reduce((sum, row) => sum + row.amount, 0);
  const averagePayment =
    payments.length === 0 ? null : Math.round((paymentTotal / payments.length) * 100) / 100;
  const contributors = new Set(payments.map((row) => row.membershipId));
  const averageMember =
    contributors.size === 0 ? null : Math.round((contributions / contributors.size) * 100) / 100;
  const distributions =
    Math.round(
      book.withdrawals
        .filter(
          (row) =>
            ids.has(row.membershipId) &&
            row.status === "paid" &&
            (row.paidAt ?? "").startsWith(month),
        )
        .reduce((sum, row) => sum + row.amount, 0) * 100,
    ) / 100;
  return { contributions, distributions, averagePayment, averageMember };
}
