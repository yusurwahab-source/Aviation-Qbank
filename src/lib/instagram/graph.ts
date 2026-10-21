/**
 * The Instagram Graph API, as far as publishing needs it.
 *
 * `fetch` is passed in, like the Anthropic client in `lib/logbook/claude.ts`,
 * so the whole publish sequence is tested against a stand-in and no test ever
 * reaches Meta.
 *
 * Publishing is always the same three steps: create a media *container* from
 * an image URL Instagram can fetch, wait for it to finish processing, then
 * publish the container. A carousel is the same with a container per slide
 * and one more container that lists them.
 */

export const GRAPH_VERSION = "v23.0";
const GRAPH_HOST = "https://graph.facebook.com";

export type InstagramClient = {
  publishImage(input: { imageUrl: string; caption: string }): Promise<PublishedPost>;
  publishCarousel(input: { imageUrls: string[]; caption: string }): Promise<PublishedPost>;
};

export type PublishedPost = { mediaId: string; permalink: string | null };

export class InstagramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramError";
  }
}

type Options = {
  accountId: string;
  accessToken: string;
  fetch?: typeof fetch;
  /** Milliseconds between status checks. Tests pass 0. */
  pollIntervalMs?: number;
  maxPolls?: number;
};

export function createInstagramClient(options: Options): InstagramClient {
  const doFetch = options.fetch ?? fetch;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const maxPolls = options.maxPolls ?? 15;

  async function call(method: "GET" | "POST", path: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, access_token: options.accessToken });
    const url = `${GRAPH_HOST}/${GRAPH_VERSION}/${path}`;
    const response =
      method === "GET"
        ? await doFetch(`${url}?${query}`)
        : await doFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: query,
          });

    const body = (await response.json().catch(() => null)) as
      | (Record<string, unknown> & { error?: { message?: string; code?: number } })
      | null;

    if (!response.ok || !body || body.error) {
      // Meta's message names the problem (an expired token, a bad image URL);
      // the token itself is never in it, and never logged here.
      throw new InstagramError(
        `Instagram ${path.split("/").pop()} failed (${response.status}): ${body?.error?.message ?? "no detail"}`,
      );
    }
    return body;
  }

  async function createContainer(params: Record<string, string>): Promise<string> {
    const body = await call("POST", `${options.accountId}/media`, params);
    if (typeof body.id !== "string") throw new InstagramError("Instagram returned no container id.");
    return body.id;
  }

  async function waitUntilReady(containerId: string): Promise<void> {
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      const body = await call("GET", containerId, { fields: "status_code" });
      if (body.status_code === "FINISHED") return;
      if (body.status_code === "ERROR" || body.status_code === "EXPIRED") {
        throw new InstagramError(`Instagram could not process the media (${String(body.status_code)}).`);
      }
      if (pollIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new InstagramError("Instagram took too long to process the media.");
  }

  async function publish(containerId: string): Promise<PublishedPost> {
    await waitUntilReady(containerId);
    const published = await call("POST", `${options.accountId}/media_publish`, {
      creation_id: containerId,
    });
    if (typeof published.id !== "string") throw new InstagramError("Instagram returned no media id.");

    // A missing permalink is cosmetic; the post is already live by now.
    const detail = await call("GET", published.id, { fields: "permalink" }).catch(() => null);
    return {
      mediaId: published.id,
      permalink: typeof detail?.permalink === "string" ? detail.permalink : null,
    };
  }

  return {
    async publishImage({ imageUrl, caption }) {
      return publish(await createContainer({ image_url: imageUrl, caption }));
    },

    async publishCarousel({ imageUrls, caption }) {
      if (imageUrls.length < 2 || imageUrls.length > 10) {
        throw new InstagramError("A carousel needs between 2 and 10 images.");
      }
      const children: string[] = [];
      for (const imageUrl of imageUrls) {
        children.push(await createContainer({ image_url: imageUrl, is_carousel_item: "true" }));
      }
      for (const child of children) await waitUntilReady(child);

      return publish(
        await createContainer({
          media_type: "CAROUSEL",
          children: children.join(","),
          caption,
        }),
      );
    },
  };
}
