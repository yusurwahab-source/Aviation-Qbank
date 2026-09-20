import { contentCategorySchema } from "@/content/schema";

export type ContentCategory = "type-rating" | "light-aircraft" | "flying-knowledge";
export type ContentCategoryQueryValue = "type-ratings" | "class-ratings" | "general-subjects";

const CATEGORY_ALIASES: Record<string, ContentCategory> = {
  "type-rating": "type-rating",
  "type-ratings": "type-rating",
  "light-aircraft": "light-aircraft",
  "class-rating": "light-aircraft",
  "class-ratings": "light-aircraft",
  "flying-knowledge": "flying-knowledge",
  "general-subject": "flying-knowledge",
  "general-subjects": "flying-knowledge",
};

export function parseContentCategory(value: string | null | undefined): ContentCategory | null {
  const parsed = contentCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function resolveContentCategory(
  value: string | string[] | null | undefined,
): ContentCategory {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = parseContentCategory(first);
  if (parsed) return parsed;
  if (typeof first === "string") {
    const alias = CATEGORY_ALIASES[first.trim().toLowerCase()];
    if (alias) return alias;
  }
  return "type-rating";
}

export function categoryQueryValue(category: ContentCategory): ContentCategoryQueryValue {
  switch (category) {
    case "type-rating":
      return "type-ratings";
    case "light-aircraft":
      return "class-ratings";
    case "flying-knowledge":
      return "general-subjects";
  }
}
