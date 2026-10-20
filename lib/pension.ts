import type {
  Book,
  Contribution,
  Member,
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

export function memberContributions(book: Book, memberId: string) {
  return book.contributions
    .filter((row) => row.memberId === memberId)
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

export function memberPosition(book: Book, memberId: string) {
  const price = currentUnitPrice(book.unitPrices);
  const contributions = memberContributions(book, memberId);
  const withdrawals = book.withdrawals.filter((row) => row.memberId === memberId);
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
  };
}

export type MonthStatus = "received" | "partial" | "missing" | "closed";

export function contributionMonthStatus(
  member: Member,
  contributions: Contribution[],
  month: string,
): MonthStatus {
  if (member.status === "closed") return "closed";
  if (member.memberSince.slice(0, 7) > month) return "closed";
  const received = contributions
    .filter((row) => row.memberId === member.id && row.date.startsWith(month))
    .reduce((sum, row) => sum + row.amount, 0);
  if (member.monthlyContribution <= 0) return received > 0 ? "received" : "missing";
  if (received <= 0) return "missing";
  if (received + 0.001 < member.monthlyContribution) return "partial";
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

export function totalUnitsInIssue(book: Book) {
  return Math.round(
    book.members.reduce((sum, member) => sum + memberPosition(book, member.id).units, 0) * 100,
  ) / 100;
}

export function totalPot(book: Book) {
  const price = currentUnitPrice(book.unitPrices);
  if (!price) return null;
  return potFor(totalUnitsInIssue(book), price);
}
