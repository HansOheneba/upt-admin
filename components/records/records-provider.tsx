"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  addCompany,
  addContribution,
  addStaff,
  addTask,
  approveWithdrawal,
  assignCompanyToScheme,
  closeMembership,
  completePayment,
  completeTask,
  confirmEnrolment,
  correctMember,
  linkEmployment,
  createScheme,
  declineWithdrawal,
  endCompanyScheme,
  endEmployment,
  escalateWithdrawal,
  markWithdrawalReady,
  postPayment,
  publishSession,
  publishValuation,
  registerMember,
  removeStaff,
  replyToRequest,
  returnWithdrawal,
  reverseContribution,
  sendMessage,
  setAppointmentStatus,
  setCompanyManager,
  setReportingLine,
  setSchemeManagers,
  setUnitPrice,
  startReview,
  updateScheme,
  uploadDocument,
  type ActionResult,
} from "@/lib/actions";
import {
  canAdministerStaff,
  canAdvise,
  canCreateScheme,
  canManageCompany,
  canMaintainMember,
  canPostMoney,
  canRegisterMember,
  canReviewWithdrawal,
  canSeeArea,
  isManagement,
  resolveWorkingScheme,
  schemesForStaff,
  visibleMemberships,
  type Book,
  type DocumentTag,
  type Member,
  type Membership,
  type Role,
  type Scheme,
  type Staff,
} from "@/lib/domain";
import {
  getClientBook,
  getClientScheme,
  getClientSession,
  getServerBook,
  getServerScheme,
  getServerSession,
  subscribeBook,
  subscribeScheme,
  subscribeSession,
  writeBook,
  writeSession,
  writeWorkingScheme,
} from "@/lib/storage";

type RecordsValue = {
  ready: boolean;
  staff: Staff | null;
  book: Book;
  members: Member[];
  memberships: Membership[];
  schemes: Scheme[];
  schemeId: string;
  setScheme: (schemeId: string) => void;
  notice: string | null;
  clearNotice: () => void;
  signIn: (email: string) => string | null;
  signOut: () => void;
  canRegister: boolean;
  canMaintain: (memberId: string) => boolean;
  canFinance: boolean;
  canReview: boolean;
  canManageSchemes: boolean;
  canAdminister: boolean;
  canSee: (area: Parameters<typeof canSeeArea>[1]) => boolean;
  canAdviseMember: (member: Member) => boolean;
  registerMember: (input: Parameters<typeof registerMember>[2]) => boolean;
  correctMember: (memberId: string, patch: Partial<Member>) => boolean;
  closeMembership: (membershipId: string) => boolean;
  setUnitPrice: (input: { schemeId: string; date: string; price: number }) => boolean;
  postPayment: (paymentId: string, membershipId: string) => boolean;
  addContribution: (input: { membershipId: string; date: string; amount: number }) => boolean;
  reverseContribution: (contributionId: string) => boolean;
  startReview: (withdrawalId: string) => boolean;
  approveWithdrawal: (withdrawalId: string, note: string) => boolean;
  returnWithdrawal: (withdrawalId: string, reason: string) => boolean;
  completePayment: (
    withdrawalId: string,
    input: { reference: string; paidAt: string },
  ) => boolean;
  declineWithdrawal: (withdrawalId: string, reason: string) => boolean;
  markWithdrawalReady: (withdrawalId: string) => boolean;
  escalateWithdrawal: (withdrawalId: string, note: string) => boolean;
  replyToRequest: (requestId: string, reply: string) => boolean;
  setAppointmentStatus: (
    appointmentId: string,
    status: "confirmed" | "cancelled",
    at?: string,
  ) => boolean;
  publishSession: (input: Parameters<typeof publishSession>[2]) => boolean;
  addTask: (input: Parameters<typeof addTask>[2]) => boolean;
  completeTask: (taskId: string) => boolean;
  sendMessage: (memberId: string, body: string) => boolean;
  uploadDocument: (input: {
    memberId: string;
    name: string;
    tag: DocumentTag;
  }) => boolean;
  publishValuation: (propertyId: string, valuation: number) => boolean;
  addStaff: (input: { name: string; email: string; roles: Role[]; leadId?: string | null }) => boolean;
  removeStaff: (staffId: string) => boolean;
  createScheme: (input: { name: string; code: string; leadId?: string | null }) => boolean;
  updateScheme: (
    schemeId: string,
    input: { name?: string; status?: "open" | "closed" },
  ) => boolean;
  setSchemeManagers: (schemeId: string, relationshipManagerIds: string[]) => boolean;
  addCompany: (input: {
    name: string;
    reference: string;
    contactName?: string;
    contactEmail?: string;
    contactMobile?: string;
  }) => boolean;
  assignCompanyToScheme: (input: {
    companyId: string;
    schemeId: string;
    effectiveFrom: string;
  }) => boolean;
  endCompanyScheme: (assignmentId: string) => boolean;
  confirmEnrolment: (input: Parameters<typeof confirmEnrolment>[2]) => boolean;
  linkEmployment: (input: { memberId: string; companyId: string; effectiveFrom?: string }) => boolean;
  endEmployment: (employmentId: string) => boolean;
  setCompanyManager: (companyId: string, relationshipManagerId: string | null) => boolean;
  setReportingLine: (staffId: string, leadId: string) => boolean;
};

const RecordsContext = createContext<RecordsValue | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const book = useSyncExternalStore(subscribeBook, getClientBook, getServerBook);
  const staffId = useSyncExternalStore(subscribeSession, getClientSession, getServerSession);
  const savedScheme = useSyncExternalStore(subscribeScheme, getClientScheme, getServerScheme);
  const hydrated = useSyncExternalStore(subscribeSession, () => true, () => false);
  const [notice, setNotice] = useState<string | null>(null);
  const posting = useRef(new Set<string>());
  const staff = book.staff.find((item) => item.id === staffId && item.active) ?? null;

  const apply = useCallback((result: ActionResult) => {
    if ("error" in result) {
      setNotice(result.error);
      return false;
    }
    setNotice(null);
    writeBook(result.book);
    return true;
  }, []);

  const guard = useCallback(
    (allowed: boolean, result: () => ActionResult) => {
      if (!staff || !allowed) {
        setNotice("You can view this. Your role cannot change it.");
        return false;
      }
      return apply(result());
    },
    [apply, staff],
  );

  const value = useMemo<RecordsValue>(() => {
    const schemes = staff ? schemesForStaff(book, staff) : [];
    const schemeId = resolveWorkingScheme(schemes, savedScheme);
    const allowed = staff ? visibleMemberships(book, staff) : [];
    const memberships =
      schemeId === "all" ? allowed : allowed.filter((membership) => membership.schemeId === schemeId);
    const memberIds = new Set(memberships.map((membership) => membership.memberId));
    const members = book.members.filter((member) => memberIds.has(member.id));
    return {
      ready: hydrated,
      staff,
      book,
      members,
      memberships,
      schemes,
      schemeId,
      setScheme: (next) => {
        if (next !== "all" && !schemes.some((scheme) => scheme.id === next)) {
          setNotice("That scheme is outside your authority.");
          return;
        }
        writeWorkingScheme(resolveWorkingScheme(schemes, next));
      },
      notice,
      clearNotice: () => setNotice(null),
      signIn: (email) => {
        const person = book.staff.find(
          (item) => item.active && item.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (!person) return "That work email is not on the staff list.";
        writeSession(person.id);
        return null;
      },
      signOut: () => {
        writeSession(null);
      },
      canRegister: staff ? canRegisterMember(staff) : false,
      canMaintain: (memberId) => (staff ? canMaintainMember(book, staff, memberId) : false),
      canFinance: staff ? canPostMoney(staff) : false,
      canReview: staff ? canReviewWithdrawal(staff) : false,
      canManageSchemes: staff ? canCreateScheme(staff) : false,
      canAdminister: staff ? canAdministerStaff(staff) : false,
      canSee: (area) => (staff ? canSeeArea(staff, area) : false),
      canAdviseMember: (member) => (staff ? canAdvise(book, staff, member) : false),
      registerMember: (input) =>
        guard(!!staff && canRegisterMember(staff), () => registerMember(book, staff!, input)),
      correctMember: (memberId, patch) =>
        guard(!!staff && canMaintainMember(book, staff!, memberId), () =>
          correctMember(book, staff!, memberId, patch),
        ),
      closeMembership: (membershipId) =>
        guard(!!staff, () => closeMembership(book, staff!, membershipId)),
      setUnitPrice: (input) =>
        guard(!!staff && canPostMoney(staff), () => setUnitPrice(book, staff!, input)),
      postPayment: (paymentId, membershipId) => {
        if (posting.current.has(paymentId)) {
          setNotice("This payment is already being posted.");
          return false;
        }
        posting.current.add(paymentId);
        try {
          return guard(!!staff && canPostMoney(staff), () =>
            postPayment(book, staff!, paymentId, membershipId),
          );
        } finally {
          posting.current.delete(paymentId);
        }
      },
      addContribution: (input) =>
        guard(!!staff && canPostMoney(staff), () => addContribution(book, staff!, input)),
      reverseContribution: (contributionId) =>
        guard(!!staff && canPostMoney(staff), () =>
          reverseContribution(book, staff!, contributionId),
        ),
      startReview: (withdrawalId) =>
        guard(!!staff && canReviewWithdrawal(staff), () =>
          startReview(book, staff!, withdrawalId),
        ),
      approveWithdrawal: (withdrawalId, note) =>
        guard(!!staff && canReviewWithdrawal(staff), () =>
          approveWithdrawal(book, staff!, withdrawalId, note),
        ),
      returnWithdrawal: (withdrawalId, reason) =>
        guard(!!staff && canReviewWithdrawal(staff), () =>
          returnWithdrawal(book, staff!, withdrawalId, reason),
        ),
      completePayment: (withdrawalId, input) =>
        guard(!!staff && canPostMoney(staff), () =>
          completePayment(book, staff!, withdrawalId, input),
        ),
      declineWithdrawal: (withdrawalId, reason) =>
        guard(!!staff && canReviewWithdrawal(staff), () =>
          declineWithdrawal(book, staff!, withdrawalId, reason),
        ),
      markWithdrawalReady: (withdrawalId) =>
        guard(!!staff, () => markWithdrawalReady(book, staff!, withdrawalId)),
      escalateWithdrawal: (withdrawalId, note) =>
        guard(!!staff, () => escalateWithdrawal(book, staff!, withdrawalId, note)),
      replyToRequest: (requestId, reply) => {
        const request = book.requests.find((item) => item.id === requestId);
        return guard(
          !!staff && !!request && canMaintainMember(book, staff, request.memberId),
          () => replyToRequest(book, staff!, requestId, reply),
        );
      },
      setAppointmentStatus: (appointmentId, status, at) => {
        const appointment = book.appointments.find((item) => item.id === appointmentId);
        const member = book.members.find((item) => item.id === appointment?.memberId);
        return guard(!!staff && !!member && canAdvise(book, staff, member), () =>
          setAppointmentStatus(book, staff!, appointmentId, status, at),
        );
      },
      publishSession: (input) => {
        const member = book.members.find((item) => item.id === input.memberId);
        return guard(!!staff && !!member && canAdvise(book, staff, member), () =>
          publishSession(book, staff!, input),
        );
      },
      addTask: (input) => {
        const member = book.members.find((item) => item.id === input.memberId);
        return guard(!!staff && !!member && canAdvise(book, staff, member), () =>
          addTask(book, staff!, input),
        );
      },
      completeTask: (taskId) => {
        const task = book.tasks.find((item) => item.id === taskId);
        const member = book.members.find((item) => item.id === task?.memberId);
        return guard(!!staff && !!member && canAdvise(book, staff, member), () =>
          completeTask(book, staff!, taskId),
        );
      },
      sendMessage: (memberId, body) =>
        guard(!!staff && canMaintainMember(book, staff, memberId), () =>
          sendMessage(book, staff!, memberId, body),
        ),
      uploadDocument: (input) =>
        guard(!!staff && canMaintainMember(book, staff, input.memberId), () =>
          uploadDocument(book, staff!, input),
        ),
      publishValuation: (propertyId, valuation) => {
        const property = book.properties.find((item) => item.id === propertyId);
        const member = book.members.find((item) => item.id === property?.memberId);
        return guard(!!staff && !!member && canAdvise(book, staff, member), () =>
          publishValuation(book, staff!, propertyId, valuation),
        );
      },
      addStaff: (input) =>
        guard(!!staff && canAdministerStaff(staff), () => addStaff(book, staff!, input)),
      removeStaff: (targetId) =>
        guard(!!staff && canAdministerStaff(staff), () => removeStaff(book, staff!, targetId)),
      createScheme: (input) =>
        guard(!!staff && canCreateScheme(staff), () => createScheme(book, staff!, input)),
      updateScheme: (schemeId, input) =>
        guard(!!staff, () => updateScheme(book, staff!, schemeId, input)),
      setSchemeManagers: (schemeId, relationshipManagerIds) =>
        guard(!!staff, () => setSchemeManagers(book, staff!, schemeId, relationshipManagerIds)),
      addCompany: (input) =>
        guard(!!staff && canCreateScheme(staff), () => addCompany(book, staff!, input)),
      assignCompanyToScheme: (input) =>
        guard(!!staff && canManageCompany(book, staff, input.companyId), () =>
          assignCompanyToScheme(book, staff!, input),
        ),
      endCompanyScheme: (assignmentId) =>
        guard(!!staff, () => endCompanyScheme(book, staff!, assignmentId)),
      confirmEnrolment: (input) => guard(!!staff, () => confirmEnrolment(book, staff!, input)),
      linkEmployment: (input) =>
        guard(!!staff && canManageCompany(book, staff, input.companyId), () =>
          linkEmployment(book, staff!, input),
        ),
      endEmployment: (employmentId) =>
        guard(!!staff, () => endEmployment(book, staff!, employmentId)),
      setCompanyManager: (companyId, relationshipManagerId) =>
        guard(!!staff && canManageCompany(book, staff, companyId), () =>
          setCompanyManager(book, staff!, companyId, relationshipManagerId),
        ),
      setReportingLine: (targetId, leadId) =>
        guard(!!staff && isManagement(staff), () => setReportingLine(book, staff!, targetId, leadId)),
    };
  }, [book, guard, hydrated, notice, savedScheme, staff]);

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecords() {
  const value = useContext(RecordsContext);
  if (!value) throw new Error("useRecords must be used in the staff console");
  return value;
}
