/**
 * How the progress page sorts topics into tabs. Pure, so the thresholds are
 * asserted rather than trusted.
 *
 * - Weak areas: at least `MIN_ANSWERED_FOR_WEAK` answers and under
 *   `WEAK_BELOW_PERCENT` correct. Fewer answers is too little to call weak.
 * - In progress: attempted, but not weak.
 * - All systems: everything, including topics never attempted.
 */
export const WEAK_BELOW_PERCENT = 60;
export const MIN_ANSWERED_FOR_WEAK = 5;

export type TopicTab = "all" | "weak" | "progress";

export type TabTopic = { topic: string; answered: number; correct: number; percentage: number };

export function isWeakTopic(topic: TabTopic): boolean {
  return topic.answered >= MIN_ANSWERED_FOR_WEAK && topic.percentage < WEAK_BELOW_PERCENT;
}

/** Merge attempted topics with every topic name; never-attempted ones get zeros. */
export function mergeTopics(attempted: readonly TabTopic[], allNames: readonly string[] = []): TabTopic[] {
  const seen = new Set(attempted.map((topic) => topic.topic));
  const untouched = allNames
    .filter((name) => !seen.has(name))
    .map((name) => ({ topic: name, answered: 0, correct: 0, percentage: 0 }));
  return [...attempted, ...untouched];
}

export function filterTopics(topics: readonly TabTopic[], tab: TopicTab): TabTopic[] {
  if (tab === "all") return [...topics];
  if (tab === "weak") return topics.filter(isWeakTopic);
  return topics.filter((topic) => topic.answered > 0 && !isWeakTopic(topic));
}
