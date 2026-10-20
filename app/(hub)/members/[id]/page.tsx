import { Suspense } from "react";

import { MemberFile } from "@/components/members/member-file";

export const metadata = { title: "Member" };

export default function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <MemberRecord params={params} />
    </Suspense>
  );
}

async function MemberRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberFile id={id} />;
}
