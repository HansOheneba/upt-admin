const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";
const REQUEST_TIMEOUT_MS = 25_000;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function parseSseDelta(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;

  const payload = trimmed.slice(6);
  if (payload === "[DONE]") return null;

  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

export function openAiSseToTextStream(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const text = parseSseDelta(line);
          if (text) controller.enqueue(encoder.encode(text));
        }
      },
      flush(controller) {
        if (!buffer.trim()) return;
        const text = parseSseDelta(buffer);
        if (text) controller.enqueue(encoder.encode(text));
      },
    }),
  );
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<
  { ok: true; stream: ReadableStream<Uint8Array> } | { ok: false; message: string }
> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || process.env.DEMO_AI_ENABLED === "false") {
    return { ok: false, message: "Copilot model is not configured." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1200,
        stream: true,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok || !response.body) {
      return {
        ok: false,
        message: `DeepSeek request failed (${response.status}).`,
      };
    }

    return { ok: true, stream: openAiSseToTextStream(response.body) };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      message: timedOut ? "DeepSeek request timed out." : "Unable to reach DeepSeek.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
