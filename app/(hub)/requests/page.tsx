import { Suspense } from "react";

import { RequestsBoard } from "@/components/requests/requests-board";

export const metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <Suspense fallback={null}>
      <RequestsBoard />
    </Suspense>
  );
}
