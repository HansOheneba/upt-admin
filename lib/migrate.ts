import {
  BOOK_VERSION,
  MANAGEMENT_STAFF,
  type Book,
  type Membership,
  type Role,
  type Staff,
} from "@/lib/domain";

const ROLES: Role[] = [
  "management",
  "team_lead",
  "relationship_manager",
  "finance",
  "review",
];

function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}

function mapRole(role: string): Role | null {
  if (role === "supervisor") return "team_lead";
  if (role === "member_services") return "relationship_manager";
  if (isRole(role)) return role;
  return null;
}

function rows(value: unknown) {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

export function migrateBook(value: unknown): Book | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    raw.version === BOOK_VERSION &&
    Array.isArray(raw.memberships) &&
    Array.isArray(raw.schemes) &&
    Array.isArray(raw.members)
  ) {
    return raw as Book;
  }
  if (!Array.isArray(raw.members) || !Array.isArray(raw.staff)) return null;

  const legacyStaff = rows(raw.staff);
  const legacyMembers = rows(raw.members);
  const formerLead = legacyStaff.find(
    (person) =>
      person.active !== false &&
      Array.isArray(person.roles) &&
      person.roles.includes("supervisor"),
  );
  const leadId = typeof formerLead?.id === "string" ? formerLead.id : null;
  const now = new Date().toISOString();
  const schemeName =
    legacyMembers
      .map((member) => member.scheme)
      .find((scheme) => typeof scheme === "string" && scheme.trim()) ?? "My Own Pension";

  const staff: Staff[] = legacyStaff.map((person) => {
    const roles = Array.isArray(person.roles)
      ? [
          ...new Set(
            person.roles
              .map((role) => mapRole(String(role)))
              .filter((role): role is Role => role !== null),
          ),
        ]
      : [];
    const reports = roles.includes("relationship_manager");
    return {
      id: String(person.id),
      name: String(person.name ?? ""),
      email: String(person.email ?? ""),
      roles,
      active: person.active !== false,
      leadId: reports ? leadId : null,
    };
  });
  if (!staff.some((person) => person.active && person.roles.includes("management"))) {
    staff.push({ ...MANAGEMENT_STAFF });
  }

  const scheme = {
    id: "sch-mop",
    name: String(schemeName),
    code: "MOP",
    status: "open" as const,
    leadId,
    createdAt: now,
    updatedAt: now,
  };

  const memberships: Membership[] = legacyMembers.map((member) => ({
    id: `memship-${String(member.id)}`,
    memberId: String(member.id),
    schemeId: scheme.id,
    membershipNumber: String(member.memberNumber ?? ""),
    status: member.status === "closed" ? "closed" : "active",
    effectiveFrom: String(member.memberSince ?? now.slice(0, 10)),
    effectiveTo: null,
    companyId: null,
    relationshipManagerId:
      typeof member.relationshipManagerId === "string" ? member.relationshipManagerId : null,
    monthlyContribution: Number(member.monthlyContribution ?? 0),
    retirementAge: Number(member.retirementAge ?? 60),
    targetPot: Number(member.targetPot ?? 0),
  }));
  const membershipByMember = new Map(
    memberships.map((membership) => [membership.memberId, membership.id]),
  );

  const assignedManagers = [
    ...new Set(
      memberships
        .map((membership) => membership.relationshipManagerId)
        .filter((id): id is string => !!id),
    ),
  ];

  return {
    version: BOOK_VERSION,
    staff,
    schemes: [scheme],
    schemeAssignments: assignedManagers.map((relationshipManagerId) => ({
      id: `sra-${relationshipManagerId}`,
      schemeId: scheme.id,
      relationshipManagerId,
      assignedAt: now,
      assignedBy: leadId ?? MANAGEMENT_STAFF.id,
    })),
    companies: [],
    companySchemes: [],
    employments: [],
    members: legacyMembers.map((member) => ({
      id: String(member.id),
      firstName: String(member.firstName ?? ""),
      lastName: String(member.lastName ?? ""),
      displayName: String(member.displayName ?? ""),
      email: String(member.email ?? ""),
      mobile: String(member.mobile ?? ""),
      dateOfBirth: String(member.dateOfBirth ?? ""),
      gender: String(member.gender ?? ""),
      title: String(member.title ?? ""),
      profession: String(member.profession ?? ""),
      location: String(member.location ?? ""),
      nextOfKin: String(member.nextOfKin ?? ""),
      nextOfKinContact: String(member.nextOfKinContact ?? ""),
    })),
    memberships,
    unitPrices: rows(raw.unitPrices).map((price) => ({
      id: String(price.id),
      schemeId: typeof price.schemeId === "string" ? price.schemeId : scheme.id,
      date: String(price.date ?? ""),
      price: Number(price.price ?? 0),
      setBy: String(price.setBy ?? ""),
      setAt: String(price.setAt ?? now),
    })),
    contributions: rows(raw.contributions).map((row) => ({
      id: String(row.id),
      memberId: String(row.memberId ?? ""),
      membershipId:
        typeof row.membershipId === "string"
          ? row.membershipId
          : (membershipByMember.get(String(row.memberId ?? "")) ?? ""),
      date: String(row.date ?? ""),
      amount: Number(row.amount ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      units: Number(row.units ?? 0),
      channel: "mtn_momo" as const,
      postedBy: String(row.postedBy ?? ""),
      postedAt: String(row.postedAt ?? now),
      reversalOf: typeof row.reversalOf === "string" ? row.reversalOf : null,
      paymentId: typeof row.paymentId === "string" ? row.paymentId : null,
    })),
    payments: rows(raw.payments).map((row) => ({
      id: String(row.id),
      receivedAt: String(row.receivedAt ?? ""),
      amount: Number(row.amount ?? 0),
      mobile: String(row.mobile ?? ""),
      reference: String(row.reference ?? ""),
      payerName: String(row.payerName ?? ""),
    })),
    withdrawals: rows(raw.withdrawals).map((row) => ({
      id: String(row.id),
      memberId: String(row.memberId ?? ""),
      membershipId:
        typeof row.membershipId === "string"
          ? row.membershipId
          : (membershipByMember.get(String(row.memberId ?? "")) ?? ""),
      submittedAt: String(row.submittedAt ?? ""),
      amount: Number(row.amount ?? 0),
      reason: String(row.reason ?? ""),
      destinationType: row.destinationType === "bank" ? "bank" as const : "momo" as const,
      destination: String(row.destination ?? ""),
      status: (row.status ?? "received") as Book["withdrawals"][number]["status"],
      name: String(row.name ?? ""),
      mobile: String(row.mobile ?? ""),
      profession: String(row.profession ?? ""),
      location: String(row.location ?? ""),
      nextOfKin: String(row.nextOfKin ?? ""),
      nextOfKinContact: String(row.nextOfKinContact ?? ""),
      approvedBy: typeof row.approvedBy === "string" ? row.approvedBy : null,
      paidBy: typeof row.paidBy === "string" ? row.paidBy : null,
      paidAt: typeof row.paidAt === "string" ? row.paidAt : null,
      paymentReference: typeof row.paymentReference === "string" ? row.paymentReference : null,
      unitsTaken: typeof row.unitsTaken === "number" ? row.unitsTaken : null,
      unitPriceUsed: typeof row.unitPriceUsed === "number" ? row.unitPriceUsed : null,
      declineReason: typeof row.declineReason === "string" ? row.declineReason : null,
      rmReadyAt: typeof row.rmReadyAt === "string" ? row.rmReadyAt : null,
      escalatedAt: typeof row.escalatedAt === "string" ? row.escalatedAt : null,
      escalatedBy: typeof row.escalatedBy === "string" ? row.escalatedBy : null,
      escalationNote: typeof row.escalationNote === "string" ? row.escalationNote : null,
      events: Array.isArray(row.events)
        ? (row.events as Book["withdrawals"][number]["events"])
        : [],
    })),
    requests: rows(raw.requests).map((row) => ({
      id: String(row.id),
      memberId: String(row.memberId ?? ""),
      membershipId:
        typeof row.membershipId === "string"
          ? row.membershipId
          : (membershipByMember.get(String(row.memberId ?? "")) ?? ""),
      subject: String(row.subject ?? ""),
      body: String(row.body ?? ""),
      createdAt: String(row.createdAt ?? ""),
      channel: (row.channel === "sms" || row.channel === "email" ? row.channel : "app") as
        | "app"
        | "sms"
        | "email",
      status: row.status === "replied" ? "replied" as const : "open" as const,
      reply: typeof row.reply === "string" ? row.reply : null,
      repliedAt: typeof row.repliedAt === "string" ? row.repliedAt : null,
      repliedBy: typeof row.repliedBy === "string" ? row.repliedBy : null,
    })),
    assets: (raw.assets as Book["assets"]) ?? [],
    properties: (raw.properties as Book["properties"]) ?? [],
    goals: (raw.goals as Book["goals"]) ?? [],
    cashFlow: (raw.cashFlow as Book["cashFlow"]) ?? [],
    liabilities: (raw.liabilities as Book["liabilities"]) ?? [],
    insurance: (raw.insurance as Book["insurance"]) ?? [],
    retirement: (raw.retirement as Book["retirement"]) ?? [],
    risk: (raw.risk as Book["risk"]) ?? [],
    emergency: (raw.emergency as Book["emergency"]) ?? [],
    appointments: (raw.appointments as Book["appointments"]) ?? [],
    sessions: (raw.sessions as Book["sessions"]) ?? [],
    tasks: (raw.tasks as Book["tasks"]) ?? [],
    messages: (raw.messages as Book["messages"]) ?? [],
    documents: rows(raw.documents).map((row) => ({
      id: String(row.id),
      memberId: String(row.memberId ?? ""),
      membershipId: typeof row.membershipId === "string" ? row.membershipId : null,
      name: String(row.name ?? ""),
      tag: (row.tag ?? "other") as Book["documents"][number]["tag"],
      uploadedBy: row.uploadedBy === "member" ? "member" as const : "staff" as const,
      staffId: typeof row.staffId === "string" ? row.staffId : null,
      uploadedAt: String(row.uploadedAt ?? now),
    })),
    audit: rows(raw.audit).map((row) => ({
      id: String(row.id),
      at: String(row.at ?? now),
      staffId: String(row.staffId ?? ""),
      staffName: String(row.staffName ?? ""),
      memberId: typeof row.memberId === "string" ? row.memberId : null,
      schemeId: typeof row.schemeId === "string" ? row.schemeId : null,
      action: String(row.action ?? ""),
      field: String(row.field ?? ""),
      previousValue: String(row.previousValue ?? ""),
      newValue: String(row.newValue ?? ""),
      summary: String(row.summary ?? ""),
    })),
  };
}
