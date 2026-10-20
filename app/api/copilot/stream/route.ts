import { readCopilotBook } from "@/lib/copilot-book";
import { prepareCopilotTurn } from "@/lib/copilot-prompt";
import { streamChatCompletion } from "@/lib/deepseek";

type StreamBody = {
  question?: unknown;
  memberId?: unknown;
  priorQuestions?: unknown;
  book?: unknown;
};

function priorQuestionsFrom(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(-6);
}

export async function POST(request: Request) {
  let body: StreamBody;

  try {
    body = (await request.json()) as StreamBody;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return new Response("Ask a question to get started.", { status: 400 });
  }
  if (question.length > 2000) {
    return new Response("Ask a shorter question.", { status: 400 });
  }

  const book = readCopilotBook(body.book);
  if (!book) {
    return new Response("The member book could not be read.", { status: 400 });
  }

  const memberId =
    typeof body.memberId === "string" && body.memberId.length > 0
      ? body.memberId
      : null;

  const prepared = prepareCopilotTurn(
    question,
    book,
    memberId,
    priorQuestionsFrom(body.priorQuestions),
  );

  const live = await streamChatCompletion(prepared.messages);
  const encoder = new TextEncoder();
  const stream = live.ok
    ? live.stream
    : new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(prepared.fallback));
          controller.close();
        },
      });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
