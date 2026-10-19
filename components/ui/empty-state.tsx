import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center px-6 text-center ${compact ? "py-8" : "py-14"}`}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-navy/5 ${compact ? "size-12" : "size-16"}`}
      >
        <span
          className={`flex items-center justify-center rounded-full bg-white text-navy ring-1 ring-line ${compact ? "size-8" : "size-11"}`}
        >
          <Icon className={compact ? "size-4" : "size-5"} aria-hidden />
        </span>
      </span>
      <h3 className="mt-4 text-sm font-medium text-navy">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-5 text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
