"use client";

import { isValidElement, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type CopilotMemberRef = {
  id: string;
  name: string;
  ref: string;
  balanceLabel: string;
};

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((child) => nodeText(child)).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

function matchMember(text: string, members: CopilotMemberRef[]) {
  const key = text.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/g, "").toLowerCase();
  if (!key) return null;
  const matches = members.filter((member) => member.name.toLowerCase() === key);
  return matches.length === 1 ? matches[0] : null;
}

function MemberLink({ member }: { member: CopilotMemberRef }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="font-medium whitespace-nowrap text-navy underline-offset-2 hover:underline"
    >
      {member.name}
    </Link>
  );
}

function MemberRow({ member }: { member: CopilotMemberRef }) {
  const parts = member.name.split(" ");
  const initials = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();

  return (
    <Link
      href={`/members/${member.id}`}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[#F8F9FB]"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-medium text-white">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-navy">
          {member.name}
        </span>
        <span className="block truncate text-[11px] text-muted">
          {member.ref} · {member.balanceLabel}
        </span>
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export function CopilotMarkdown({
  content,
  members,
}: {
  content: string;
  members: CopilotMemberRef[];
}) {
  const paragraphIndex = useRef(0);
  paragraphIndex.current = 0;

  return (
    <div className="text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => {
            const member = matchMember(nodeText(children), members);
            if (member) {
              return (
                <div className="my-1">
                  <MemberRow member={member} />
                </div>
              );
            }

            const index = paragraphIndex.current;
            paragraphIndex.current += 1;

            return (
              <p className={`mb-3 last:mb-0 ${index === 0 ? "text-[15px]" : ""}`}>
                {children}
              </p>
            );
          },
          strong: ({ children }) => {
            const member = matchMember(nodeText(children), members);
            if (member) return <MemberLink member={member} />;
            return <strong className="font-semibold text-navy">{children}</strong>;
          },
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h3 className="mt-4 mb-2 text-sm font-semibold text-navy first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 mb-2 text-sm font-semibold text-navy first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-3 mb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase first:mt-0">
              {children}
            </h4>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-line last:mb-0">
              <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-line bg-[#F8F9FB] text-[11px] tracking-wide text-muted uppercase">
              {children}
            </thead>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-line last:border-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-medium">{children}</th>
          ),
          td: ({ children }) => {
            const member = matchMember(nodeText(children), members);
            return (
              <td className="px-3 py-2 align-middle">
                {member ? <MemberLink member={member} /> : children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
