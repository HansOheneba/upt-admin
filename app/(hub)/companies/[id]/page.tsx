import { Suspense } from "react";

import { CompanyWorkspace } from "@/components/companies/company-workspace";

export const metadata = { title: "Company" };

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <CompanyRecord params={params} />
    </Suspense>
  );
}

async function CompanyRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyWorkspace id={id} />;
}
