import type { ReactNode } from "react";

import { RecordsProvider } from "@/components/records/records-provider";
import { WorkDialogs } from "@/components/records/work-dialogs";
import { AppShell } from "@/components/shell/app-shell";

export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <RecordsProvider>
      <AppShell>{children}</AppShell>
      <WorkDialogs />
    </RecordsProvider>
  );
}
