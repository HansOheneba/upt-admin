export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-[12px] border border-line bg-card px-5 py-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[28px] leading-none font-semibold tracking-tight text-navy tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-5 text-muted">{hint}</p> : null}
    </article>
  );
}
