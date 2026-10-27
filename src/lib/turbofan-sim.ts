/**
 * The Aircraft Systems hero's turbofan simulator, as pure functions: what a
 * thrust lever position reads on the gauges, which band it falls in, and how
 * fast the animation runs. Illustrative figures for teaching how the engine
 * responds to power, not data for any real engine or type.
 */

export const THROTTLE_MIN = 40;
export const THROTTLE_MAX = 110;
export const THROTTLE_DEFAULT = 85;

export type PowerBand = "idle" | "continuous" | "overthrust";

export const BAND_LABELS: Record<PowerBand, string> = {
  idle: "FLIGHT IDLE SET",
  continuous: "CONTINUOUS POWER",
  overthrust: "MAX OVERTHRUST LIMIT",
};

/** Keeps a lever value, however it arrives, inside the slider's own range. */
export function clampThrottle(value: number): number {
  if (!Number.isFinite(value)) return THROTTLE_DEFAULT;
  return Math.min(THROTTLE_MAX, Math.max(THROTTLE_MIN, value));
}

export function powerBand(value: number): PowerBand {
  const v = clampThrottle(value);
  if (v < 55) return "idle";
  if (v < 98) return "continuous";
  return "overthrust";
}

/** Exhaust gas temperature in °C, rising linearly with the lever. */
export function exhaustTemp(value: number): number {
  return Math.round(380 + clampThrottle(value) * 9.1);
}

export function formatRpm(value: number): string {
  return `${clampThrottle(value).toFixed(1)}%`;
}

export function formatTemp(value: number): string {
  // Explicit locale: the server and the browser must print the same comma.
  return `${exhaustTemp(value).toLocaleString("en-US")} °C`;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function fraction(value: number): number {
  return (clampThrottle(value) - THROTTLE_MIN) / (THROTTLE_MAX - THROTTLE_MIN);
}

/** Seconds a particle takes to cross the engine: slower at idle. */
export function flowSeconds(value: number): number {
  return lerp(3.2, 1.0, fraction(value));
}

/** Seconds per turn of the fan (and per stroboscopic blade cycle). */
export function spinSeconds(value: number): number {
  return lerp(2.4, 0.4, fraction(value));
}

/** 0–1 brightness of the combustion glow. */
export function combustionGlow(value: number): number {
  return lerp(0.3, 1, fraction(value));
}
