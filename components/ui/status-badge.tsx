const TONES: Record<string, string> = {
  Received: "bg-[#E8F0FA] text-info",
  "Under review": "bg-[#FBF3E4] text-warning",
  Approved: "bg-[#E8F0FA] text-info",
  "Payment completed": "bg-[#E8F5EE] text-success",
  Declined: "bg-[#F8E8E8] text-danger",
  Open: "bg-[#FBF3E4] text-warning",
  Replied: "bg-[#E8F5EE] text-success",
  Active: "bg-[#E8F5EE] text-success",
  Closed: "bg-[#EEF1F5] text-muted",
  Missing: "bg-[#F8E8E8] text-danger",
  Partial: "bg-[#FBF3E4] text-warning",
  "On track": "bg-[#E8F5EE] text-success",
  "Off track": "bg-[#FBF3E4] text-warning",
  Expired: "bg-[#F8E8E8] text-danger",
  "Renewing soon": "bg-[#FBF3E4] text-warning",
  Requested: "bg-[#E8F0FA] text-info",
  Confirmed: "bg-[#E8F5EE] text-success",
  Completed: "bg-[#EEF1F5] text-muted",
  Cancelled: "bg-[#EEF1F5] text-muted",
  High: "bg-[#F8E8E8] text-danger",
  Normal: "bg-[#E8F0FA] text-info",
  Low: "bg-[#EEF1F5] text-muted",
  Overdue: "bg-[#F8E8E8] text-danger",
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
