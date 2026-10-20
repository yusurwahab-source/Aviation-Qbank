import type { Unit } from "./types";

export const UNITS: Unit[] = [
  {
    id: "unit-1",
    order: 1,
    title: "Radiotelephony Basics",
    summary: "Standard phraseology, numbers, the phonetic alphabet and readbacks.",
    lessonIds: ["u1-l1", "u1-l2", "u1-l3"],
  },
  {
    id: "unit-2",
    order: 2,
    title: "Plain English & Non-Routine Situations",
    summary: "Saying what is wrong, clearly, when phraseology does not cover it.",
    lessonIds: ["u2-l1", "u2-l2", "u2-l3"],
  },
  {
    id: "unit-3",
    order: 3,
    title: "Interaction & Role-play",
    summary: "Checking, confirming, clarifying and negotiating with controllers.",
    lessonIds: ["u3-l1", "u3-l2", "u3-l3"],
  },
  {
    id: "unit-4",
    order: 4,
    title: "Full Simulation",
    summary: "Putting it together: a full flight-phase simulation and an exam walkthrough.",
    lessonIds: ["u4-l1", "u4-l2"],
  },
];

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}
