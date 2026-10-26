"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState, type ReactNode } from "react";

import { PostBody } from "@/components/posts/post-body";
import {
  POST_KIND_LABEL,
  POST_KIND_PATH,
  SUGGESTED_CATEGORIES,
  slugify,
  type PostKind,
  type PostStatus,
} from "@/lib/posts";

import { savePostAction, unpublishPostAction, type PostEditorState, type UnpublishState } from "./actions";

/**
 * The owner's editor for one Blog post or Article.
 *
 * Every field is controlled, deliberately: React resets an uncontrolled form
 * after a form action completes, which would wipe the owner's text the
 * moment a save came back with a validation message. Here the text stays
 * exactly as typed whatever the server answers.
 *
 * Built to be used on a phone: one column, full-width fields, a Write /
 * Preview switch for the text, and the save buttons in a bar that stays at
 * the bottom of the screen.
 */

export type EditorValues = {
  kind: PostKind;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  coverImageAlt: string;
  category: string;
  tags: string;
  references: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedOn: string;
  publishedOn: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-subtle-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const labelClass = "block text-sm font-medium text-foreground";
const hintClass = "mt-1 text-xs text-muted-foreground";

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs tabular-nums ${value.length > max ? "text-danger" : "text-subtle-foreground"}`}>
      {value.length}/{max}
    </span>
  );
}

export function PostEditor({
  id,
  status,
  initial,
}: {
  id: string | null;
  status: PostStatus | null;
  initial: EditorValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<EditorValues>(initial);
  const [slugTouched, setSlugTouched] = useState(id !== null || initial.slug !== "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  // The post's status as the owner last left it: the page's value, then
  // whatever the latest save or unpublish reported. Updated inside the
  // actions themselves rather than in an effect watching their results.
  const [currentStatus, setCurrentStatus] = useState<PostStatus | null>(status);
  const isPublished = currentStatus === "published";

  const [state, formAction, pending] = useActionState<PostEditorState, FormData>(
    async (previous, formData) => {
      const next = await savePostAction(previous, formData);
      if (next.status) setCurrentStatus(next.status);
      if (next.redirectTo) router.replace(next.redirectTo);
      return next;
    },
    {},
  );

  const set = <K extends keyof EditorValues>(key: K, value: EditorValues[K]) =>
    setValues((previous) => {
      const next = { ...previous, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });

  const base = POST_KIND_PATH[values.kind];
  const label = POST_KIND_LABEL[values.kind].singular;

  return (
    <div className="font-reading pb-28">
      <form
        onSubmit={(event) => {
          // Submitted by hand rather than through the form's `action`
          // prop: React resets a form after an action completes, and that
          // reset puts the <select> back to its first option on screen
          // even though it is controlled — the next save would then send
          // the wrong type. Calling the action from a transition here
          // keeps every field exactly as the owner left it.
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const formData = new FormData(event.currentTarget, submitter);
          startTransition(() => formAction(formData));
        }}
        className="space-y-6"
        noValidate
      >
        {id ? <input type="hidden" name="id" value={id} /> : null}
        <input type="hidden" name="featured" value={values.featured ? "on" : ""} />

        {state.errors && state.errors.length > 0 ? (
          <div role="alert" className="rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger">
            <p className="font-semibold">Not saved yet:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {state.message && !state.errors ? (
          <p role="status" className="rounded-xl border border-success bg-success-soft p-4 text-sm text-success">
            {state.message}
          </p>
        ) : null}

        <Field label="Type" htmlFor="kind">
          <select
            id="kind"
            name="kind"
            value={values.kind}
            onChange={(e) => set("kind", e.target.value as PostKind)}
            className={inputClass}
          >
            <option value="blog">Blog post — news and announcements</option>
            <option value="article">Article — theory, regulations, guidance</option>
          </select>
        </Field>

        <Field label="Title" htmlFor="title">
          <input id="title" name="title" value={values.title} onChange={(e) => set("title", e.target.value)} className={inputClass} required maxLength={200} />
        </Field>

        <Field
          label="Address"
          htmlFor="slug"
          hint={
            isPublished
              ? `Changing this changes the page's link: ${base}/${values.slug || "…"}. Old links will stop working.`
              : `The page will be at ${base}/${values.slug || "…"}. Filled from the title until you change it.`
          }
        >
          <input
            id="slug"
            name="slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.toLowerCase());
            }}
            className={`${inputClass} font-mono text-sm`}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={120}
          />
        </Field>

        <Field label="Short description" htmlFor="excerpt" hint="Shown on cards and in search results. One or two sentences.">
          <textarea id="excerpt" name="excerpt" value={values.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={3} className={inputClass} />
          <div className="mt-1 text-right">
            <Counter value={values.excerpt} max={320} />
          </div>
        </Field>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label htmlFor="body" className={labelClass}>
              Text
            </label>
            <div role="tablist" aria-label="Text view" className="inline-flex rounded-lg border border-border p-0.5">
              {(["write", "preview"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  onClick={() => setTab(name)}
                  className={`min-h-9 rounded-md px-3 text-sm font-medium ${tab === name ? "bg-brand text-on-solid" : "text-muted-foreground"}`}
                >
                  {name === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="body"
            name="body"
            value={values.body}
            onChange={(e) => set("body", e.target.value)}
            rows={18}
            className={`${inputClass} min-h-80 font-mono text-sm leading-relaxed ${tab === "write" ? "" : "hidden"}`}
          />
          {tab === "preview" ? (
            <div className="mt-1 min-h-80 rounded-lg border border-border bg-surface p-4">
              {values.body.trim() === "" ? <p className="text-sm text-muted-foreground">Nothing to preview yet.</p> : <PostBody markdown={values.body} />}
            </div>
          ) : null}
          <p className={hintClass}>
            Markdown: <code>## Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- list</code>,{" "}
            <code>[link](https://…)</code>. Write in your own words; for news, summarise and link the source below.
          </p>
        </div>

        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">Cover image (optional)</legend>
          <Field label="Image link" htmlFor="coverImageUrl" hint="A 1200×675 image, starting with https://. Leave empty to use the section's default image.">
            <input id="coverImageUrl" name="coverImageUrl" value={values.coverImageUrl} onChange={(e) => set("coverImageUrl", e.target.value)} className={inputClass} inputMode="url" autoCapitalize="none" />
          </Field>
          <Field label="Image description (alt text)" htmlFor="coverImageAlt" hint="What the image shows, for readers who cannot see it.">
            <input id="coverImageAlt" name="coverImageAlt" value={values.coverImageAlt} onChange={(e) => set("coverImageAlt", e.target.value)} className={inputClass} maxLength={200} />
          </Field>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" hint="Pick one or type your own.">
            <input id="category" name="category" list={`categories-${values.kind}`} value={values.category} onChange={(e) => set("category", e.target.value)} className={inputClass} maxLength={60} />
            <datalist id={`categories-${values.kind}`}>
              {SUGGESTED_CATEGORIES[values.kind].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Tags" htmlFor="tags" hint="Separated by commas. Up to 10.">
            <input id="tags" name="tags" value={values.tags} onChange={(e) => set("tags", e.target.value)} className={inputClass} />
          </Field>
        </div>

        {values.kind === "blog" ? (
          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">News source (for news posts)</legend>
            <Field label="Source name" htmlFor="sourceName" hint="e.g. the publication or authority that reported it.">
              <input id="sourceName" name="sourceName" value={values.sourceName} onChange={(e) => set("sourceName", e.target.value)} className={inputClass} maxLength={120} />
            </Field>
            <Field label="Source link" htmlFor="sourceUrl">
              <input id="sourceUrl" name="sourceUrl" value={values.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} className={inputClass} inputMode="url" autoCapitalize="none" />
            </Field>
            <Field label="Source date" htmlFor="sourcePublishedOn">
              <input id="sourcePublishedOn" name="sourcePublishedOn" type="date" value={values.sourcePublishedOn} onChange={(e) => set("sourcePublishedOn", e.target.value)} className={inputClass} />
            </Field>
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="sourceName" value="" />
            <input type="hidden" name="sourceUrl" value="" />
            <input type="hidden" name="sourcePublishedOn" value="" />
          </>
        )}

        <Field
          label="References"
          htmlFor="references"
          hint="One per line: Title | https://link | Publisher | YYYY-MM-DD (publisher and date optional). Use real sources only."
        >
          <textarea id="references" name="references" value={values.references} onChange={(e) => set("references", e.target.value)} rows={4} className={`${inputClass} font-mono text-sm`} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publication date" htmlFor="publishedOn" hint="Optional. Empty means the day you publish. A future date schedules it.">
            <input id="publishedOn" name="publishedOn" type="date" value={values.publishedOn} onChange={(e) => set("publishedOn", e.target.value)} className={inputClass} />
          </Field>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="featuredBox"
              type="checkbox"
              checked={values.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-5 w-5 rounded border-border accent-brand"
            />
            <label htmlFor="featuredBox" className="text-sm text-foreground">
              Featured (a badge in the owner list only; the homepage always shows the newest articles)
            </label>
          </div>
        </div>

        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Search engine settings (optional)</summary>
          <div className="mt-4 space-y-4">
            <Field label="Search title" htmlFor="seoTitle" hint="Empty uses the title.">
              <input id="seoTitle" name="seoTitle" value={values.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={inputClass} maxLength={70} />
            </Field>
            <Field label="Search description" htmlFor="seoDescription" hint="Empty uses the short description.">
              <textarea id="seoDescription" name="seoDescription" value={values.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={2} className={inputClass} maxLength={170} />
            </Field>
          </div>
        </details>

        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-elevated/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
            <span className="mr-auto text-xs text-muted-foreground">
              {label} · {currentStatus === "published" ? "Published" : currentStatus === "draft" ? "Draft" : "New"}
            </span>
            {id ? (
              <Link
                href={`/owner/content/${id}/preview`}
                target="_blank"
                className="tap-target inline-flex items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:border-brand"
              >
                Preview
              </Link>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="tap-target inline-flex items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-60"
            >
              {isPublished ? "Save changes" : "Save draft"}
            </button>
            {!isPublished ? (
              <button
                type="submit"
                name="intent"
                value="publish"
                disabled={pending}
                className="tap-target inline-flex items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid hover:bg-brand-strong disabled:opacity-60"
              >
                Publish
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {id && isPublished ? <UnpublishForm id={id} onUnpublished={() => setCurrentStatus("draft")} /> : null}
    </div>
  );
}

/** Two steps, and the server checks the confirmation too. */
function UnpublishForm({ id, onUnpublished }: { id: string; onUnpublished: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<UnpublishState, FormData>(async (previous, formData) => {
    const next = await unpublishPostAction(previous, formData);
    if (next.message) onUnpublished();
    return next;
  }, {});

  return (
    <form action={formAction} className="mt-8 rounded-xl border border-border p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-muted-foreground">
        Unpublishing takes the page off the site and makes it a draft again. You can publish it again later.
      </p>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
      {state.message ? <p className="mt-2 text-sm text-success">{state.message}</p> : null}
      <div className="mt-3 flex gap-2">
        {confirming ? (
          <>
            <button
              key="confirm"
              type="submit"
              name="confirmed"
              value="yes"
              disabled={pending}
              className="tap-target inline-flex items-center rounded-lg bg-danger px-4 text-sm font-semibold text-on-danger disabled:opacity-60"
            >
              Yes, unpublish
            </button>
            <button key="cancel" type="button" onClick={() => setConfirming(false)} className="tap-target inline-flex items-center rounded-lg border border-border px-4 text-sm">
              Cancel
            </button>
          </>
        ) : (
          <button key="ask" type="button" onClick={() => setConfirming(true)} className="tap-target inline-flex items-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger">
            Unpublish
          </button>
        )}
      </div>
    </form>
  );
}
