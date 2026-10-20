"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  addContribution,
  addStaff,
  addTask,
  approveWithdrawal,
  closeMember,
  completePayment,
  completeTask,
  correctMember,
  declineWithdrawal,
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
  setUnitPrice,
  startReview,
  uploadDocument,
  type ActionResult,
} from "@/lib/actions";
import {
  canAdvise,
  canCorrectMember,
  canPostMoney,
  canReviewWithdrawal,
  canSeeArea,
  isSupervisor,
  visibleMembers,
  type Book,
  type DocumentTag,
  type Member,
  type Role,
  type Staff,
} from "@/lib/domain";
import {
  getClientBook,
  getClientSession,
  getServerBook,
  getServerSession,
  subscribeBook,
  subscribeSession,
  writeBook,
  writeSession,
} from "@/lib/storage";

type RecordsValue = {
  ready: boolean;
  staff: Staff | null;
  book: Book;
  members: Member[];
  notice: string | null;
  clearNotice: () => void;
  signIn: (email: string) => string | null;
  signOut: () => void;
  canRegister: boolean;
  canCorrect: boolean;
  canFinance: boolean;
  canReview: boolean;
  canSupervise: boolean;
  canSee: (area: Parameters<typeof canSeeArea>[1]) => boolean;
  canAdviseMember: (member: Member) => boolean;
  registerMember: (input: Parameters<typeof registerMember>[2]) => boolean;
  correctMember: (memberId: string, patch: Partial<Member>) => boolean;
  closeMember: (memberId: string) => boolean;
  setUnitPrice: (input: { date: string; price: number }) => boolean;
  postPayment: (paymentId: string, memberId: string) => boolean;
  addContribution: (input: { memberId: string; date: string; amount: number }) => boolean;
  reverseContribution: (contributionId: string) => boolean;
  startReview: (withdrawalId: string) => boolean;
  approveWithdrawal: (withdrawalId: string, note: string) => boolean;
  returnWithdrawal: (withdrawalId: string, reason: string) => boolean;
  completePayment: (
    withdrawalId: string,
    input: { reference: string; paidAt: string },
  ) => boolean;
  declineWithdrawal: (withdrawalId: string, reason: string) => boolean;
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
  addStaff: (input: { name: string; email: string; roles: Role[] }) => boolean;
  removeStaff: (staffId: string) => boolean;
};

const RecordsContext = createContext<RecordsValue | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const book = useSyncExternalStore(subscribeBook, getClientBook, getServerBook);
  const staffId = useSyncExternalStore(subscribeSession, getClientSession, getServerSession);
  const hydrated = useSyncExternalStore(subscribeSession, () => true, () => false);
  const [notice, setNotice] = useState<string | null>(null);
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
    const members = staff ? visibleMembers(book, staff) : [];
    return {
      ready: hydrated,
      staff,
      book,
      members,
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
      canRegister: staff ? canCorrectMember(staff) : false,
      canCorrect: staff ? canCorrectMember(staff) : false,
      canFinance: staff ? canPostMoney(staff) : false,
      canReview: staff ? canReviewWithdrawal(staff) : false,
      canSupervise: staff ? isSupervisor(staff) : false,
      canSee: (area) => (staff ? canSeeArea(staff, area) : false),
      canAdviseMember: (member) => (staff ? canAdvise(staff, member) : false),
      registerMember: (input) =>
        guard(!!staff && canCorrectMember(staff), () => registerMember(book, staff!, input)),
      correctMember: (memberId, patch) =>
        guard(!!staff && canCorrectMember(staff), () => correctMember(book, staff!, memberId, patch)),
      closeMember: (memberId) =>
        guard(!!staff && canCorrectMember(staff), () => closeMember(book, staff!, memberId)),
      setUnitPrice: (input) =>
        guard(!!staff && canPostMoney(staff), () => setUnitPrice(book, staff!, input)),
      postPayment: (paymentId, memberId) =>
        guard(!!staff && canPostMoney(staff), () => postPayment(book, staff!, paymentId, memberId)),
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
      replyToRequest: (requestId, reply) =>
        guard(!!staff && canCorrectMember(staff), () =>
          replyToRequest(book, staff!, requestId, reply),
        ),
      setAppointmentStatus: (appointmentId, status, at) => {
        const appointment = book.appointments.find((item) => item.id === appointmentId);
        const member = book.members.find((item) => item.id === appointment?.memberId);
        return guard(!!staff && !!member && canAdvise(staff, member), () =>
          setAppointmentStatus(book, staff!, appointmentId, status, at),
        );
      },
      publishSession: (input) => {
        const member = book.members.find((item) => item.id === input.memberId);
        return guard(!!staff && !!member && canAdvise(staff, member), () =>
          publishSession(book, staff!, input),
        );
      },
      addTask: (input) => {
        const member = book.members.find((item) => item.id === input.memberId);
        return guard(!!staff && !!member && canAdvise(staff, member), () =>
          addTask(book, staff!, input),
        );
      },
      completeTask: (taskId) => {
        const task = book.tasks.find((item) => item.id === taskId);
        const member = book.members.find((item) => item.id === task?.memberId);
        return guard(!!staff && !!member && canAdvise(staff, member), () =>
          completeTask(book, staff!, taskId),
        );
      },
      sendMessage: (memberId, body) =>
        guard(
          !!staff && (canCorrectMember(staff) || staff.roles.includes("relationship_manager")),
          () => sendMessage(book, staff!, memberId, body),
        ),
      uploadDocument: (input) =>
        guard(
          !!staff &&
            (canCorrectMember(staff) ||
              staff.roles.includes("relationship_manager") ||
              isSupervisor(staff)),
          () => uploadDocument(book, staff!, input),
        ),
      publishValuation: (propertyId, valuation) => {
        const property = book.properties.find((item) => item.id === propertyId);
        const member = book.members.find((item) => item.id === property?.memberId);
        return guard(!!staff && !!member && canAdvise(staff, member), () =>
          publishValuation(book, staff!, propertyId, valuation),
        );
      },
      addStaff: (input) =>
        guard(!!staff && isSupervisor(staff), () => addStaff(book, staff!, input)),
      removeStaff: (targetId) =>
        guard(!!staff && isSupervisor(staff), () => removeStaff(book, staff!, targetId)),
    };
  }, [apply, book, guard, hydrated, notice, staff, staffId]);

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecords() {
  const value = useContext(RecordsContext);
  if (!value) throw new Error("useRecords must be used in the staff console");
  return value;
}
