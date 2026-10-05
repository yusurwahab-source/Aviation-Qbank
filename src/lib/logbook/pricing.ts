/**
 * What one extraction cost, for the owner's own log. Pure.
 *
 * Anthropic's first-party list prices, US dollars per million tokens, as
 * published when this was written. A model not listed here is logged with
 * its token counts and a null cost rather than a guessed one — update this
 * table when `LOGBOOK_MODEL` is pointed at something new.
 */
export const MODEL_PRICES_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-fable-5-1": { input: 10, output: 50 },
};

export const DEFAULT_LOGBOOK_MODEL = "claude-sonnet-5-5";

/** Cost in micro-dollars (millionths of a dollar), so it stores as an integer. */
export function costMicroUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number },
): number | null {
  const price = MODEL_PRICES_PER_MTOK[model];
  if (!price) return null;
  // Cache reads bill at a tenth of input and writes at 1.25×.
  const input =
    usage.inputTokens * price.input +
    (usage.cacheReadTokens ?? 0) * price.input * 0.1 +
    (usage.cacheWriteTokens ?? 0) * price.input * 1.25;
  return Math.round(input + usage.outputTokens * price.output);
}

export function formatMicroUsd(value: number | null): string {
  if (value === null) return "—";
  return `$${(value / 1_000_000).toFixed(4)}`;
}
