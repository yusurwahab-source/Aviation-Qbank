import { describe, expect, it } from "vitest";

import { filterTopics, isWeakTopic, mergeTopics } from "@/lib/topic-tabs";

const t = (topic: string, answered: number, correct: number) => ({
  topic,
  answered,
  correct,
  percentage: answered ? Math.round((correct / answered) * 100) : 0,
});

describe("topic tabs", () => {
  const topics = mergeTopics([t("A", 10, 3), t("B", 10, 9), t("C", 2, 0)], ["A", "B", "C", "D"]);

  it("adds topics never attempted", () => {
    expect(topics.map((x) => x.topic)).toEqual(["A", "B", "C", "D"]);
  });
  it("calls weak only with enough answers and a low score", () => {
    expect(isWeakTopic(t("C", 2, 0))).toBe(false);
    expect(isWeakTopic(t("A", 10, 3))).toBe(true);
    expect(isWeakTopic(t("E", 5, 3))).toBe(false);
  });
  it("filters each tab", () => {
    expect(filterTopics(topics, "weak").map((x) => x.topic)).toEqual(["A"]);
    expect(filterTopics(topics, "progress").map((x) => x.topic)).toEqual(["B", "C"]);
    expect(filterTopics(topics, "all")).toHaveLength(4);
  });
});
