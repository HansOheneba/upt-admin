export function ghs(value: number) {
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `GH₵${formatted}`;
}

export function formatUnits(units: number) {
  return new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(units);
}

export function formatDate(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function todayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function daysSince(iso: string, now = new Date()) {
  const start = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.max(0, Math.round((end.getTime() - from.getTime()) / 86_400_000));
}
