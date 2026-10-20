const TONES: Record<string, string> = {
  Received: "bg-navy/10 text-navy",
  "Under review": "bg-gold/25 text-[#7A5B12]",
  Approved: "bg-[#E7EEF8] text-navy",
  "Payment completed": "bg-emerald-50 text-success",
  Declined: "bg-[#F8E8E8] text-[#8A3030]",
  Open: "bg-gold/25 text-[#7A5B12]",
  Replied: "bg-emerald-50 text-success",
  Active: "bg-emerald-50 text-success",
  Closed: "bg-[#EEF1F5] text-muted",
  Missing: "bg-[#F8E8E8] text-[#8A3030]",
  Partial: "bg-gold/25 text-[#7A5B12]",
  "On track": "bg-emerald-50 text-success",
  "Off track": "bg-gold/25 text-[#7A5B12]",
  Expired: "bg-[#F8E8E8] text-[#8A3030]",
  "Renewing soon": "bg-gold/25 text-[#7A5B12]",
  Requested: "bg-navy/10 text-navy",
  Confirmed: "bg-emerald-50 text-success",
  Completed: "bg-[#EEF1F5] text-muted",
  Cancelled: "bg-[#EEF1F5] text-muted",
  High: "bg-[#F8E8E8] text-[#8A3030]",
  Normal: "bg-navy/10 text-navy",
  Low: "bg-[#EEF1F5] text-muted",
  Overdue: "bg-[#F8E8E8] text-[#8A3030]",
};

export function StatusBadge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${TONES[label] ?? "bg-[#EEF1F5] text-navy"}`}
    >
      {label}
    </span>
  );
}
