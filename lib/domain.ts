export const SCHEME = "My Own Pension" as const;
export const BOOK_VERSION = 2;
export const BOOK_KEY = "upt.staff.book.v1";
export const SESSION_KEY = "upt.staff.session";

export type Role =
  | "member_services"
  | "finance"
  | "review"
  | "relationship_manager"
  | "supervisor";

export type Staff = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  active: boolean;
};

export type MemberStatus = "active" | "closed";

export type Member = {
  id: string;
  memberNumber: string;
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
  scheme: typeof SCHEME;
  memberSince: string;
  status: MemberStatus;
  monthlyContribution: number;
  retirementAge: number;
  targetPot: number;
  relationshipManagerId: string | null;
};

export type UnitPrice = {
  id: string;
  date: string;
  price: number;
  setBy: string;
  setAt: string;
};

export type Contribution = {
  id: string;
  memberId: string;
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
  submittedAt: string;
  amount: number;
  reason: string;
  destinationType: "momo" | "bank";
  destination: string;
  signatureDataUrl: string;
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
  events: WithdrawalEvent[];
};

export type MemberRequest = {
  id: string;
  memberId: string;
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
  action: string;
  field: string;
  previousValue: string;
  newValue: string;
  summary: string;
};

export type Book = {
  version: number;
  staff: Staff[];
  members: Member[];
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
  member_services: "Member services",
  finance: "Finance",
  review: "Review",
  relationship_manager: "Relationship manager",
  supervisor: "Supervisor",
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
  return staff.roles.includes(role) || staff.roles.includes("supervisor");
}

export function isSupervisor(staff: Staff) {
  return staff.roles.includes("supervisor");
}

export function seesAllMembers(staff: Staff) {
  return staff.roles.some((role) =>
    ["supervisor", "member_services", "finance", "review"].includes(role),
  );
}

export function visibleMembers(book: Book, staff: Staff) {
  if (seesAllMembers(staff)) return book.members;
  return book.members.filter(
    (member) => member.relationshipManagerId === staff.id,
  );
}

export function canSeeMember(staff: Staff, member: Member) {
  return seesAllMembers(staff) || member.relationshipManagerId === staff.id;
}

export type NavArea =
  | "home"
  | "members"
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
    case "withdrawals":
      return any("member_services", "review", "finance", "supervisor");
    case "contributions":
    case "unitPrice":
      return any("finance", "supervisor");
    case "requests":
      return any("member_services", "supervisor");
    case "appointments":
    case "tasks":
    case "messages":
      return any("relationship_manager", "member_services", "supervisor");
    case "documents":
      return any("member_services", "relationship_manager", "supervisor");
    case "monitoring":
    case "audit":
    case "staff":
      return roles.has("supervisor");
    default:
      return false;
  }
}

export function canCorrectMember(staff: Staff) {
  return hasRole(staff, "member_services");
}

export function canPostMoney(staff: Staff) {
  return hasRole(staff, "finance");
}

export function canReviewWithdrawal(staff: Staff) {
  return hasRole(staff, "review");
}

export function canAdvise(staff: Staff, member: Member) {
  return (
    isSupervisor(staff) ||
    (staff.roles.includes("relationship_manager") &&
      member.relationshipManagerId === staff.id)
  );
}
