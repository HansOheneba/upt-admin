import { Suspense } from "react";

import { MemberRecord } from "@/components/members/member-record";
import { getMember, members } from "@/lib/demo";

export function generateStaticParams() {
  return members.map((member) => ({ id: member.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = getMember(id);

  return {
    title: member?.name ?? "Member",
  };
}

export default function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<MemberSkeleton />}>
      <MemberRecordLoader params={params} />
    </Suspense>
  );
}

async function MemberRecordLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberRecord id={id} />;
}

function MemberSkeleton() {
  return <div className="h-48 animate-pulse rounded-xl border border-line bg-card" />;
}
