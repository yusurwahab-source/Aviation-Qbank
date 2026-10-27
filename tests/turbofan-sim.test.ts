import { describe, expect, it } from "vitest";

import {
  THROTTLE_DEFAULT,
  THROTTLE_MAX,
  THROTTLE_MIN,
  clampThrottle,
  combustionGlow,
  exhaustTemp,
  flowSeconds,
  formatRpm,
  formatTemp,
  powerBand,
  spinSeconds,
} from "@/lib/turbofan-sim";

describe("turbofan simulator", () => {
  it("bands the lever at the stated limits", () => {
    expect(powerBand(THROTTLE_MIN)).toBe("idle");
    expect(powerBand(54.9)).toBe("idle");
    expect(powerBand(55)).toBe("continuous");
    expect(powerBand(97.9)).toBe("continuous");
    expect(powerBand(98)).toBe("overthrust");
    expect(powerBand(THROTTLE_MAX)).toBe("overthrust");
  });

  it("reads the gauges from the lever", () => {
    expect(formatRpm(85)).toBe("85.0%");
    expect(exhaustTemp(85)).toBe(1154);
    expect(formatTemp(85)).toBe("1,154 °C");
    expect(exhaustTemp(THROTTLE_MAX)).toBe(1381);
  });

  it("clamps anything outside the slider, and junk, to a usable value", () => {
    expect(clampThrottle(0)).toBe(THROTTLE_MIN);
    expect(clampThrottle(500)).toBe(THROTTLE_MAX);
    expect(clampThrottle(Number.NaN)).toBe(THROTTLE_DEFAULT);
  });

  it("speeds the animation up with power", () => {
    expect(flowSeconds(THROTTLE_MAX)).toBeLessThan(flowSeconds(THROTTLE_MIN));
    expect(spinSeconds(THROTTLE_MAX)).toBeLessThan(spinSeconds(THROTTLE_MIN));
    expect(combustionGlow(THROTTLE_MAX)).toBeGreaterThan(combustionGlow(THROTTLE_MIN));
    expect(flowSeconds(THROTTLE_MAX)).toBeGreaterThan(0);
  });
});
