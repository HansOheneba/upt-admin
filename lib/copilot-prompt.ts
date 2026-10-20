import {
  buildBookContext,
  buildMemberContext,
  fallbackAnswer,
  resolveMentionedMembers,
  type CopilotBook,
  type CopilotMember,
} from "@/lib/copilot-book";
import type { ChatMessage } from "@/lib/deepseek";

export const COPILOT_NAME = "Copilot";

const VOICE = [
  "Voice: you are a senior scheme analyst talking to one scheme officer, as if you were across the desk. Address them as you.",
  "Lead with the judgment, not a tour of the figures. They can read the balances on the member record. The judgment can be a person, a queue, a pattern, or a next step.",
  "Put the direct answer in the first sentence when the question has one.",
  "Be specific when the book supports it. Plain words only. Mention a figure only when it changes the action.",
  "Do not use em dashes. Use full stops or commas.",
  "Do not open with Certainly, Of course, or Great question. Do not close with Let me know if or I hope this helps.",
  "Never narrate what the book does not include. Answer from what is supplied and stop.",
  "Do not invent members, balances, requests, withdrawals, dates, or contact details.",
  "This is scheme administration. Do not give investment advice.",
  "Quote the precomputed rankings and counts in the order supplied. Do not recompute them.",
  "Money is Ghana cedis. When you cite a figure, keep the GH₵ amount from the book.",
].join(" ");

const FORMAT = [
  "Break the answer into three parts, in this order.",
  "1. One or two sentences with the call. Bold every member name with **Name**, using the full name from the book. Bold the action that matters, for example **move the withdrawal to review** or **reply to the request**.",
  "2. When two or more members are being compared, a markdown table of only the columns that answer the question. Bold the names in the first column.",
  "3. One short last sentence with the practical next step. Follow the closer cue. Do not repeat the whole ranking.",
  "For a single member, skip the table. Use the opener and the closer. Still bold the name and the action.",
  "A short bullet list is only for distinct next steps, three at most.",
  "Do not write an essay.",
].join(" ");

const CLOSER_CUES = [
  "Last sentence: the file to clear first, then the member it belongs to.",
  "Last sentence: one practical next step. Do not repeat the names from the opening.",
  "Last sentence: who can wait, and why their file does not need a decision today.",
  "Last sentence: the constraint that makes this worth acting on, then the name.",
];

export function prepareCopilotTurn(
  question: string,
  book: CopilotBook,
  memberId: string | null,
  priorQuestions: string[],
): { messages: ChatMessage[]; fallback: string; focusId: string | null } {
  const selected =
    memberId === null
      ? null
      : (book.members.find((member) => member.id === memberId) ?? null);
  const mentioned = resolveMentionedMembers(question, book.members);
  const focus: CopilotMember | null =
    selected ?? (mentioned.length === 1 ? mentioned[0] : null);
  const closer = CLOSER_CUES[Math.floor(Math.random() * CLOSER_CUES.length)];
  const earlier =
    priorQuestions.length > 0
      ? `Earlier questions in this chat:\n${priorQuestions
          .map((item) => `- ${item}`)
          .join("\n")}\n\n`
      : "";

  const instruction = focus
    ? "Answer using only this member's dossier and the fund line. Do not invent gaps."
    : "Answer using only the book supplied. Treat omitted sections as out of scope.";

  const context = focus
    ? buildMemberContext(book, focus)
    : buildBookContext(book, mentioned.length > 1 ? mentioned : []);

  return {
    messages: [
      {
        role: "system",
        content: `You are ${COPILOT_NAME} for United Pension Trustees. ${VOICE} ${FORMAT}`,
      },
      {
        role: "user",
        content: `${instruction}\n\nCloser cue: ${closer}\n\n${earlier}Question: ${question}\n\n${context}`,
      },
    ],
    fallback: fallbackAnswer(question, book, focus),
    focusId: focus?.id ?? null,
  };
}
