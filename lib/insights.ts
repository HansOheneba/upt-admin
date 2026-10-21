import { memberName, type Book, type Member, type WithdrawalStatus } from "@/lib/domain";
import { ghs, todayIso } from "@/lib/format";
import {
  cashFlowSummary,
  contributionMonthStatus,
  currentMonth,
  insuranceFlag,
  personHoldings,
} from "@/lib/pension";

function leadMembership(book: Book, memberId: string) {
  const rows = book.memberships.filter((membership) => membership.memberId === memberId);
  return rows.find((membership) => membership.status === "active") ?? rows[0] ?? null;
}

function insightPosition(book: Book, memberId: string) {
  const holdings = personHoldings(book, memberId);
  return {
    pot: holdings.combinedPot,
    openWithdrawal: holdings.rows.find((row) => row.position.openWithdrawal)?.position.openWithdrawal ?? null,
  };
}

export type ShareRow = {
  label: string;
  amount: number;
  count: number;
};

export type TargetRow = {
  id: string;
  name: string;
  pot: number | null;
  target: number;
  years: number;
};

export type OpenWithdrawalRow = {
  id: string;
  memberId: string;
  name: string;
  amount: number;
  pot: number | null;
  status: WithdrawalStatus;
  reason: string;
  exceedsPot: boolean;
};

export type AttentionRow = {
  id: string;
  name: string;
  reasons: string[];
};

export type Insights = {
  activeCount: number;
  closedCount: number;
  combinedPot: number | null;
  averagePot: number | null;
  largest: { name: string; pot: number; share: number } | null;
  monthReceived: number;
  monthExpected: number;
  contribution: { received: number; partial: number; missing: number };
  openWithdrawalCount: number;
  openWithdrawalAmount: number;
  locations: ShareRow[];
  professions: ShareRow[];
  targets: TargetRow[];
  openWithdrawals: OpenWithdrawalRow[];
  findings: { id: string; text: string }[];
  attention: AttentionRow[];
  planning: PlanningInsights | null;
};

export type PlanningInsights = {
  advised: number;
  onFile: number;
  risk: { conservative: number; moderate: number; aggressive: number; missing: number };
  goalsOffTrack: { id: string; memberId: string; name: string; title: string }[];
  goalsOnTrack: number;
  insuranceOnFile: number;
  insurance: { id: string; memberId: string; name: string; policy: string; flag: "Expired" | "Renewing soon" }[];
  emergencyOnFile: number;
  emergencyShort: { id: string; name: string; covered: number | null; target: number }[];
  retirementOnFile: number;
  retirementUnreachable: { id: string; name: string }[];
  cashDeficit: { id: string; name: string; surplus: number }[];
  noPicture: { id: string; name: string }[];
};

export function shareLabel(part: number, whole: number) {
  if (whole <= 0) return "0%";
  const value = Math.round((part / whole) * 1000) / 10;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function buildInsights(
  book: Book,
  members: Member[],
  adviseIds: Set<string>,
  today = todayIso(),
): Insights {
  const month = currentMonth(new Date(`${today}T00:00:00`));
  const active = members.filter((member) =>
    book.memberships.some((membership) => membership.memberId === member.id && membership.status === "active"),
  );
  const closed = members.filter((member) => !active.some((item) => item.id === member.id));
  const positions = new Map(active.map((member) => [member.id, insightPosition(book, member.id)]));
  const pots = active.map((member) => positions.get(member.id)?.pot ?? null);
  const knownPots = pots.filter((pot): pot is number => pot !== null);
  const combinedPot =
    knownPots.length === 0 ? null : Math.round(knownPots.reduce((sum, pot) => sum + pot, 0) * 100) / 100;
  const averagePot =
    combinedPot === null || knownPots.length === 0
      ? null
      : Math.round((combinedPot / knownPots.length) * 100) / 100;

  const ranked = active
    .map((member) => ({ member, pot: positions.get(member.id)?.pot ?? null }))
    .filter((row): row is { member: Member; pot: number } => row.pot !== null)
    .sort((a, b) => b.pot - a.pot);
  const largest =
    ranked[0] && combinedPot
      ? {
          name: memberName(ranked[0].member),
          pot: ranked[0].pot,
          share: ranked[0].pot / combinedPot,
        }
      : null;

  const contribution = { received: 0, partial: 0, missing: 0 };
  let monthExpected = 0;
  let monthReceived = 0;
  for (const member of active) {
    const membership = leadMembership(book, member.id);
    if (!membership) continue;
    monthExpected += membership.monthlyContribution;
    const status = contributionMonthStatus(membership, book.contributions, month);
    if (status === "received" || status === "partial" || status === "missing") {
      contribution[status] += 1;
    }
    monthReceived += book.contributions
      .filter((row) => row.memberId === member.id && row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0);
  }
  monthExpected = Math.round(monthExpected * 100) / 100;
  monthReceived = Math.round(monthReceived * 100) / 100;

  const locations = groupShares(
    active.map((member) => ({
      label: member.location.trim() || "Not stated",
      amount: positions.get(member.id)?.pot ?? 0,
    })),
  );
  const professions = groupShares(
    active.map((member) => ({
      label: member.profession.trim() || "Not stated",
      amount: positions.get(member.id)?.pot ?? 0,
    })),
  );

  const targets: TargetRow[] = active
    .map((member) => ({
      id: member.id,
      name: memberName(member),
      pot: positions.get(member.id)?.pot ?? null,
      target: leadMembership(book, member.id)?.targetPot ?? 0,
      years: yearsUntil(member, leadMembership(book, member.id)?.retirementAge ?? 60, today),
    }))
    .sort((a, b) => {
      const aShare = a.pot === null || a.target <= 0 ? 1 : a.pot / a.target;
      const bShare = b.pot === null || b.target <= 0 ? 1 : b.pot / b.target;
      return aShare - bShare;
    });

  const openWithdrawals: OpenWithdrawalRow[] = book.withdrawals
    .filter(
      (row) =>
        active.some((member) => member.id === row.memberId) &&
        (row.status === "received" || row.status === "checking" || row.status === "approved"),
    )
    .map((row) => {
      const member = active.find((item) => item.id === row.memberId)!;
      const pot = positions.get(member.id)?.pot ?? null;
      return {
        id: row.id,
        memberId: member.id,
        name: memberName(member),
        amount: row.amount,
        pot,
        status: row.status,
        reason: row.reason,
        exceedsPot: pot !== null && row.amount > pot,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const openWithdrawalAmount =
    Math.round(openWithdrawals.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;

  const planning = planningFor(book, active, adviseIds, today);
  const attention = attentionFor(book, active, positions, adviseIds, planning, month, today);
  const findings = findingsFor({
    largest,
    combinedPot,
    locations,
    contribution,
    openWithdrawals,
    planning,
    activeWithoutManager: active.filter((member) => !leadMembership(book, member.id)?.relationshipManagerId).length,
  });

  return {
    activeCount: active.length,
    closedCount: closed.length,
    combinedPot,
    averagePot,
    largest,
    monthReceived,
    monthExpected,
    contribution,
    openWithdrawalCount: openWithdrawals.length,
    openWithdrawalAmount,
    locations,
    professions,
    targets,
    openWithdrawals,
    findings,
    attention,
    planning,
  };
}

function groupShares(rows: { label: string; amount: number }[]): ShareRow[] {
  const grouped = new Map<string, ShareRow>();
  for (const row of rows) {
    const current = grouped.get(row.label) ?? { label: row.label, amount: 0, count: 0 };
    current.amount = Math.round((current.amount + row.amount) * 100) / 100;
    current.count += 1;
    grouped.set(row.label, current);
  }
  return [...grouped.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function yearsUntil(member: Member, retirementAge: number, today: string) {
  const birth = new Date(`${member.dateOfBirth}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return retirementAge - age;
}

function hasPicture(book: Book, memberId: string) {
  return (
    book.risk.some((row) => row.memberId === memberId) ||
    book.goals.some((row) => row.memberId === memberId) ||
    book.cashFlow.some((row) => row.memberId === memberId) ||
    book.emergency.some((row) => row.memberId === memberId) ||
    book.retirement.some((row) => row.memberId === memberId) ||
    book.insurance.some((row) => row.memberId === memberId) ||
    book.properties.some((row) => row.memberId === memberId) ||
    book.liabilities.some((row) => row.memberId === memberId)
  );
}

function planningFor(
  book: Book,
  active: Member[],
  adviseIds: Set<string>,
  today: string,
): PlanningInsights | null {
  const advised = active.filter((member) => adviseIds.has(member.id));
  if (advised.length === 0) return null;
  const risk = { conservative: 0, moderate: 0, aggressive: 0, missing: 0 };
  const goalsOffTrack: PlanningInsights["goalsOffTrack"] = [];
  let goalsOnTrack = 0;
  const insurance: PlanningInsights["insurance"] = [];
  let insuranceOnFile = 0;
  const emergencyShort: PlanningInsights["emergencyShort"] = [];
  let emergencyOnFile = 0;
  const retirementUnreachable: PlanningInsights["retirementUnreachable"] = [];
  let retirementOnFile = 0;
  const cashDeficit: PlanningInsights["cashDeficit"] = [];
  const noPicture: PlanningInsights["noPicture"] = [];

  for (const member of advised) {
    const name = memberName(member);
    const profile = book.risk.find((row) => row.memberId === member.id);
    if (profile) risk[profile.result] += 1;
    else risk.missing += 1;

    for (const goal of book.goals.filter((row) => row.memberId === member.id)) {
      if (goal.onTrack) goalsOnTrack += 1;
      else goalsOffTrack.push({ id: goal.id, memberId: member.id, name, title: goal.title });
    }

    for (const policy of book.insurance.filter((row) => row.memberId === member.id)) {
      insuranceOnFile += 1;
      const flag = insuranceFlag(policy.renewalDate, policy.active, today);
      if (flag) {
        insurance.push({
          id: policy.id,
          memberId: member.id,
          name,
          policy: policy.policyName,
          flag,
        });
      }
    }

    const emergency = book.emergency.find((row) => row.memberId === member.id);
    if (emergency) {
      emergencyOnFile += 1;
      const flow = cashFlowSummary(book.cashFlow.filter((row) => row.memberId === member.id));
      const covered =
        flow.expenses > 0 ? Math.round((emergency.cashHeld / flow.expenses) * 10) / 10 : null;
      if (covered === null || covered + 0.05 < emergency.targetMonths) {
        emergencyShort.push({
          id: member.id,
          name,
          covered,
          target: emergency.targetMonths,
        });
      }
    }

    const retirement = book.retirement.find((row) => row.memberId === member.id);
    if (retirement) {
      retirementOnFile += 1;
      if (!retirement.reachable) retirementUnreachable.push({ id: member.id, name });
    }

    const flowItems = book.cashFlow.filter((row) => row.memberId === member.id);
    if (flowItems.length > 0) {
      const flow = cashFlowSummary(flowItems);
      if (flow.surplus < 0) cashDeficit.push({ id: member.id, name, surplus: flow.surplus });
    }

    if (!hasPicture(book, member.id)) noPicture.push({ id: member.id, name });
  }

  return {
    advised: advised.length,
    onFile: advised.length - noPicture.length,
    risk,
    goalsOffTrack,
    goalsOnTrack,
    insuranceOnFile,
    insurance,
    emergencyOnFile,
    emergencyShort,
    retirementOnFile,
    retirementUnreachable,
    cashDeficit,
    noPicture,
  };
}

function attentionFor(
  book: Book,
  active: Member[],
  positions: Map<string, ReturnType<typeof insightPosition>>,
  adviseIds: Set<string>,
  planning: PlanningInsights | null,
  month: string,
  today: string,
): AttentionRow[] {
  const rows: AttentionRow[] = [];
  for (const member of active) {
    const name = memberName(member);
    const position = positions.get(member.id);
    const reasons: string[] = [];
    const open = position?.openWithdrawal ?? null;
    if (open && position?.pot !== null && position?.pot !== undefined && open.amount > position.pot) {
      reasons.push(
        `Withdrawal of ${ghs(open.amount)} is above the pot of ${ghs(position.pot)}, so it cannot be paid.`,
      );
    } else if (open) {
      reasons.push(`Open withdrawal of ${ghs(open.amount)} for ${open.reason.toLowerCase()}.`);
    }

    const membership = leadMembership(book, member.id);
    const status = membership
      ? contributionMonthStatus(membership, book.contributions, month)
      : "missing";
    const received = book.contributions
      .filter((row) => row.memberId === member.id && row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0);
    if (status === "missing") {
      reasons.push(`No contribution this month. Monthly amount is ${ghs(membership?.monthlyContribution ?? 0)}.`);
    } else if (status === "partial") {
      reasons.push(
        `This month is ${ghs(received)} of the monthly amount ${ghs(membership?.monthlyContribution ?? 0)}.`,
      );
    }

    if (!membership?.relationshipManagerId) reasons.push("No relationship manager.");

    const openRequests = book.requests.filter(
      (row) => row.memberId === member.id && row.status === "open",
    );
    if (openRequests.length > 0) {
      const oldest = Math.max(...openRequests.map((row) => days(row.createdAt, today)));
      if (oldest > 2) {
        reasons.push(
          openRequests.length === 1
            ? `Request open for ${oldest} days.`
            : `${openRequests.length} requests open, the oldest for ${oldest} days.`,
        );
      }
    }

    if (adviseIds.has(member.id) && planning) {
      if (planning.noPicture.some((row) => row.id === member.id)) {
        reasons.push("No wider picture on file.");
      } else {
        for (const goal of planning.goalsOffTrack.filter((row) => row.memberId === member.id)) {
          reasons.push(`${goal.title} is off track.`);
        }
        for (const policy of planning.insurance.filter((row) => row.memberId === member.id)) {
          reasons.push(
            policy.flag === "Expired"
              ? `${policy.policy} has expired.`
              : `${policy.policy} renews within 30 days.`,
          );
        }
        const emergency = planning.emergencyShort.find((row) => row.id === member.id);
        if (emergency) {
          reasons.push(
            emergency.covered === null
              ? `Emergency cash is on file. The target is ${emergency.target} months.`
              : `Emergency cash covers ${emergency.covered} months. The target is ${emergency.target} months.`,
          );
        }
        if (planning.retirementUnreachable.some((row) => row.id === member.id)) {
          reasons.push("Retirement income on file is not reachable.");
        }
        const deficit = planning.cashDeficit.find((row) => row.id === member.id);
        if (deficit) reasons.push(`Monthly cash flow is short by ${ghs(Math.abs(deficit.surplus))}.`);
        if (!book.risk.some((row) => row.memberId === member.id)) {
          reasons.push("No risk profile on file.");
        }
      }
    }

    if (reasons.length > 0) rows.push({ id: member.id, name, reasons });
  }
  return rows.sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));
}

function findingsFor(input: {
  largest: Insights["largest"];
  combinedPot: number | null;
  locations: ShareRow[];
  contribution: Insights["contribution"];
  openWithdrawals: OpenWithdrawalRow[];
  planning: PlanningInsights | null;
  activeWithoutManager: number;
}): Insights["findings"] {
  const findings: Insights["findings"] = [];
  const push = (id: string, text: string) => {
    if (findings.length < 5) findings.push({ id, text });
  };
  const overPot = input.openWithdrawals.filter((row) => row.exceedsPot);
  if (overPot.length === 1) {
    push("over-pot", `${overPot[0].name}'s withdrawal is above the pot, so it cannot be paid.`);
  } else if (overPot.length > 1) {
    push("over-pot", `${overPot.length} withdrawals are above the pot, so they cannot be paid.`);
  }
  if (input.contribution.missing === 1) {
    push("missing", "1 active member has no contribution this month.");
  } else if (input.contribution.missing > 1) {
    push("missing", `${input.contribution.missing} active members have no contribution this month.`);
  }
  if (input.contribution.partial === 1) {
    push("partial", "1 contribution this month is short of the monthly amount.");
  } else if (input.contribution.partial > 1) {
    push("partial", `${input.contribution.partial} contributions this month are short of the monthly amount.`);
  }
  if (input.largest && input.largest.share >= 0.25 && input.combinedPot !== null) {
    push(
      "concentration",
      `${input.largest.name} holds ${shareLabel(input.largest.pot, input.combinedPot)} of the pot on this list.`,
    );
  }
  const planningLine = planningFinding(input.planning);
  if (planningLine) push(planningLine.id, planningLine.text);
  if (input.activeWithoutManager === 1) {
    push("no-rm", "1 active member has no relationship manager.");
  } else if (input.activeWithoutManager > 1) {
    push("no-rm", `${input.activeWithoutManager} active members have no relationship manager.`);
  }
  const topLocation = input.locations[0];
  const locationTotal = input.locations.reduce((sum, row) => sum + row.amount, 0);
  if (topLocation && locationTotal > 0 && input.locations.length > 1 && findings.length < 5) {
    push(
      "location",
      `${topLocation.label} holds ${shareLabel(topLocation.amount, locationTotal)} of the pot, across ${topLocation.count} ${topLocation.count === 1 ? "member" : "members"}.`,
    );
  }
  return findings;
}

function planningFinding(planning: PlanningInsights | null) {
  if (!planning) return null;
  if (planning.retirementUnreachable.length === 1) {
    return {
      id: "retirement",
      text: `${planning.retirementUnreachable[0].name}'s retirement income on file is not reachable.`,
    };
  }
  if (planning.retirementUnreachable.length > 1) {
    return {
      id: "retirement",
      text: `${planning.retirementUnreachable.length} retirement plans on file are not reachable.`,
    };
  }
  const expired = planning.insurance.filter((row) => row.flag === "Expired").length;
  if (expired === 1) return { id: "insurance-expired", text: "1 policy on file has expired." };
  if (expired > 1) return { id: "insurance-expired", text: `${expired} policies on file have expired.` };
  const renewing = planning.insurance.filter((row) => row.flag === "Renewing soon").length;
  if (renewing === 1) return { id: "insurance-renewing", text: "1 policy renews within 30 days." };
  if (renewing > 1) {
    return { id: "insurance-renewing", text: `${renewing} policies renew within 30 days.` };
  }
  if (planning.noPicture.length === 1) {
    return { id: "no-picture", text: "1 advised member has no wider picture on file." };
  }
  if (planning.noPicture.length > 1) {
    return {
      id: "no-picture",
      text: `${planning.noPicture.length} advised members have no wider picture on file.`,
    };
  }
  return null;
}

function days(iso: string, today: string) {
  const start = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const end = new Date(`${today}T00:00:00`);
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.max(0, Math.round((end.getTime() - from.getTime()) / 86_400_000));
}
