import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight break-words text-navy sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-6 text-muted">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
