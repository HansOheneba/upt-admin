import { Suspense } from "react";

import { SchemeWorkspace } from "@/components/schemes/scheme-workspace";

export const metadata = { title: "Scheme" };

export default function SchemePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <SchemeRecord params={params} />
    </Suspense>
  );
}

async function SchemeRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchemeWorkspace id={id} />;
}
