export const GEMINI_MAX_ATTEMPTS = 3;
export const GEMINI_RETRY_BASE_DELAY_MS = 1_500;

type RetryOptions = {
  signal?: AbortSignal;
  wait?: (milliseconds: number) => Promise<void>;
};

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("The request was aborted."));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new Error("The request was aborted."));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function fetchGeminiWithRetries(
  makeRequest: () => Promise<Response>,
  options: RetryOptions = {},
): Promise<Response> {
  const pause = options.wait ?? ((milliseconds: number) => wait(milliseconds, options.signal));

  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt += 1) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new Error("The request was aborted.");
    }

    try {
      const response = await makeRequest();
      if (response.status !== 503 || attempt === GEMINI_MAX_ATTEMPTS - 1) return response;
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (options.signal?.aborted || attempt === GEMINI_MAX_ATTEMPTS - 1) throw error;
    }

    await pause(GEMINI_RETRY_BASE_DELAY_MS * 2 ** attempt);
  }

  throw new Error("The Gemini request failed after all retry attempts.");
}
