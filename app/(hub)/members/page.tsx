import { Suspense } from "react";

import { MemberDirectory } from "@/components/members/member-directory";

export const metadata = { title: "Member Directory" };

export default function MembersPage() {
  return (
    <Suspense fallback={null}>
      <MemberDirectory />
    </Suspense>
  );
}
