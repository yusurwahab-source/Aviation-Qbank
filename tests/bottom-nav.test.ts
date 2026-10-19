import { describe, expect, it } from "vitest";

import { bottomNavActive, bottomNavHidden, bottomNavItems } from "@/lib/bottom-nav";

describe("bottomNavHidden", () => {
  it("stands down on tests, owner and simulators", () => {
    expect(bottomNavHidden("/type-rating/B737/test")).toBe(true);
    expect(bottomNavHidden("/owner/accounts")).toBe(true);
    expect(bottomNavHidden("/pilot-sims/holding")).toBe(true);
  });
  it("shows elsewhere", () => {
    expect(bottomNavHidden("/")).toBe(false);
    expect(bottomNavHidden("/progress")).toBe(false);
    expect(bottomNavHidden("/pilot-sims")).toBe(false);
  });
});

describe("bottomNavItems", () => {
  it("offers a way in to signed-out visitors only", () => {
    expect(bottomNavItems(false).map((i) => i.label)).toEqual(["Home", "Study", "Log in"]);
    expect(bottomNavItems(true).map((i) => i.label)).toEqual(["Home", "Study", "Progress", "Account"]);
  });
});

describe("bottomNavActive", () => {
  it("matches home exactly and sections by prefix", () => {
    expect(bottomNavActive("/progress/B737", "/")).toBe(false);
    expect(bottomNavActive("/", "/")).toBe(true);
    expect(bottomNavActive("/progress/B737", "/progress")).toBe(true);
  });
});
