import { describe, expect, it } from "vitest";

import { optionIndexForKey, shouldHandleShortcut } from "@/lib/keyboard-shortcuts";

describe("optionIndexForKey", () => {
  it("maps 1-4 to indices 0-3", () => {
    expect(optionIndexForKey("1")).toBe(0);
    expect(optionIndexForKey("4")).toBe(3);
  });

  it("maps A-D and a-d to the same indices, case-insensitively", () => {
    expect(optionIndexForKey("A")).toBe(0);
    expect(optionIndexForKey("a")).toBe(0);
    expect(optionIndexForKey("D")).toBe(3);
    expect(optionIndexForKey("d")).toBe(3);
  });

  it("agrees between the digit and the letter for the same option", () => {
    for (let i = 0; i < 5; i++) {
      const digit = optionIndexForKey(String(i + 1));
      const letter = optionIndexForKey(String.fromCharCode(97 + i));
      expect(digit).toBe(letter);
    }
  });

  it("returns null for anything else", () => {
    expect(optionIndexForKey("0")).toBeNull();
    expect(optionIndexForKey("!")).toBeNull();
    expect(optionIndexForKey("")).toBeNull();
    expect(optionIndexForKey("ab")).toBeNull();
  });
});

describe("shouldHandleShortcut", () => {
  const base = { ctrlKey: false, metaKey: false, altKey: false, target: null };

  it("allows a plain keystroke with no target", () => {
    expect(shouldHandleShortcut(base)).toBe(true);
  });

  it.each(["ctrlKey", "metaKey", "altKey"] as const)("refuses when %s is held", (modifier) => {
    expect(shouldHandleShortcut({ ...base, [modifier]: true })).toBe(false);
  });

  it.each(["INPUT", "TEXTAREA", "SELECT"])("refuses while focus is in a %s", (tag) => {
    expect(shouldHandleShortcut({ ...base, target: { tagName: tag } })).toBe(false);
  });

  it("is case-insensitive about the tag name", () => {
    expect(shouldHandleShortcut({ ...base, target: { tagName: "textarea" } })).toBe(false);
  });

  it("refuses inside a contenteditable element", () => {
    expect(
      shouldHandleShortcut({ ...base, target: { tagName: "DIV", isContentEditable: true } }),
    ).toBe(false);
  });

  it("allows a keystroke on an ordinary element, e.g. a button", () => {
    expect(shouldHandleShortcut({ ...base, target: { tagName: "BUTTON" } })).toBe(true);
  });
});
