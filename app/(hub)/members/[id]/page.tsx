import { MemberFile } from "@/components/members/member-file";

export const metadata = { title: "Member" };

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberFile id={id} />;
}
