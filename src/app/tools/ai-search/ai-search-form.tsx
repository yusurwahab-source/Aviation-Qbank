"use client";

import { useState, type FormEvent } from "react";

import { Card } from "@/components/ui";
import { MAX_AI_SEARCH_QUERY_LENGTH } from "@/lib/ai-search";

export function AiSearchForm() {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") ?? "").trim();
    if (!query) return;

    setSearching(true);
    setAnswer("");
    setError("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        setError(
          typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
            ? result.error
            : "The search could not be completed. Please try again.",
        );
        return;
      }

      if (!response.body) throw new Error("The response did not include a stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = false;

      const readEvent = (event: string) => {
        const lines = event.split(/\r?\n/);
        const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const data = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) return;

        const payload: unknown = JSON.parse(data);
        if (typeof payload !== "object" || payload === null) return;
        if (eventName === "error" && "error" in payload && typeof payload.error === "string") {
          throw new Error(payload.error);
        }
        if ("text" in payload && typeof payload.text === "string") {
          receivedText = true;
          setAnswer((current) => current + payload.text);
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          let boundary = buffer.search(/\r?\n\r?\n/);
          while (boundary !== -1) {
            const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
            readEvent(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + separator.length);
            boundary = buffer.search(/\r?\n\r?\n/);
          }
          if (done) {
            if (buffer.trim()) readEvent(buffer);
            break;
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!receivedText) setError("Gemini did not return text. Please try again.");
    } catch {
      setError("The AI response was interrupted. Please try again.");
    } finally {
      setSearching(false);
    }
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
          placeholder="Ask an aviation question…"
          className="tap-target min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
        />
        <button
          id="ai-search-btn"
          type="submit"
          disabled={searching}
          className="tap-target shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60"
        >
          {searching ? "Searching…" : "Ask"}
        </button>
      </form>

      <div
        id="ai-response-box"
        aria-live="polite"
        aria-busy={searching}
        className="mt-4 rounded-lg bg-surface-elevated p-4 text-sm text-foreground"
      >
        {searching ? <p>Generating aviation guidance…</p> : null}
        {error ? <p role="alert" className="text-danger">{error}</p> : null}
        {answer ? <p className="whitespace-pre-wrap">{answer}</p> : null}
        {!searching && !error && !answer ? (
          <p className="text-muted-foreground">Your answer will appear here.</p>
        ) : null}
      </div>
    </Card>
  );
}
