export type CopilotChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  streaming?: boolean;
};

export type CopilotConversation = {
  id: string;
  title: string;
  messages: CopilotChatMessage[];
  updatedAt: number;
};

export type CopilotHistory = {
  activeId: string | null;
  conversations: CopilotConversation[];
};

const STORAGE_KEY = "upt.copilot.history.v1";
const LIMIT = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function copilotTitle(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (compact.length <= 42) return compact || "New chat";
  return `${compact.slice(0, 41).trimEnd()}…`;
}

function readMessages(value: unknown): CopilotChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((message) => {
    if (!isRecord(message)) return [];
    if (message.role !== "user" && message.role !== "assistant") return [];
    if (typeof message.id !== "string" || typeof message.content !== "string") {
      return [];
    }

    return [
      {
        id: message.id,
        role: message.role,
        content: message.content,
        source: typeof message.source === "string" ? message.source : undefined,
      },
    ];
  });
}

function readConversation(value: unknown): CopilotConversation | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.title !== "string") return null;

  return {
    id: value.id,
    title: value.title,
    messages: readMessages(value.messages),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  };
}

export function loadCopilotHistory(): CopilotHistory {
  if (typeof window === "undefined") {
    return { activeId: null, conversations: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeId: null, conversations: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.conversations)) {
      return { activeId: null, conversations: [] };
    }

    const conversations = parsed.conversations
      .map(readConversation)
      .filter((item): item is CopilotConversation => item !== null)
      .slice(0, LIMIT);
    const activeId =
      typeof parsed.activeId === "string" &&
      conversations.some((item) => item.id === parsed.activeId)
        ? parsed.activeId
        : null;

    return { activeId, conversations };
  } catch {
    return { activeId: null, conversations: [] };
  }
}

export function saveCopilotHistory(history: CopilotHistory) {
  if (typeof window === "undefined") return;

  const conversations = history.conversations.slice(0, LIMIT).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages
      .filter((message) => message.content.trim().length > 0 && !message.streaming)
      .map(({ id, role, content, source }) => ({ id, role, content, source })),
  }));

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      activeId: history.activeId,
      conversations,
    }),
  );
}
