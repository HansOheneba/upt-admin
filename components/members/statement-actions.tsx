"use client";

import { Button } from "@/components/ui/button";
import { memberBalance, splitTotal, type Member } from "@/lib/demo";
import { ghs } from "@/lib/format";

export function StatementActions({
  member,
  fundName,
}: {
  member: Member;
  fundName: string;
}) {
  return (
    <div className="print-hide flex gap-2">
      <Button variant="secondary" onClick={() => exportStatement(member, fundName)}>
        Export
      </Button>
      <Button onClick={() => window.print()}>Print</Button>
    </div>
  );
}

function exportStatement(member: Member, fundName: string) {
  const { statement } = member;
  const lines = [
    ["United Pension Trustees"],
    [fundName],
    [member.name, member.ref],
    ["Statement as at", statement.asAt],
    [],
    ["Line", "Employee", "Employer", "Total"],
    line("Contribution", statement.contribution),
    line("Gain/Loss", statement.gainLoss),
    line("Cumulative outflow", statement.outflow),
    ["Current balance", "", "", ghs(memberBalance(member))],
  ];
  const csv = lines.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${member.ref}-statement.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function line(
  label: string,
  split: { employee: number; employer: number },
) {
  return [label, ghs(split.employee), ghs(split.employer), ghs(splitTotal(split))];
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
