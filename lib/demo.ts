export type MoneySplit = {
  employee: number;
  employer: number;
};

export type Member = {
  id: string;
  ref: string;
  name: string;
  dateOfBirth: string;
  ssnit: string;
  email: string;
  phone: string;
  nationality: string;
  address: string;
  gender: string;
  maritalStatus: string;
  joined: string;
  fundId: string;
  sponsorRef: string;
  sponsorName: string;
  sponsorAddress: string;
  beneficiaries: {
    name: string;
    relationship: string;
    share: string;
  }[];
  statement: {
    contribution: MoneySplit;
    gainLoss: MoneySplit;
    outflow: MoneySplit;
    asAt: string;
  };
};

export type RequestKind = "Enquiry" | "Withdrawal" | "Claim";
export type RequestStatus = "Open" | "In review" | "Waiting on member";

export type MemberRequest = {
  id: string;
  memberId: string;
  memberName: string;
  kind: RequestKind;
  subject: string;
  channel: string;
  opened: string;
  status: RequestStatus;
  owner: string;
};

export type WithdrawalStage =
  | "Requested"
  | "Validation"
  | "Payment instruction"
  | "Approved"
  | "Paid";

export type Withdrawal = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  reason: string;
  channel: string;
  stage: WithdrawalStage;
  opened: string;
};

export type ApprovalKind = "Payment instruction" | "Contribution";

export type Approval = {
  id: string;
  fundId: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  amount: number;
  raisedBy: string;
  waitingSince: string;
};

export type FundBook = {
  id: string;
  name: string;
  alsoKnownAs: string;
  kind: string;
  refPrefix: string;
  asAt: string;
  netAssetValue: number;
  contributions: number;
  withdrawals: number;
  gainLoss: number;
};

export const OFFICER = {
  name: "Abena Owusu",
  role: "Scheme officer",
  initials: "AO",
};

export const FUNDS: FundBook[] = [
  {
    id: "personal-pension",
    name: "Personal Pension",
    alsoKnownAs: "My Own Pension",
    kind: "Personal pension scheme",
    refPrefix: "PP",
    asAt: "31 Aug 2026",
    netAssetValue: 128_450_220,
    contributions: 42_180_640,
    withdrawals: 6_240_110,
    gainLoss: 9_860_450,
  },
  {
    id: "tier-2",
    name: "Tier 2",
    alsoKnownAs: "Occupational scheme",
    kind: "Occupational pension scheme",
    refPrefix: "T2",
    asAt: "31 Aug 2026",
    netAssetValue: 486_220_410,
    contributions: 91_440_200,
    withdrawals: 18_660_540,
    gainLoss: 27_105_880,
  },
  {
    id: "tier-3",
    name: "Tier 3",
    alsoKnownAs: "Provident scheme",
    kind: "Provident scheme",
    refPrefix: "T3",
    asAt: "31 Aug 2026",
    netAssetValue: 74_518_960,
    contributions: 22_340_100,
    withdrawals: 4_180_220,
    gainLoss: 5_640_330,
  },
  {
    id: "master-trust",
    name: "United Master Trust Pension Fund",
    alsoKnownAs: "Master trust",
    kind: "Master trust scheme",
    refPrefix: "MT",
    asAt: "31 Aug 2026",
    netAssetValue: 310_882_150,
    contributions: 64_220_400,
    withdrawals: 11_905_770,
    gainLoss: 19_440_210,
  },
  {
    id: "investment-trust",
    name: "United Investment Trust Fund",
    alsoKnownAs: "Investment scheme",
    kind: "Investment scheme",
    refPrefix: "UIT",
    asAt: "31 Aug 2026",
    netAssetValue: 52_640_880,
    contributions: 14_220_500,
    withdrawals: 3_410_090,
    gainLoss: 4_118_640,
  },
];

export const ACTIVE_FUND = FUNDS[0];

export function fundById(id: string) {
  return FUNDS.find((fund) => fund.id === id) ?? ACTIVE_FUND;
}

export const WITHDRAWAL_STAGES: WithdrawalStage[] = [
  "Requested",
  "Validation",
  "Payment instruction",
  "Approved",
  "Paid",
];

export const members: Member[] = [
  {
    id: "ama-mensah",
    ref: "PP-10482",
    name: "Ama Serwaa Mensah",
    dateOfBirth: "14 Apr 1986",
    ssnit: "C198604140214",
    email: "ama.mensah@harbourco.com.gh",
    phone: "024 410 2281",
    nationality: "Ghanaian",
    address: "12 Hibiscus Lane, East Legon, Accra",
    gender: "Female",
    maritalStatus: "Married",
    joined: "03 Mar 2019",
    fundId: "personal-pension",
    sponsorRef: "SPT-20418",
    sponsorName: "Harbour & Co. Ltd",
    sponsorAddress: "4 Independence Avenue, Ridge, Accra",
    beneficiaries: [
      { name: "Kofi Mensah", relationship: "Spouse", share: "60%" },
      { name: "Adjoa Mensah", relationship: "Child", share: "40%" },
    ],
    statement: {
      asAt: "31 Aug 2026",
      contribution: { employee: 18420.5, employer: 18420.5 },
      gainLoss: { employee: 2410.15, employer: 2410.15 },
      outflow: { employee: 0, employer: 0 },
    },
  },
  {
    id: "kwame-boateng",
    ref: "PP-11007",
    name: "Kwame Boateng",
    dateOfBirth: "02 Nov 1979",
    ssnit: "C197911020088",
    email: "kwame.boateng@adommarkets.com.gh",
    phone: "020 884 1190",
    nationality: "Ghanaian",
    address: "8 Palace Street, Adum, Kumasi",
    gender: "Male",
    maritalStatus: "Married",
    joined: "19 Jan 2016",
    fundId: "personal-pension",
    sponsorRef: "SPT-18802",
    sponsorName: "Adom Markets Ltd",
    sponsorAddress: "22 Harper Road, Adum, Kumasi",
    beneficiaries: [
      { name: "Akosua Boateng", relationship: "Spouse", share: "100%" },
    ],
    statement: {
      asAt: "31 Aug 2026",
      contribution: { employee: 31200, employer: 31200 },
      gainLoss: { employee: 4860.4, employer: 4860.4 },
      outflow: { employee: 5000, employer: 0 },
    },
  },
  {
    id: "efua-darko",
    ref: "PP-12190",
    name: "Efua Darko",
    dateOfBirth: "28 Jul 1992",
    ssnit: "C199207280441",
    email: "efua.darko@gmail.com",
    phone: "055 302 7741",
    nationality: "Ghanaian",
    address: "15 Beach Road, Takoradi",
    gender: "Female",
    maritalStatus: "Single",
    joined: "11 Sep 2021",
    fundId: "personal-pension",
    sponsorRef: "SPT-31004",
    sponsorName: "Self-employed",
    sponsorAddress: "15 Beach Road, Takoradi",
    beneficiaries: [
      { name: "Esi Darko", relationship: "Sibling", share: "100%" },
    ],
    statement: {
      asAt: "31 Aug 2026",
      contribution: { employee: 9640, employer: 0 },
      gainLoss: { employee: 810.25, employer: 0 },
      outflow: { employee: 0, employer: 0 },
    },
  },
  {
    id: "yaw-owusu",
    ref: "PP-09811",
    name: "Yaw Owusu",
    dateOfBirth: "09 Feb 1971",
    ssnit: "C197102090016",
    email: "yaw.owusu@coastalmills.com.gh",
    phone: "027 661 4402",
    nationality: "Ghanaian",
    address: "3 Chapel Square, Cape Coast",
    gender: "Male",
    maritalStatus: "Married",
    joined: "22 Jun 2012",
    fundId: "personal-pension",
    sponsorRef: "SPT-09012",
    sponsorName: "Coastal Mills Ltd",
    sponsorAddress: "1 Harbour Road, Cape Coast",
    beneficiaries: [
      { name: "Ama Owusu", relationship: "Spouse", share: "70%" },
      { name: "Kojo Owusu", relationship: "Child", share: "30%" },
    ],
    statement: {
      asAt: "31 Aug 2026",
      contribution: { employee: 45210, employer: 45210 },
      gainLoss: { employee: 9120.8, employer: 9120.8 },
      outflow: { employee: 12000, employer: 0 },
    },
  },
  {
    id: "abena-frimpong",
    ref: "PP-13340",
    name: "Abena Frimpong",
    dateOfBirth: "16 Dec 1988",
    ssnit: "C198812160302",
    email: "abena.frimpong@northlightstudio.com.gh",
    phone: "024 119 8834",
    nationality: "Ghanaian",
    address: "40 Ring Road Central, Accra",
    gender: "Female",
    maritalStatus: "Single",
    joined: "07 Feb 2023",
    fundId: "personal-pension",
    sponsorRef: "SPT-44110",
    sponsorName: "Northlight Studio",
    sponsorAddress: "9 Osu Badu Street, Accra",
    beneficiaries: [
      { name: "Nana Frimpong", relationship: "Parent", share: "100%" },
    ],
    statement: {
      asAt: "31 Aug 2026",
      contribution: { employee: 7200, employer: 3600 },
      gainLoss: { employee: 540.1, employer: 270.05 },
      outflow: { employee: 0, employer: 0 },
    },
  },
];

export const requests: MemberRequest[] = [
  {
    id: "REQ-1042",
    memberId: "ama-mensah",
    memberName: "Ama Serwaa Mensah",
    kind: "Withdrawal",
    subject: "Partial withdrawal to mobile money",
    channel: "My Own Pension",
    opened: "16 Oct 2026",
    status: "Open",
    owner: "Unassigned",
  },
  {
    id: "REQ-1038",
    memberId: "kwame-boateng",
    memberName: "Kwame Boateng",
    kind: "Enquiry",
    subject: "Statement balance does not match SMS",
    channel: "SMS",
    opened: "15 Oct 2026",
    status: "In review",
    owner: "Abena Owusu",
  },
  {
    id: "REQ-1031",
    memberId: "yaw-owusu",
    memberName: "Yaw Owusu",
    kind: "Claim",
    subject: "Retirement benefit claim",
    channel: "Web form",
    opened: "14 Oct 2026",
    status: "In review",
    owner: "Abena Owusu",
  },
  {
    id: "REQ-1026",
    memberId: "efua-darko",
    memberName: "Efua Darko",
    kind: "Enquiry",
    subject: "Update beneficiary after a name change",
    channel: "Email",
    opened: "13 Oct 2026",
    status: "Waiting on member",
    owner: "Abena Owusu",
  },
  {
    id: "REQ-1022",
    memberId: "abena-frimpong",
    memberName: "Abena Frimpong",
    kind: "Withdrawal",
    subject: "First partial withdrawal",
    channel: "My Own Pension",
    opened: "12 Oct 2026",
    status: "Open",
    owner: "Unassigned",
  },
  {
    id: "REQ-1014",
    memberId: "kwame-boateng",
    memberName: "Kwame Boateng",
    kind: "Withdrawal",
    subject: "School fees withdrawal",
    channel: "My Own Pension",
    opened: "09 Oct 2026",
    status: "In review",
    owner: "Abena Owusu",
  },
];

export const withdrawals: Withdrawal[] = [
  {
    id: "WD-2208",
    memberId: "ama-mensah",
    memberName: "Ama Serwaa Mensah",
    amount: 4500,
    reason: "Partial withdrawal",
    channel: "Mobile money",
    stage: "Validation",
    opened: "16 Oct 2026",
  },
  {
    id: "WD-2204",
    memberId: "abena-frimpong",
    memberName: "Abena Frimpong",
    amount: 1800,
    reason: "Partial withdrawal",
    channel: "Mobile money",
    stage: "Requested",
    opened: "12 Oct 2026",
  },
  {
    id: "WD-2196",
    memberId: "kwame-boateng",
    memberName: "Kwame Boateng",
    amount: 6200,
    reason: "School fees",
    channel: "Mobile money",
    stage: "Payment instruction",
    opened: "09 Oct 2026",
  },
  {
    id: "WD-2188",
    memberId: "yaw-owusu",
    memberName: "Yaw Owusu",
    amount: 15000,
    reason: "Retirement",
    channel: "Bank transfer",
    stage: "Approved",
    opened: "02 Oct 2026",
  },
  {
    id: "WD-2170",
    memberId: "efua-darko",
    memberName: "Efua Darko",
    amount: 900,
    reason: "Partial withdrawal",
    channel: "Mobile money",
    stage: "Paid",
    opened: "24 Sep 2026",
  },
  {
    id: "WD-2164",
    memberId: "kwame-boateng",
    memberName: "Kwame Boateng",
    amount: 2500,
    reason: "Partial withdrawal",
    channel: "Mobile money",
    stage: "Validation",
    opened: "11 Oct 2026",
  },
];

export const approvals: Approval[] = [
  {
    id: "PI-118",
    fundId: "personal-pension",
    kind: "Payment instruction",
    title: "WD-2196 · Kwame Boateng",
    detail: "School fees withdrawal to mobile money",
    amount: 6200,
    raisedBy: "Abena Owusu",
    waitingSince: "17 Oct 2026",
  },
  {
    id: "PI-114",
    fundId: "personal-pension",
    kind: "Payment instruction",
    title: "WD-2188 · Yaw Owusu",
    detail: "Retirement payment to bank account",
    amount: 15000,
    raisedBy: "Abena Owusu",
    waitingSince: "16 Oct 2026",
  },
  {
    id: "CA-441",
    fundId: "personal-pension",
    kind: "Contribution",
    title: "Harbour & Co. Ltd · September",
    detail: "Personal Pension contribution batch",
    amount: 86420,
    raisedBy: "Contributions desk",
    waitingSince: "15 Oct 2026",
  },
  {
    id: "CA-438",
    fundId: "personal-pension",
    kind: "Contribution",
    title: "Adom Markets Ltd · September",
    detail: "Personal Pension contribution batch",
    amount: 120300,
    raisedBy: "Contributions desk",
    waitingSince: "15 Oct 2026",
  },
];

export function getMember(id: string) {
  return members.find((member) => member.id === id);
}

export function splitTotal(split: MoneySplit) {
  return split.employee + split.employer;
}

export function memberBalance(member: Member) {
  const { contribution, gainLoss, outflow } = member.statement;
  return (
    splitTotal(contribution) + splitTotal(gainLoss) - splitTotal(outflow)
  );
}

export function openRequests() {
  return requests.filter((request) => request.status === "Open");
}

export function withdrawalsInValidation() {
  return withdrawals.filter((item) => item.stage === "Validation");
}

export function paymentApprovals() {
  return approvals.filter((item) => item.kind === "Payment instruction");
}
