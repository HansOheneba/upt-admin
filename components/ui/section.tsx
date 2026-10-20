import type { ReactNode } from "react";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-sm font-medium text-navy">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
