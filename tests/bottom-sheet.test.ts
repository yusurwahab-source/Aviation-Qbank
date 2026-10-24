import { describe, expect, it } from "vitest";

import { clampDragOffset, DISMISS_THRESHOLD_PX, shouldDismissDrag } from "@/lib/bottom-sheet";

describe("clampDragOffset", () => {
  it("passes a downward drag through unchanged", () => {
    expect(clampDragOffset(40)).toBe(40);
  });

  it("clamps an upward drag to zero", () => {
    expect(clampDragOffset(-30)).toBe(0);
  });

  it("leaves no movement at zero", () => {
    expect(clampDragOffset(0)).toBe(0);
  });
});

describe("shouldDismissDrag", () => {
  it("does not dismiss below the threshold", () => {
    expect(shouldDismissDrag(DISMISS_THRESHOLD_PX - 1)).toBe(false);
  });

  it("does not dismiss exactly at the threshold", () => {
    expect(shouldDismissDrag(DISMISS_THRESHOLD_PX)).toBe(false);
  });

  it("dismisses past the threshold", () => {
    expect(shouldDismissDrag(DISMISS_THRESHOLD_PX + 1)).toBe(true);
  });

  it("never dismisses a zero or upward drag", () => {
    expect(shouldDismissDrag(0)).toBe(false);
  });
});
