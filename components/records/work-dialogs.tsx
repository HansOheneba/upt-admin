"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { controlClass, Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { memberBalance, type RequestKind } from "@/lib/demo";
import { ghs } from "@/lib/format";

const REQUEST_KINDS: RequestKind[] = ["Enquiry", "Withdrawal", "Claim"];
const REQUEST_CHANNELS = ["My Own Pension", "SMS", "Email", "Web form", "Phone"];
const WITHDRAWAL_REASONS = [
  "Partial withdrawal",
  "School fees",
  "Retirement",
  "Medical",
];
const WITHDRAWAL_CHANNELS = ["Mobile money", "Bank transfer"];

const DIALOG_TITLES = {
  member: "Register member",
  request: "Log request",
  withdrawal: "Record withdrawal",
  contribution: "Record contribution batch",
  memberContribution: "Record contribution",
  beneficiary: "Add beneficiary",
} as const;

export function WorkDialogs() {
  const { dialog, closeDialog } = useRecords();

  if (!dialog) return null;

  return (
    <Modal open title={DIALOG_TITLES[dialog]} onClose={closeDialog}>
      {dialog === "member" ? <RegisterMemberForm /> : null}
      {dialog === "request" ? <LogRequestForm /> : null}
      {dialog === "withdrawal" ? <RecordWithdrawalForm /> : null}
      {dialog === "contribution" ? <RecordContributionForm /> : null}
      {dialog === "memberContribution" ? <RecordMemberContributionForm /> : null}
      {dialog === "beneficiary" ? <AddBeneficiaryForm /> : null}
    </Modal>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="text-sm text-[#9b3a2f]">{message}</p>;
}

function RegisterMemberForm() {
  const router = useRouter();
  const { registerMember, closeDialog, fund } = useRecords();
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const phone = String(data.get("phone") ?? "").trim();
        const ssnit = String(data.get("ssnit") ?? "").trim();
        const sponsorName = String(data.get("sponsor") ?? "").trim();
        const address = String(data.get("address") ?? "").trim();
        const dateOfBirth = String(data.get("dob") ?? "");
        if (
          !name ||
          !email ||
          !phone ||
          !ssnit ||
          !sponsorName ||
          !address ||
          !dateOfBirth
        ) {
          setError("Complete every field to register the unitholder.");
          return;
        }
        const member = registerMember({
          name,
          email,
          phone,
          ssnit,
          sponsorName,
          dateOfBirth: formatDate(dateOfBirth),
          gender: String(data.get("gender") ?? "Female"),
          maritalStatus: String(data.get("marital") ?? "Single"),
          address,
        });
        closeDialog();
        router.push(`/members/${member.id}`);
      }}
    >
      <Field label="Full name">
        <input name="name" className={controlClass} autoFocus />
      </Field>
      <Field label="Date of birth">
        <input name="dob" type="date" className={controlClass} />
      </Field>
      <Field label="SSNIT">
        <input name="ssnit" className={controlClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" className={controlClass} />
      </Field>
      <Field label="Phone">
        <input name="phone" className={controlClass} />
      </Field>
      <Field label="Gender">
        <select name="gender" className={controlClass} defaultValue="Female">
          <option>Female</option>
          <option>Male</option>
        </select>
      </Field>
      <Field label="Marital status">
        <select name="marital" className={controlClass} defaultValue="Single">
          <option>Single</option>
          <option>Married</option>
        </select>
      </Field>
      <Field label="Address">
        <input name="address" className={controlClass} />
      </Field>
      <Field label="Sponsor">
        <input name="sponsor" className={controlClass} />
      </Field>
      <p className="text-xs text-muted">
        The unitholder is registered on {fund.name}.
      </p>
      <FormError message={error} />
      <Button type="submit">Register member</Button>
    </form>
  );
}

function LogRequestForm() {
  const { members, dialogMemberId, logRequest, closeDialog, openDialog } =
    useRecords();
  const [error, setError] = useState("");

  if (members.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Register a unitholder before logging a request on this scheme.
        </p>
        <Button type="button" onClick={() => openDialog("member")}>
          Register member
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const subject = String(data.get("subject") ?? "").trim();
        if (!subject) {
          setError("Enter the subject of the request.");
          return;
        }
        logRequest({
          memberId: String(data.get("member")),
          kind: String(data.get("kind")) as RequestKind,
          subject,
          channel: String(data.get("channel")),
        });
        closeDialog();
      }}
    >
      <Field label="Unitholder">
        <select
          name="member"
          className={controlClass}
          defaultValue={dialogMemberId ?? members[0]?.id}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select name="kind" className={controlClass} defaultValue="Enquiry">
          {REQUEST_KINDS.map((kind) => (
            <option key={kind}>{kind}</option>
          ))}
        </select>
      </Field>
      <Field label="Channel">
        <select name="channel" className={controlClass} defaultValue="Phone">
          {REQUEST_CHANNELS.map((channel) => (
            <option key={channel}>{channel}</option>
          ))}
        </select>
      </Field>
      <Field label="Subject">
        <input name="subject" className={controlClass} autoFocus />
      </Field>
      <FormError message={error} />
      <Button type="submit">Log request</Button>
    </form>
  );
}

function RecordWithdrawalForm() {
  const { members, dialogMemberId, recordWithdrawal, closeDialog, openDialog } =
    useRecords();
  const [error, setError] = useState("");

  if (members.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Register a unitholder before recording a withdrawal on this scheme.
        </p>
        <Button type="button" onClick={() => openDialog("member")}>
          Register member
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const memberId = String(data.get("member"));
        const member = members.find((item) => item.id === memberId);
        const amount = Number(String(data.get("amount") ?? "").replace(/,/g, ""));
        if (!member || !Number.isFinite(amount) || amount <= 0) {
          setError("Enter the amount in cedis.");
          return;
        }
        if (amount > memberBalance(member)) {
          setError(
            `Amount is above the current balance of ${ghs(memberBalance(member))}.`,
          );
          return;
        }
        recordWithdrawal({
          memberId,
          amount,
          reason: String(data.get("reason")),
          channel: String(data.get("channel")),
        });
        closeDialog();
      }}
    >
      <Field label="Unitholder">
        <select
          name="member"
          className={controlClass}
          defaultValue={dialogMemberId ?? members[0]?.id}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} · {ghs(memberBalance(member))}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount (GHS)">
        <input name="amount" inputMode="decimal" className={controlClass} autoFocus />
      </Field>
      <Field label="Reason">
        <select name="reason" className={controlClass} defaultValue="Partial withdrawal">
          {WITHDRAWAL_REASONS.map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </Field>
      <Field label="Channel">
        <select name="channel" className={controlClass} defaultValue="Mobile money">
          {WITHDRAWAL_CHANNELS.map((channel) => (
            <option key={channel}>{channel}</option>
          ))}
        </select>
      </Field>
      <FormError message={error} />
      <Button type="submit">Record withdrawal</Button>
    </form>
  );
}

function RecordContributionForm() {
  const { fund, recordContribution, closeDialog } = useRecords();
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const sponsorName = String(data.get("sponsor") ?? "").trim();
        const period = String(data.get("period") ?? "").trim();
        const amount = Number(String(data.get("amount") ?? "").replace(/,/g, ""));
        if (!sponsorName || !period || !Number.isFinite(amount) || amount <= 0) {
          setError("Enter the sponsor, period and amount.");
          return;
        }
        recordContribution({ sponsorName, period, amount });
        closeDialog();
      }}
    >
      <Field label="Sponsor">
        <input name="sponsor" className={controlClass} autoFocus />
      </Field>
      <Field label="Period">
        <input name="period" className={controlClass} placeholder="October 2026" />
      </Field>
      <Field label="Amount (GHS)">
        <input name="amount" inputMode="decimal" className={controlClass} />
      </Field>
      <p className="text-xs text-muted">
        The batch waits for a second officer on {fund.name}.
      </p>
      <FormError message={error} />
      <Button type="submit">Record batch</Button>
    </form>
  );
}

function RecordMemberContributionForm() {
  const { dialogMemberId, recordMemberContribution, closeDialog } = useRecords();
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!dialogMemberId) return;
        const data = new FormData(event.currentTarget);
        const employee = money(data.get("employee"));
        const employer = money(data.get("employer"));
        if (employee == null || employer == null) {
          setError("Enter the employee and employer amounts in cedis.");
          return;
        }
        if (employee <= 0 && employer <= 0) {
          setError("Enter the amount paid in.");
          return;
        }
        recordMemberContribution(dialogMemberId, { employee, employer });
        closeDialog();
      }}
    >
      <Field label="Employee (GHS)">
        <input
          name="employee"
          inputMode="decimal"
          className={controlClass}
          defaultValue="0"
          autoFocus
        />
      </Field>
      <Field label="Employer (GHS)">
        <input
          name="employer"
          inputMode="decimal"
          className={controlClass}
          defaultValue="0"
        />
      </Field>
      <p className="text-xs text-muted">
        The amounts are added to this unitholder&apos;s contribution.
      </p>
      <FormError message={error} />
      <Button type="submit">Record contribution</Button>
    </form>
  );
}

function money(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

function AddBeneficiaryForm() {
  const { dialogMemberId, addBeneficiary, closeDialog } = useRecords();
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!dialogMemberId) return;
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const relationship = String(data.get("relationship") ?? "").trim();
        const share = String(data.get("share") ?? "").trim();
        if (!name || !relationship || !share) {
          setError("Enter the name, relationship and share.");
          return;
        }
        addBeneficiary(dialogMemberId, { name, relationship, share });
        closeDialog();
      }}
    >
      <Field label="Name">
        <input name="name" className={controlClass} autoFocus />
      </Field>
      <Field label="Relationship">
        <input name="relationship" className={controlClass} />
      </Field>
      <Field label="Share">
        <input name="share" className={controlClass} placeholder="100%" />
      </Field>
      <FormError message={error} />
      <Button type="submit">Add beneficiary</Button>
    </form>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
