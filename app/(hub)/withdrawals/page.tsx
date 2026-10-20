import { Suspense } from "react";

import { WithdrawalsBoard } from "@/components/withdrawals/withdrawals-board";

export const metadata = { title: "Withdrawals" };

export default function WithdrawalsPage() {
  return (
    <Suspense fallback={null}>
      <WithdrawalsBoard />
    </Suspense>
  );
}
