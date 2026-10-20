"use client";

import { Button } from "@/components/ui/button";
import { useRecords } from "@/components/records/records-provider";
import { downloadCsv } from "@/lib/csv";
import { WITHDRAWAL_LABEL, memberName, type Member } from "@/lib/domain";
import { formatDate, formatUnits, ghs } from "@/lib/format";
import { channelLabel, destinationLabel, memberPosition } from "@/lib/pension";

export function StatementActions({ member }: { member: Member }) {
  const { book } = useRecords();

  return (
    <div className="print-hide flex gap-2">
      <Button
        variant="secondary"
        onClick={() => {
          const position = memberPosition(book, member.id);
          const rows: string[][] = [
            ["United Pension Trustees"],
            ["My Own Pension statement"],
            ["Prepared", formatDate(new Date().toISOString())],
            [],
            ["Name", memberName(member)],
            ["Member number", member.memberNumber],
            ["Mobile", member.mobile],
            ["Email", member.email],
            ["Profession", member.profession],
            ["Location", member.location],
            ["Date of birth", formatDate(member.dateOfBirth)],
            ["Next of kin", member.nextOfKin],
            ["Next of kin contact", member.nextOfKinContact],
            ["Scheme", member.scheme],
            ["Member since", formatDate(member.memberSince)],
            ["Pot", position.pot === null ? "Unavailable" : ghs(position.pot)],
            ["Units", formatUnits(position.units)],
            [
              "Unit price",
              position.price
                ? `${position.price.price.toFixed(3)} on ${formatDate(position.price.date)}`
                : "Not set",
            ],
            [],
            ["Contributions"],
            ["Date", "Amount (GHS)", "Unit price", "Units", "Channel"],
            ...position.contributions.map((row) => [
              formatDate(row.date),
              ghs(row.amount),
              row.unitPrice.toFixed(3),
              formatUnits(row.units),
              channelLabel(),
            ]),
            [],
            ["Withdrawals"],
            ["Submitted", "Amount", "Reason", "Destination", "Status"],
            ...position.withdrawals.map((row) => [
              formatDate(row.submittedAt),
              ghs(row.amount),
              row.reason,
              destinationLabel(row.destinationType, row.destination),
              WITHDRAWAL_LABEL[row.status],
            ]),
          ];
          downloadCsv(`my-own-pension-statement-${member.memberNumber}.csv`, rows);
        }}
      >
        Export statement
      </Button>
      <Button onClick={() => window.print()}>Print</Button>
    </div>
  );
}
