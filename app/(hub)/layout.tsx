import type { ReactNode } from "react";

import { RecordsProvider } from "@/components/records/records-provider";
import { AppShell } from "@/components/shell/app-shell";

export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <RecordsProvider>
      <AppShell>{children}</AppShell>
    </RecordsProvider>
  );
}
