"use client";

import { Button } from "@/components/ui/button";
import { useRecords } from "@/components/records/records-provider";
import { downloadCsv } from "@/lib/csv";
import { WITHDRAWAL_LABEL, memberName, type Member } from "@/lib/domain";
import { formatDate, formatUnits, ghs } from "@/lib/format";
import { channelLabel, destinationLabel, membershipPosition } from "@/lib/pension";

export function StatementActions({ member }: { member: Member }) {
  const { book, memberships } = useRecords();

  return (
    <div className="print-hide flex flex-col gap-2">
      <Button
        variant="secondary"
        onClick={() => {
          const rows: string[][] = [
            ["United Pension Trustees"],
            ["Member statement"],
            ["Prepared", formatDate(new Date().toISOString())],
            [],
            ["Name", memberName(member)],
            ["Mobile", member.mobile],
            ["Email", member.email],
          ];
          const own = memberships.filter((membership) => membership.memberId === member.id);
          for (const membership of own) {
            const scheme = book.schemes.find((item) => item.id === membership.schemeId);
            const position = membershipPosition(book, membership.id);
            rows.push(
              [],
              ["Scheme", scheme?.name ?? ""],
              ["Membership", membership.membershipNumber],
              ["Since", formatDate(membership.effectiveFrom)],
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
            );
          }
          downloadCsv(`statement-${member.id}.csv`, rows);
        }}
      >
        Export statement
      </Button>
      <Button onClick={() => window.print()}>Print</Button>
    </div>
  );
}
