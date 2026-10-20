import { Suspense } from "react";

import { RequestsBoard } from "@/components/requests/requests-board";

export const metadata = { title: "Member requests" };

export default function RequestsPage() {
  return (
    <Suspense fallback={null}>
      <RequestsBoard />
    </Suspense>
  );
}
