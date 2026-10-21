export const BOOK_VERSION = 4;
export const BOOK_KEY = "upt.staff.book.v1";
export const SESSION_KEY = "upt.staff.session";
export const SCHEME_KEY = "upt.staff.scheme";

export type Role =
  | "management"
  | "team_lead"
  | "relationship_manager"
  | "finance"
  | "review";

export type Staff = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  active: boolean;
  leadId: string | null;
};

export type SchemeStatus = "open" | "closed";

export type Scheme = {
  id: string;
  name: string;
  code: string;
  status: SchemeStatus;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchemeRmAssignment = {
  id: string;
  schemeId: string;
  relationshipManagerId: string;
  assignedAt: string;
  assignedBy: string;
};

export type Company = {
  id: string;
  name: string;
  reference: string;
  status: "active" | "inactive";
  contactName?: string;
  contactEmail?: string;
  contactMobile?: string;
  relationshipManagerId?: string | null;
  updatedAt?: string;
};

export type CompanySchemeAssignment = {
  id: string;
  companyId: string;
  schemeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "active" | "ended";
};

export type Employment = {
  id: string;
  memberId: string;
  companyId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type MemberStatus = "active" | "closed";

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  title: string;
  profession: string;
  location: string;
  nextOfKin: string;
  nextOfKinContact: string;
};

export type Membership = {
  id: string;
  memberId: string;
  schemeId: string;
  membershipNumber: string;
  status: MemberStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  companyId: string | null;
  relationshipManagerId: string | null;
  monthlyContribution: number;
  retirementAge: number;
  targetPot: number;
};

export type UnitPrice = {
  id: string;
  schemeId: string;
  date: string;
  price: number;
  setBy: string;
  setAt: string;
};

export type Contribution = {
  id: string;
  memberId: string;
  membershipId: string;
  date: string;
  amount: number;
  unitPrice: number;
  units: number;
  channel: "mtn_momo";
  postedBy: string;
  postedAt: string;
  reversalOf: string | null;
  paymentId: string | null;
};

export type UnmatchedPayment = {
  id: string;
  receivedAt: string;
  amount: number;
  mobile: string;
  reference: string;
  payerName: string;
};

export type WithdrawalStatus =
  | "received"
  | "checking"
  | "approved"
  | "paid"
  | "declined";

export type WithdrawalEvent = {
  at: string;
  staffId: string;
  staffName: string;
  action: string;
  note: string;
};

export type Withdrawal = {
  id: string;
  memberId: string;
  membershipId: string;
  submittedAt: string;
  amount: number;
  reason: string;
  destinationType: "momo" | "bank";
  destination: string;
  status: WithdrawalStatus;
  name: string;
  mobile: string;
  profession: string;
  location: string;
  nextOfKin: string;
  nextOfKinContact: string;
  approvedBy: string | null;
  paidBy: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  unitsTaken: number | null;
  unitPriceUsed: number | null;
  declineReason: string | null;
  rmReadyAt: string | null;
  escalatedAt: string | null;
  escalatedBy: string | null;
  escalationNote: string | null;
  events: WithdrawalEvent[];
};

export type MemberRequest = {
  id: string;
  memberId: string;
  membershipId: string;
  subject: string;
  body: string;
  createdAt: string;
  channel: "app" | "sms" | "email";
  status: "open" | "replied";
  reply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
};

export type AssetHolding = {
  id: string;
  memberId: string;
  assetType: string;
  institution: string;
  name: string;
  balance: number;
  currency: string;
  updatedAt: string;
};

export type PropertyFieldSource = {
  field: string;
  source: "member" | "relationship_manager";
  name: string;
};

export type PropertyRecord = {
  id: string;
  memberId: string;
  address: string;
  propertyType: string;
  memberValue: number;
  mortgage: number;
  otherLiens: number;
  occupancy: string;
  insurance: string;
  valuation: number | null;
  valuationBy: string | null;
  fieldSources: PropertyFieldSource[];
};

export type Goal = {
  id: string;
  memberId: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  amountSaved: number;
  monthlyNeeded: number;
  onTrack: boolean;
};

export type CashFlowItem = {
  id: string;
  memberId: string;
  kind: "income" | "expense";
  name: string;
  monthlyAmount: number;
  category: string;
};

export type Liability = {
  id: string;
  memberId: string;
  name: string;
  lender: string;
  type: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  expectedPayoff: string;
};

export type InsurancePolicy = {
  id: string;
  memberId: string;
  provider: string;
  policyName: string;
  policyNumber: string;
  cover: number;
  monthlyPremium: number;
  renewalDate: string;
  beneficiary: string;
  active: boolean;
};

export type RetirementPlan = {
  memberId: string;
  retirementAge: number;
  monthlySavings: number;
  pensionHeld: number;
  desiredMonthlyIncome: number;
  reachable: boolean;
};

export type RiskProfile = {
  memberId: string;
  result: "conservative" | "moderate" | "aggressive";
  completedAt: string;
};

export type EmergencyFund = {
  memberId: string;
  cashHeld: number;
  targetMonths: number;
};

export type Appointment = {
  id: string;
  memberId: string;
  staffId: string;
  type: string;
  at: string;
  durationMinutes: number;
  status: "requested" | "confirmed" | "completed" | "cancelled";
};

export type SessionNote = {
  id: string;
  memberId: string;
  staffId: string;
  title: string;
  assessment: string;
  discussion: string;
  recommendations: string;
  notes: string;
  published: boolean;
  at: string;
};

export type TaskItem = {
  id: string;
  memberId: string;
  title: string;
  owner: "staff" | "member";
  staffId: string | null;
  due: string;
  priority: "low" | "normal" | "high";
  done: boolean;
};

export type MemberMessage = {
  id: string;
  memberId: string;
  from: "member" | "staff";
  staffId: string | null;
  body: string;
  at: string;
};

export type DocumentTag =
  | "identity"
  | "statement"
  | "tax"
  | "contract"
  | "report"
  | "plan"
  | "review"
  | "other";

export type DocumentItem = {
  id: string;
  memberId: string;
  membershipId: string | null;
  name: string;
  tag: DocumentTag;
  uploadedBy: "member" | "staff";
  staffId: string | null;
  uploadedAt: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  staffId: string;
  staffName: string;
  memberId: string | null;
  schemeId: string | null;
  companyId?: string | null;
  action: string;
  field: string;
  previousValue: string;
  newValue: string;
  summary: string;
};

export type Book = {
  version: number;
  staff: Staff[];
  schemes: Scheme[];
  schemeAssignments: SchemeRmAssignment[];
  companies: Company[];
  companySchemes: CompanySchemeAssignment[];
  employments: Employment[];
  members: Member[];
  memberships: Membership[];
  unitPrices: UnitPrice[];
  contributions: Contribution[];
  payments: UnmatchedPayment[];
  withdrawals: Withdrawal[];
  requests: MemberRequest[];
  assets: AssetHolding[];
  properties: PropertyRecord[];
  goals: Goal[];
  cashFlow: CashFlowItem[];
  liabilities: Liability[];
  insurance: InsurancePolicy[];
  retirement: RetirementPlan[];
  risk: RiskProfile[];
  emergency: EmergencyFund[];
  appointments: Appointment[];
  sessions: SessionNote[];
  tasks: TaskItem[];
  messages: MemberMessage[];
  documents: DocumentItem[];
  audit: AuditEntry[];
};

export const ROLE_LABEL: Record<Role, string> = {
  management: "Management",
  team_lead: "Team lead",
  relationship_manager: "Relationship manager",
  finance: "Finance",
  review: "Compliance and audit",
};

export const MANAGEMENT_STAFF: Staff = {
  id: "stf-management",
  name: "Selorm Agbeko",
  email: "selorm.agbeko@upt.com.gh",
  roles: ["management"],
  active: true,
  leadId: null,
};

export const WITHDRAWAL_LABEL: Record<WithdrawalStatus, string> = {
  received: "Received",
  checking: "Under review",
  approved: "Approved",
  paid: "Payment completed",
  declined: "Declined",
};

export const REQUEST_CHANNEL_LABEL = {
  app: "App",
  sms: "SMS",
  email: "Email",
} as const;

export const DOCUMENT_TAGS: DocumentTag[] = [
  "identity",
  "statement",
  "tax",
  "contract",
  "report",
  "plan",
  "review",
  "other",
];

export function memberName(member: Pick<Member, "firstName" | "lastName" | "displayName">) {
  return member.displayName.trim() || `${member.firstName} ${member.lastName}`.trim();
}

export function staffInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "ST";
}

export function hasRole(staff: Staff, role: Role) {
  return staff.roles.includes(role);
}

export function isManagement(staff: Staff) {
  return hasRole(staff, "management");
}

export function isTeamLead(staff: Staff) {
  return hasRole(staff, "team_lead");
}

export function seesOrganisation(staff: Staff) {
  return staff.roles.some((role) => role === "management" || role === "finance" || role === "review");
}

export function schemeById(book: Book, schemeId: string) {
  return book.schemes.find((scheme) => scheme.id === schemeId) ?? null;
}

export function membershipById(book: Book, membershipId: string) {
  return book.memberships.find((membership) => membership.id === membershipId) ?? null;
}

export function membershipsForMember(book: Book, memberId: string) {
  return book.memberships.filter((membership) => membership.memberId === memberId);
}

export function ownedSchemes(book: Book, staff: Staff) {
  return book.schemes.filter((scheme) => scheme.leadId === staff.id);
}

export function assignedSchemeIds(book: Book, staffId: string) {
  return book.schemeAssignments
    .filter((row) => row.relationshipManagerId === staffId)
    .map((row) => row.schemeId);
}

export function schemesForStaff(book: Book, staff: Staff) {
  if (seesOrganisation(staff)) return book.schemes;
  const ids = new Set<string>();
  if (isTeamLead(staff)) {
    for (const scheme of ownedSchemes(book, staff)) ids.add(scheme.id);
  }
  if (hasRole(staff, "relationship_manager")) {
    for (const id of assignedSchemeIds(book, staff.id)) ids.add(id);
  }
  return book.schemes.filter((scheme) => ids.has(scheme.id));
}

export function canAccessScheme(book: Book, staff: Staff, schemeId: string) {
  return schemesForStaff(book, staff).some((scheme) => scheme.id === schemeId);
}

export function visibleMemberships(book: Book, staff: Staff) {
  if (seesOrganisation(staff)) return book.memberships;
  const rows: Membership[] = [];
  const seen = new Set<string>();
  const add = (membership: Membership) => {
    if (seen.has(membership.id)) return;
    seen.add(membership.id);
    rows.push(membership);
  };
  if (isTeamLead(staff)) {
    const owned = new Set(ownedSchemes(book, staff).map((scheme) => scheme.id));
    for (const membership of book.memberships) {
      if (owned.has(membership.schemeId)) add(membership);
    }
  }
  if (hasRole(staff, "relationship_manager")) {
    const assigned = new Set(assignedSchemeIds(book, staff.id));
    for (const membership of book.memberships) {
      if (membership.relationshipManagerId === staff.id && assigned.has(membership.schemeId)) {
        add(membership);
      }
    }
  }
  return rows;
}

export function visibleMembers(book: Book, staff: Staff) {
  const ids = new Set(visibleMemberships(book, staff).map((membership) => membership.memberId));
  return book.members.filter((member) => ids.has(member.id));
}

export function canSeeMember(book: Book, staff: Staff, member: Member) {
  return visibleMembers(book, staff).some((item) => item.id === member.id);
}

export function companiesForStaff(book: Book, staff: Staff) {
  if (seesOrganisation(staff)) return book.companies;
  const ids = new Set<string>();
  if (isTeamLead(staff)) {
    const owned = new Set(ownedSchemes(book, staff).map((scheme) => scheme.id));
    for (const row of book.companySchemes) {
      if (row.status === "active" && owned.has(row.schemeId)) ids.add(row.companyId);
    }
    for (const company of book.companies) {
      const participating = book.companySchemes.some(
        (row) => row.companyId === company.id && row.status === "active",
      );
      if (!participating) ids.add(company.id);
    }
  }
  if (hasRole(staff, "relationship_manager")) {
    for (const company of book.companies) {
      if (company.relationshipManagerId === staff.id) ids.add(company.id);
    }
    for (const membership of visibleMemberships(book, staff)) {
      if (membership.companyId) ids.add(membership.companyId);
    }
  }
  return book.companies.filter((company) => ids.has(company.id));
}

export function canManageCompany(book: Book, staff: Staff, companyId: string) {
  if (!isManagement(staff) && !isTeamLead(staff)) return false;
  return companiesForStaff(book, staff).some((company) => company.id === companyId);
}

export function canMaintainMember(book: Book, staff: Staff, memberId: string) {
  if (!hasRole(staff, "relationship_manager") && !isTeamLead(staff)) return false;
  return visibleMemberships(book, staff).some((membership) => membership.memberId === memberId);
}

export function canRegisterMember(staff: Staff) {
  return hasRole(staff, "relationship_manager");
}

export function canCreateScheme(staff: Staff) {
  return allows(staff, "create_scheme");
}

export function canManageScheme(book: Book, staff: Staff, scheme: Scheme) {
  if (isManagement(staff)) return true;
  return isTeamLead(staff) && scheme.leadId === staff.id;
}

export function canAdministerStaff(staff: Staff) {
  return allows(staff, "administer_staff");
}

export function resolveWorkingScheme(schemes: Scheme[], saved: string | null) {
  if (schemes.length === 0) return "all";
  if (saved === "all" && schemes.length > 1) return "all";
  if (saved && schemes.some((scheme) => scheme.id === saved)) return saved;
  return schemes[0].id;
}

export type NavArea =
  | "home"
  | "members"
  | "companies"
  | "schemes"
  | "withdrawals"
  | "contributions"
  | "unitPrice"
  | "requests"
  | "appointments"
  | "tasks"
  | "messages"
  | "documents"
  | "monitoring"
  | "audit"
  | "staff"
  | "copilot";

export function canSeeArea(staff: Staff, area: NavArea) {
  const roles = new Set(staff.roles);
  const any = (...needed: Role[]) => needed.some((role) => roles.has(role));
  switch (area) {
    case "home":
    case "members":
    case "copilot":
      return true;
    case "schemes":
      return any("team_lead", "management");
    case "companies":
      return any("team_lead", "management", "relationship_manager");
    case "withdrawals":
      return any("relationship_manager", "team_lead", "review", "finance", "management");
    case "contributions":
      return any("finance", "relationship_manager", "team_lead", "management");
    case "unitPrice":
      return any("finance");
    case "requests":
      return any("relationship_manager", "team_lead", "management");
    case "appointments":
    case "tasks":
    case "messages":
      return any("relationship_manager", "team_lead");
    case "documents":
      return any("relationship_manager", "team_lead", "review", "management");
    case "monitoring":
      return any("management", "team_lead", "finance");
    case "audit":
      return allows(staff, "read_audit");
    case "staff":
      return any("management");
    default:
      return false;
  }
}

export type StaffPermission =
  | "post_money"
  | "review_withdrawal"
  | "administer_staff"
  | "create_scheme"
  | "read_audit";

export function allows(staff: Staff, permission: StaffPermission) {
  switch (permission) {
    case "post_money":
      return hasRole(staff, "finance");
    case "review_withdrawal":
      return hasRole(staff, "review");
    case "administer_staff":
      return isManagement(staff);
    case "create_scheme":
      return isManagement(staff) || isTeamLead(staff);
    case "read_audit":
      return isManagement(staff) || hasRole(staff, "review");
  }
}

export function canPostMoney(staff: Staff) {
  return allows(staff, "post_money");
}

export function canReviewWithdrawal(staff: Staff) {
  return allows(staff, "review_withdrawal");
}

export function canAdvise(book: Book, staff: Staff, member: Member) {
  return canMaintainMember(book, staff, member.id);
}
