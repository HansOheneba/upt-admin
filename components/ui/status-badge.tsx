const TONES: Record<string, string> = {
  Open: "bg-gold/25 text-[#7A5B12]",
  "In review": "bg-navy/10 text-navy",
  "Waiting on member": "bg-[#EEF1F5] text-muted",
  Requested: "bg-navy/10 text-navy",
  Validation: "bg-gold/25 text-[#7A5B12]",
  "Payment instruction": "bg-[#E7EEF8] text-navy",
  Approved: "bg-emerald-50 text-success",
  Paid: "bg-emerald-50 text-success",
  Enquiry: "bg-[#EEF1F5] text-navy",
  Withdrawal: "bg-gold/25 text-[#7A5B12]",
  Claim: "bg-navy/10 text-navy",
  Contribution: "bg-[#E7EEF8] text-navy",
};

export function StatusBadge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${TONES[label] ?? "bg-[#EEF1F5] text-navy"}`}
    >
      {label}
    </span>
  );
}
