import type { CopilotBook } from "@/lib/copilot-book";

const REVEAL_INTERVAL_MS = 36;

function waitForReveal(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, REVEAL_INTERVAL_MS);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function nextRevealEnd(shown: number, full: string) {
  const behind = full.length - shown;
  const step = behind > 240 ? 14 : behind > 80 ? 8 : 4;
  let end = Math.min(full.length, shown + step);

  if (end < full.length && !/\s/.test(full[end - 1] ?? "")) {
    const breakAt = full.slice(end, end + 16).search(/\s/);
    if (breakAt >= 0) end += breakAt + 1;
  }

  return end;
}

export async function streamCopilotAnswer(
  input: {
    question: string;
    memberId: string | null;
    priorQuestions: string[];
    book: CopilotBook;
  },
  onChunk: (partial: string) => void,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/copilot/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Copilot request failed.");
  }

  if (!response.body) {
    throw new Error("Copilot returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = "";
  let shown = 0;
  let streamEnded = false;
  let readError: unknown = null;

  const reading = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
      }
      received += decoder.decode();
    } catch (error) {
      readError = error;
    } finally {
      streamEnded = true;
    }
  })();

  try {
    while (!streamEnded || shown < received.length) {
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      if (shown < received.length) {
        shown = nextRevealEnd(shown, received);
        onChunk(received.slice(0, shown));
      }

      if (streamEnded && shown >= received.length) break;
      await waitForReveal(signal);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  await reading;

  if (readError) throw readError;
  return received;
}
