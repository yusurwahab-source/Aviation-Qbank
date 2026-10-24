import { describe, expect, it } from "vitest";

import { activeBottomNavHref, bottomNavHidden, BOTTOM_NAV_ITEMS } from "@/lib/bottom-nav";

describe("BOTTOM_NAV_ITEMS", () => {
  it("has exactly the four destinations, in the requested order", () => {
    expect(BOTTOM_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "Question Bank",
      "Simulators",
      "Statistics",
    ]);
  });
});

describe("activeBottomNavHref", () => {
  it("lights up Home only at the exact root", () => {
    expect(activeBottomNavHref("/")).toBe("/");
    expect(activeBottomNavHref("/about")).not.toBe("/");
  });

  it.each([
    "/aircraft-systems",
    "/type-rating",
    "/type-rating/B737",
    "/type-rating/B737/test",
    "/class-rating/DA40",
    "/atpl-ground-school",
    "/flying-knowledge/MET",
    "/flying-knowledge/MET/test",
  ])("lights up Question Bank on %s", (path) => {
    expect(activeBottomNavHref(path)).toBe("/aircraft-systems");
  });

  it.each(["/pilot-sims", "/pilot-sims/holding-pattern-entry-trainer"])(
    "lights up Simulators on %s",
    (path) => expect(activeBottomNavHref(path)).toBe("/pilot-sims"),
  );

  it.each(["/progress", "/progress/B737", "/progress/class/DA40"])(
    "lights up Statistics on %s",
    (path) => expect(activeBottomNavHref(path)).toBe("/progress"),
  );

  it("matches nothing on an unrelated page", () => {
    expect(activeBottomNavHref("/contact")).toBeNull();
    expect(activeBottomNavHref("/owner")).toBeNull();
  });
});

describe("bottomNavHidden", () => {
  it.each([
    "/type-rating/B737/test",
    "/class-rating/DA40/test",
    "/flying-knowledge/MET/test",
    "/pilot-sims/holding-pattern-entry-trainer",
    "/owner",
    "/owner/accounts",
  ])("hides on %s", (path) => expect(bottomNavHidden(path)).toBe(true));

  it.each(["/", "/aircraft-systems", "/pilot-sims", "/progress", "/contact", "/type-rating/B737"])(
    "shows on %s",
    (path) => expect(bottomNavHidden(path)).toBe(false),
  );
});
