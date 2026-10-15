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
      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        "answer" in result &&
        typeof result.answer === "string" &&
        response.ok
      ) {
        setAnswer(result.answer);
      } else {
        setError(
          typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
            ? result.error
            : "The search could not be completed. Please try again.",
        );
      }
    } catch {
      setError("The search could not be completed. Check your connection and try again.");
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
