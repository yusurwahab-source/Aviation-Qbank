"use client";

import { Badge } from "@/components/ui";
import { useAviationEnglishState } from "@/lib/aviation-english/storage";

export function LessonDoneBadge({ lessonId }: { lessonId: string }) {
  const state = useAviationEnglishState();
  return state.completedLessons.includes(lessonId) ? <Badge tone="correct">Done</Badge> : null;
}
