"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ACTIVE_FUND,
  approvals as approvalSeed,
  fundById,
  members as memberSeed,
  requests as requestSeed,
  withdrawals as withdrawalSeed,
  type Approval,
  type FundBook,
  type Member,
  type MemberRequest,
  type RequestKind,
  type Withdrawal,
} from "@/lib/demo";

export type DialogKind =
  | "member"
  | "request"
  | "withdrawal"
  | "contribution"
  | "memberContribution"
  | "beneficiary";

type MemberInput = {
  name: string;
  dateOfBirth: string;
  ssnit: string;
  email: string;
  phone: string;
  gender: string;
  maritalStatus: string;
  address: string;
  sponsorName: string;
};

type RequestInput = {
  memberId: string;
  kind: RequestKind;
  subject: string;
  channel: string;
};

type WithdrawalInput = {
  memberId: string;
  amount: number;
  reason: string;
  channel: string;
};

type ContributionInput = {
  sponsorName: string;
  period: string;
  amount: number;
};

type MemberContributionInput = {
  employee: number;
  employer: number;
};

type BeneficiaryInput = {
  name: string;
  relationship: string;
  share: string;
};

type RecordsValue = {
  fund: FundBook;
  setFundId: (id: string) => void;
  members: Member[];
  allMembers: Member[];
  allRequests: MemberRequest[];
  requests: MemberRequest[];
  withdrawals: Withdrawal[];
  approvals: Approval[];
  dialog: DialogKind | null;
  dialogMemberId: string | null;
  openDialog: (kind: DialogKind, memberId?: string) => void;
  closeDialog: () => void;
  registerMember: (input: MemberInput) => Member;
  logRequest: (input: RequestInput) => void;
  recordWithdrawal: (input: WithdrawalInput) => void;
  recordContribution: (input: ContributionInput) => void;
  recordMemberContribution: (
    memberId: string,
    input: MemberContributionInput,
  ) => void;
  addBeneficiary: (memberId: string, input: BeneficiaryInput) => void;
  approve: (id: string) => void;
};

const RecordsContext = createContext<RecordsValue | null>(null);

function stamp() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function slug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "member";
}

function nextId(prefix: string, existing: string[]) {
  const numbers = existing.map((id) => {
    const match = id.match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  });
  const next = Math.max(1000, ...numbers) + 1;
  return `${prefix}-${next}`;
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [fundId, setFundId] = useState(ACTIVE_FUND.id);
  const [allMembers, setAllMembers] = useState(memberSeed);
  const [allRequests, setAllRequests] = useState(requestSeed);
  const [allWithdrawals, setAllWithdrawals] = useState(withdrawalSeed);
  const [allApprovals, setAllApprovals] = useState(approvalSeed);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [dialogMemberId, setDialogMemberId] = useState<string | null>(null);

  const fund = fundById(fundId);

  const value = useMemo<RecordsValue>(() => {
    const members = allMembers.filter((member) => member.fundId === fund.id);
    const memberIds = new Set(members.map((member) => member.id));

    return {
      fund,
      setFundId,
      members,
      allMembers,
      allRequests,
      requests: allRequests.filter((request) => memberIds.has(request.memberId)),
      withdrawals: allWithdrawals.filter((item) => memberIds.has(item.memberId)),
      approvals: allApprovals.filter((item) => item.fundId === fund.id),
      dialog,
      dialogMemberId,
      openDialog: (kind, memberId) => {
        setDialogMemberId(memberId ?? null);
        setDialog(kind);
      },
      closeDialog: () => setDialog(null),
      registerMember: (input) => {
        const idBase = slug(input.name);
        const id = allMembers.some((member) => member.id === idBase)
          ? `${idBase}-${allMembers.length + 1}`
          : idBase;
        const member: Member = {
          id,
          ref: nextId(
            fund.refPrefix,
            allMembers
              .map((item) => item.ref)
              .filter((ref) => ref.startsWith(`${fund.refPrefix}-`)),
          ),
          name: input.name.trim(),
          dateOfBirth: input.dateOfBirth,
          ssnit: input.ssnit.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          nationality: "Ghanaian",
          address: input.address.trim(),
          gender: input.gender,
          maritalStatus: input.maritalStatus,
          joined: stamp(),
          fundId: fund.id,
          sponsorRef: nextId("SPT", allMembers.map((item) => item.sponsorRef)),
          sponsorName: input.sponsorName.trim(),
          sponsorAddress: input.address.trim(),
          beneficiaries: [],
          statement: {
            asAt: fund.asAt,
            contribution: { employee: 0, employer: 0 },
            gainLoss: { employee: 0, employer: 0 },
            outflow: { employee: 0, employer: 0 },
          },
        };
        setAllMembers((current) => [member, ...current]);
        return member;
      },
      logRequest: (input) => {
        const member = allMembers.find((item) => item.id === input.memberId);
        if (!member) return;
        const request: MemberRequest = {
          id: nextId("REQ", allRequests.map((item) => item.id)),
          memberId: member.id,
          memberName: member.name,
          kind: input.kind,
          subject: input.subject.trim(),
          channel: input.channel,
          opened: stamp(),
          status: "Open",
          owner: "Unassigned",
        };
        setAllRequests((current) => [request, ...current]);
      },
      recordWithdrawal: (input) => {
        const member = allMembers.find((item) => item.id === input.memberId);
        if (!member) return;
        const id = nextId("WD", allWithdrawals.map((item) => item.id));
        const withdrawal: Withdrawal = {
          id,
          memberId: member.id,
          memberName: member.name,
          amount: input.amount,
          reason: input.reason,
          channel: input.channel,
          stage: "Requested",
          opened: stamp(),
        };
        setAllWithdrawals((current) => [withdrawal, ...current]);
        const request: MemberRequest = {
          id: nextId("REQ", allRequests.map((item) => item.id)),
          memberId: member.id,
          memberName: member.name,
          kind: "Withdrawal",
          subject: input.reason,
          channel: input.channel,
          opened: stamp(),
          status: "Open",
          owner: "Unassigned",
        };
        setAllRequests((current) => [request, ...current]);
      },
      recordContribution: (input) => {
        const approval: Approval = {
          id: nextId("CA", allApprovals.map((item) => item.id)),
          fundId: fund.id,
          kind: "Contribution",
          title: `${input.sponsorName.trim()} · ${input.period.trim()}`,
          detail: `${fund.name} contribution batch`,
          amount: input.amount,
          raisedBy: "Contributions desk",
          waitingSince: stamp(),
        };
        setAllApprovals((current) => [approval, ...current]);
      },
      recordMemberContribution: (memberId, input) => {
        setAllMembers((current) =>
          current.map((member) =>
            member.id === memberId
              ? {
                  ...member,
                  statement: {
                    ...member.statement,
                    asAt: stamp(),
                    contribution: {
                      employee:
                        member.statement.contribution.employee + input.employee,
                      employer:
                        member.statement.contribution.employer + input.employer,
                    },
                  },
                }
              : member,
          ),
        );
      },
      addBeneficiary: (memberId, input) => {
        setAllMembers((current) =>
          current.map((member) =>
            member.id === memberId
              ? {
                  ...member,
                  beneficiaries: [
                    ...member.beneficiaries,
                    {
                      name: input.name.trim(),
                      relationship: input.relationship.trim(),
                      share: input.share.trim(),
                    },
                  ],
                }
              : member,
          ),
        );
      },
      approve: (id) => {
        const item = allApprovals.find((approval) => approval.id === id);
        setAllApprovals((current) =>
          current.filter((approval) => approval.id !== id),
        );
        const withdrawalId = item?.title.match(/WD-\d+/)?.[0];
        if (!withdrawalId) return;
        setAllWithdrawals((current) =>
          current.map((withdrawal) =>
            withdrawal.id === withdrawalId
              ? { ...withdrawal, stage: "Approved" }
              : withdrawal,
          ),
        );
      },
    };
  }, [
    allApprovals,
    allMembers,
    allRequests,
    allWithdrawals,
    dialog,
    dialogMemberId,
    fund,
  ]);

  return (
    <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
  );
}

export function useRecords() {
  const value = useContext(RecordsContext);
  if (!value) {
    throw new Error("useRecords must be used in the operations hub");
  }
  return value;
}
