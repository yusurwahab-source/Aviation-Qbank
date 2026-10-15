"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useMemo, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";

import { Card } from "@/components/ui";
import { MAX_AI_SEARCH_QUERY_LENGTH } from "@/lib/ai-search";

const RATE_LIMIT_MESSAGE = "You reached the limit of 3 requests per minute. Please wait.";
const MAX_PILOT_CONTEXT_LENGTH = 5_000;

export function AiSearchForm() {
  const [input, setInput] = useState("");
  const [pilotContext, setPilotContext] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          if (response.status === 429) window.alert(RATE_LIMIT_MESSAGE);
          return response;
        },
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    setInput("");
    void sendMessage({ text: query }, { body: { pilotContext } });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="ai-search-input" className="sr-only">
          Ask an aviation question
        </label>
        <input
          id="ai-search-input"
          name="query"
          type="search"
          maxLength={MAX_AI_SEARCH_QUERY_LENGTH}
          required
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
          placeholder="Ask an aviation question…"
          className="tap-target min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
        />
        <button
          id="ai-search-btn"
          type="submit"
          disabled={isLoading}
          className="tap-target shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Searching…" : "Ask"}
        </button>
      </form>

      <details className="mt-3">
        <summary className="tap-target cursor-pointer text-sm font-medium text-muted-foreground">
          Add optional pilot context
        </summary>
        <label htmlFor="ai-search-context" className="mt-2 block text-sm text-muted-foreground">
          The assistant also searches PilotQBank&apos;s local aviation content.
        </label>
        <textarea
          id="ai-search-context"
          value={pilotContext}
          maxLength={MAX_PILOT_CONTEXT_LENGTH}
          onChange={(event) => setPilotContext(event.target.value)}
          disabled={isLoading}
          rows={3}
          className="mt-2 w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground focus:border-brand focus:outline-none disabled:opacity-60"
        />
      </details>

      <div
        id="ai-response-box"
        aria-live="polite"
        aria-busy={isLoading}
        className="mt-4 space-y-4 rounded-lg bg-surface-elevated p-4 text-sm text-foreground"
      >
        {isLoading ? <p>Generating aviation guidance…</p> : null}
        {error ? <p role="alert" className="text-danger">{error.message}</p> : null}
        {messages.map((message) => {
          const text = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("");
          if (!text) return null;

          return (
            <div key={message.id} className="space-y-1">
              <p className="font-semibold">{message.role === "user" ? "You" : "PilotQBank AI"}</p>
              <div className="space-y-3 leading-6 [&_a]:text-brand [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:whitespace-pre-wrap [&_ul]:list-disc">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && messages.length === 0 ? (
          <p className="text-muted-foreground">Your answer will appear here.</p>
        ) : null}
      </div>
    </Card>
  );
}
