"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Brain,
  PanelLeft,
  Square,
  SquarePen,
  Trash2,
} from "lucide-react";

import { CopilotMarkdown } from "@/components/copilot/copilot-markdown";
import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toCopilotBook } from "@/lib/copilot-book";
import {
  copilotTitle,
  loadCopilotHistory,
  saveCopilotHistory,
  type CopilotConversation,
} from "@/lib/copilot-history";
import { ghs } from "@/lib/format";
import { streamCopilotAnswer } from "@/lib/stream-copilot";

const SUGGESTIONS = [
  { category: "Work", prompt: "Which members have open work?" },
  { category: "Withdrawals", prompt: "Who has a withdrawal still moving?" },
  { category: "Pots", prompt: "Who holds the largest pots?" },
  { category: "Requests", prompt: "Which requests have no reply?" },
] as const;

const BOOK_PROMPTS = [
  { label: "Open work", prompt: "Which members have open work?" },
  { label: "Withdrawals in motion", prompt: "Who has a withdrawal still moving?" },
  { label: "Largest pots", prompt: "Who holds the largest pots?" },
  { label: "Requests", prompt: "Which requests have no reply?" },
] as const;

const MEMBER_PROMPTS = [
  { label: "Summarise this member", prompt: "Summarise this member" },
  { label: "Open work", prompt: "What work is open for this member?" },
  { label: "Pot", prompt: "What is this member's pot?" },
  { label: "Withdrawal", prompt: "Is a withdrawal still moving?" },
] as const;

function followUps(question: string) {
  const asked = question.toLowerCase();
  if (/withdraw/.test(asked)) {
    return [
      "Which withdrawals are still under review?",
      "Who has the largest withdrawal still moving?",
      "Which requests have no reply?",
    ];
  }
  if (/pot|balance|largest|holds/.test(asked)) {
    return [
      "Which of them have an open request?",
      "Who has a withdrawal still moving?",
      "Who has the smallest pot?",
    ];
  }
  return [
    "Who holds the largest pots?",
    "Which requests have no reply?",
    "Who has a withdrawal still moving?",
  ];
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function CopilotView() {
  const { book: records, members } = useRecords();
  const book = useMemo(
    () => toCopilotBook(records, members.map((member) => member.id)),
    [members, records],
  );
  const memberRefs = useMemo(
    () =>
      book.members.map((member) => ({
        id: member.id,
        name: member.name,
        ref: member.ref,
        balanceLabel: member.balance === null ? "Unavailable" : ghs(member.balance),
      })),
    [book.members],
  );

  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [memberId, setMemberId] = useState("all");
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const active = conversations.find((item) => item.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const history = loadCopilotHistory();
    setConversations(history.conversations);
    setActiveId(history.activeId ?? history.conversations[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveCopilotHistory({ activeId, conversations });
  }, [activeId, conversations, ready]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, requestError]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function patchMessages(
    conversationId: string,
    update: (
      items: CopilotConversation["messages"],
    ) => CopilotConversation["messages"],
  ) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: update(conversation.messages),
              updatedAt: Date.now(),
            }
          : conversation,
      ),
    );
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  function startNewChat() {
    if (isStreaming) return;
    setActiveId(null);
    setQuestion("");
    setRequestError(null);
    setRetryPrompt(null);
    setHistoryOpen(false);
    textareaRef.current?.focus();
  }

  async function ask(prompt: string) {
    const text = prompt.trim();
    if (!text || isStreaming) return;

    const conversationId = activeId ?? crypto.randomUUID();
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const scopeMember = book.members.find((member) => member.id === memberId);
    const source = scopeMember
      ? `Source: ${scopeMember.name}`
      : `Source: ${book.fundName} · ${book.members.length} members`;
    const priorQuestions = messages
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .slice(-6);

    setQuestion("");
    setRequestError(null);
    setRetryPrompt(null);
    setIsStreaming(true);
    setActiveId(conversationId);
    setConversations((current) => {
      const existing = current.find((item) => item.id === conversationId);
      const nextMessages = [
        ...(existing?.messages ?? []),
        { id: userId, role: "user" as const, content: text },
        {
          id: assistantId,
          role: "assistant" as const,
          content: "",
          source,
          streaming: true,
        },
      ];
      const nextConversation: CopilotConversation = {
        id: conversationId,
        title:
          existing && existing.messages.length > 0
            ? existing.title
            : copilotTitle(text),
        messages: nextMessages,
        updatedAt: Date.now(),
      };
      return [
        nextConversation,
        ...current.filter((item) => item.id !== conversationId),
      ];
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamCopilotAnswer(
        {
          question: text,
          memberId: scopeMember?.id ?? null,
          priorQuestions,
          book,
        },
        (partial) => {
          patchMessages(conversationId, (items) =>
            items.map((message) =>
              message.id === assistantId
                ? { ...message, content: partial }
                : message,
            ),
          );
        },
        controller.signal,
      );
      patchMessages(conversationId, (items) =>
        items.map((message) =>
          message.id === assistantId ? { ...message, streaming: false } : message,
        ),
      );
    } catch (error) {
      if (isAbort(error)) {
        patchMessages(conversationId, (items) =>
          items.flatMap((message) => {
            if (message.id !== assistantId) return [message];
            if (!message.content) return [];
            return [{ ...message, streaming: false }];
          }),
        );
        return;
      }

      patchMessages(conversationId, (items) =>
        items.filter((message) => message.id !== assistantId),
      );
      setRetryPrompt(text);
      setRequestError("Couldn't complete that request.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsStreaming(false);
      }
    }
  }

  if (!ready) {
    return <div className="h-full bg-card" />;
  }

  if (book.members.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <EmptyState
          icon={Brain}
          title="No members on your list"
          description="Members you can see appear here. Ask about pots, requests, and withdrawals once a file is open."
        />
      </div>
    );
  }

  const prompts = memberId === "all" ? BOOK_PROMPTS : MEMBER_PROMPTS;
  const lastAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.content && !message.streaming)
    ?.id;

  return (
    <div className="flex h-full min-h-0 bg-card">
      <aside
        className={`${
          historyOpen ? "flex" : "hidden"
        } absolute inset-y-0 left-0 z-20 w-64 flex-col border-r border-line bg-card md:static md:flex`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
          <p className="text-sm font-medium text-navy">Chats</p>
          <button
            type="button"
            aria-label="New chat"
            onClick={startNewChat}
            className="flex size-8 items-center justify-center rounded-md text-navy hover:bg-[#F8F9FB]"
          >
            <SquarePen className="size-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">
              Questions you ask will be listed here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conversations.map((conversation) => {
                const selected = conversation.id === activeId;
                return (
                  <li key={conversation.id} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (isStreaming) return;
                        setActiveId(conversation.id);
                        setRequestError(null);
                        setHistoryOpen(false);
                      }}
                      className={`min-w-0 flex-1 truncate rounded-md px-2.5 py-2 text-left text-sm ${
                        selected
                          ? "bg-navy/5 font-medium text-navy"
                          : "text-foreground hover:bg-[#F8F9FB]"
                      }`}
                    >
                      {conversation.title}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => {
                        setConversations((current) =>
                          current.filter((item) => item.id !== conversation.id),
                        );
                        if (activeId === conversation.id) setActiveId(null);
                      }}
                      className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted opacity-0 hover:bg-[#F8F9FB] hover:text-navy group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {historyOpen ? (
        <button
          type="button"
          aria-label="Close chats"
          className="absolute inset-0 z-10 bg-navy/20 md:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <button
            type="button"
            aria-label="Show chats"
            onClick={() => setHistoryOpen(true)}
            className="flex size-8 items-center justify-center rounded-md text-navy hover:bg-[#F8F9FB] md:hidden"
          >
            <PanelLeft className="size-4" aria-hidden />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-medium tracking-tight text-navy">Copilot</h1>
            <p className="text-xs text-muted">
              Ask about members, open work, and pots.
            </p>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-12 pb-8">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-gold">
                  <Brain className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-medium tracking-tight text-navy">
                    Copilot
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    Ask about the members on {book.fundName}.
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                Pots, requests, and withdrawals are on the book.
              </p>
              <p className="mt-8 text-[11px] font-medium tracking-wide text-muted uppercase">
                Ask about
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.prompt}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => void ask(suggestion.prompt)}
                    className="rounded-md border border-line bg-card px-3 py-2.5 text-left hover:bg-[#F8F9FB] disabled:opacity-50"
                  >
                    <span className="block text-[11px] font-medium tracking-wide text-muted uppercase">
                      {suggestion.category}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-navy">
                      {suggestion.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    className="rounded-md bg-[#F4F6F9] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-navy"
                  >
                    {message.content}
                  </div>
                ) : (
                  <div key={message.id} className="space-y-3">
                    <p className="text-[11px] text-muted">{message.source}</p>
                    {message.content ? (
                      <CopilotMarkdown content={message.content} members={memberRefs} />
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <span className="inline-block size-1.5 rounded-full bg-navy/50 motion-safe:animate-pulse" />
                        {memberId === "all"
                          ? "Reading the book…"
                          : "Reading this member…"}
                      </p>
                    )}
                    {message.streaming && message.content ? (
                      <span className="inline-block h-4 w-0.5 bg-navy/40 align-middle motion-safe:animate-pulse" />
                    ) : null}
                    {message.id === lastAssistantId ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {followUps(
                          [...messages]
                            .slice(0, index)
                            .reverse()
                            .find((item) => item.role === "user")?.content ?? "",
                        ).map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            disabled={isStreaming}
                            onClick={() => void ask(prompt)}
                            className="rounded-full border border-line px-3 py-1 text-xs text-navy hover:bg-[#F8F9FB] disabled:opacity-50"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ),
              )}
              {requestError ? (
                <div className="space-y-2 border-t border-line pt-4">
                  <p className="text-sm font-medium text-navy">{requestError}</p>
                  <p className="text-sm text-muted">Try the question again.</p>
                  {retryPrompt ? (
                    <Button
                      variant="secondary"
                      className="h-9"
                      disabled={isStreaming}
                      onClick={() => void ask(retryPrompt)}
                    >
                      Try again
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-line bg-[#F8F9FB] px-4 py-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {prompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => void ask(item.prompt)}
                  className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-navy hover:bg-white disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-card focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/15">
              <textarea
                ref={textareaRef}
                value={question}
                rows={2}
                autoFocus
                placeholder="Ask about a member, a queue, or a pot"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(question);
                  }
                }}
                className="max-h-40 min-h-18 w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
                <label className="sr-only" htmlFor="copilot-scope">
                  Book scope
                </label>
                <select
                  id="copilot-scope"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                  className="h-8 max-w-56 rounded-md border border-line bg-white px-2 text-sm text-navy outline-none focus:border-navy"
                >
                  <option value="all">Entire book</option>
                  {book.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <div className="ml-auto">
                  {isStreaming ? (
                    <button
                      type="button"
                      aria-label="Stop generating"
                      onClick={stopGenerating}
                      className="flex size-8 items-center justify-center rounded-md bg-navy text-white"
                    >
                      <Square className="size-3.5 fill-current" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Send"
                      disabled={!question.trim()}
                      onClick={() => void ask(question)}
                      className="flex size-8 items-center justify-center rounded-md bg-navy text-white disabled:opacity-40"
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] leading-relaxed text-muted">
              Answers use the member book. Check a figure before you act on it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
