import { Suspense } from "react";

import { TasksBoard } from "@/components/work/work-boards";

export const metadata = { title: "My Tasks" };

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksBoard />
    </Suspense>
  );
}
