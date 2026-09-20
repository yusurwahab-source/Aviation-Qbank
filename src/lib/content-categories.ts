import { contentCategorySchema } from "@/content/schema";

export type ContentCategory = "type-rating" | "light-aircraft" | "flying-knowledge";

export function parseContentCategory(value: string | null | undefined): ContentCategory | null {
  const parsed = contentCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function resolveContentCategory(
  value: string | string[] | null | undefined,
): ContentCategory {
  const first = Array.isArray(value) ? value[0] : value;
  return parseContentCategory(first) ?? "type-rating";
}
