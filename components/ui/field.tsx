import type { ReactNode } from "react";

export const controlClass =
  "h-11 w-full min-w-0 max-w-full rounded-[8px] border border-line bg-white px-3 text-sm font-normal text-foreground outline-none focus:border-navy focus:ring-2 focus:ring-navy/15";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
      {label}
      {children}
    </label>
  );
}
