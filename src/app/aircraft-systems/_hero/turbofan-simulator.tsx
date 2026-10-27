"use client";

import { useState, type CSSProperties } from "react";

import {
  BAND_LABELS,
  THROTTLE_DEFAULT,
  THROTTLE_MAX,
  THROTTLE_MIN,
  clampThrottle,
  combustionGlow,
  flowSeconds,
  formatRpm,
  formatTemp,
  powerBand,
  spinSeconds,
  type PowerBand,
} from "@/lib/turbofan-sim";

type ModuleKey = "fan" | "compressor" | "combustor" | "turbine" | "nozzle";

type EngineModule = {
  key: ModuleKey;
  number: number;
  label: string;
  /** Where the callout sits in the 800 x 400 drawing. */
  x: number;
  side: "top" | "bottom";
  /** The part of the drawing this module covers, for the highlight. */
  span: [number, number];
  what: string;
};

const MODULES: EngineModule[] = [
  {
    key: "fan",
    number: 1,
    label: "AIR INTAKE (FAN)",
    x: 122,
    side: "top",
    span: [88, 162],
    what: "The fan draws air into the engine. Most of it never enters the core: it bypasses it through the outer duct and produces the larger share of the thrust on a high-bypass turbofan.",
  },
  {
    key: "compressor",
    number: 2,
    label: "COMPRESSOR SECTION",
    x: 255,
    side: "bottom",
    span: [162, 342],
    what: "Rows of rotating and stationary blades squeeze the core air, raising its pressure many times over. Higher pressure means the fuel burns more efficiently and the engine extracts more energy from it.",
  },
  {
    key: "combustor",
    number: 3,
    label: "COMBUSTION CHAMBER",
    x: 388,
    side: "top",
    span: [342, 434],
    what: "Fuel is sprayed into the compressed air and burned continuously. The gas leaves far hotter and under high pressure, which is why temperature limits matter most just behind this point.",
  },
  {
    key: "turbine",
    number: 4,
    label: "TURBINE SECTION",
    x: 502,
    side: "bottom",
    span: [434, 576],
    what: "The hot gas expands through the turbines, which extract just enough energy to drive the compressors and, through a shaft, the fan. What is left continues rearward as thrust.",
  },
  {
    key: "nozzle",
    number: 5,
    label: "EXHAUST NOZZLE",
    x: 656,
    side: "top",
    span: [576, 748],
    what: "The core gas and the bypass air accelerate out of their nozzles. The change in momentum of all that air, pushed rearward, is the thrust that moves the aircraft forward.",
  },
];

const BAND_TEXT: Record<PowerBand, string> = {
  idle: "text-sim-muted",
  continuous: "text-sim-ok",
  overthrust: "text-sim-alert animate-pulse",
};

const CENTRE_Y = 200;
const PARTICLES = 5;

type Stream = {
  /** Start x, the y rows it runs along, and how far it travels. */
  x: number;
  rows: number[];
  dist: number;
  colour: string;
  /** Speed relative to the bypass stream: the exhaust runs faster. */
  speed: number;
};

const STREAMS: Stream[] = [
  { x: 64, rows: [134, 266], dist: 650, colour: "var(--sim-sky)", speed: 1 },
  { x: 168, rows: [192, 208], dist: 172, colour: "var(--sim-sky)", speed: 1 },
  { x: 348, rows: [190, 210], dist: 82, colour: "var(--hero-accent)", speed: 1.2 },
  { x: 438, rows: [190, 210], dist: 306, colour: "var(--sim-heat)", speed: 1.5 },
];

function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

export function TurbofanSimulator() {
  const [throttle, setThrottle] = useState(THROTTLE_DEFAULT);
  const [active, setActive] = useState<ModuleKey>("fan");

  const band = powerBand(throttle);
  const flow = flowSeconds(throttle);
  const glow = combustionGlow(throttle);
  const current = MODULES.find((m) => m.key === active) ?? MODULES[0];

  return (
    <section
      aria-labelledby="turbofan-title"
      className="w-full rounded-2xl border border-sim-line bg-hero-scrim p-4 text-on-hero shadow-[0_0_50px_color-mix(in_oklab,var(--sim-sky)_18%,transparent)] sm:p-6"
      style={cssVars({ "--sim-flow": `${flow}s`, "--sim-spin": `${spinSeconds(throttle)}s` })}
    >
      <div className="mb-5 flex flex-col gap-4 border-b border-sim-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="rounded-full bg-[color-mix(in_oklab,var(--sim-sky)_14%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sim-sky">
            Systems Interactive Trainer
          </span>
          <h2 id="turbofan-title" className="mt-2 text-lg font-semibold sm:text-2xl">
            Turbofan Engine Propulsion Core
          </h2>
        </div>
        <div className="flex gap-3">
          <Readout label="Core RPM" value={formatRpm(throttle)} className="text-sim-sky" />
          <Readout
            label="Exhaust Temp"
            value={formatTemp(throttle)}
            className={band === "overthrust" ? "text-sim-alert" : "text-sim-heat"}
          />
        </div>
      </div>

      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl border border-sim-line bg-[linear-gradient(180deg,var(--hero-scrim),var(--sim-panel))]">
        {/* The golden horizon along the bottom edge. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_oklab,var(--hero-accent)_30%,transparent),transparent_70%)]"
        />
        <EngineDrawing
          glow={glow}
          active={active}
          flow={flow}
          onSelect={setActive}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Engine sections">
        {MODULES.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={m.key === active}
            onClick={() => setActive(m.key)}
            className={`tap-target inline-flex items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
              m.key === active
                ? "border-hero-accent bg-[color-mix(in_oklab,var(--hero-accent)_16%,transparent)] text-hero-accent"
                : "border-sim-line text-on-hero hover:border-sim-sky"
            }`}
          >
            <span className="font-mono text-xs">{m.number}</span>
            {m.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-3 rounded-xl border border-sim-line bg-sim-panel p-4 text-sm leading-relaxed text-sim-muted">
        <strong className="mb-1 block text-on-hero">{current.label}</strong>
        {current.what}
      </p>

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-sim-line bg-sim-panel p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-2/3">
          <label htmlFor="turbofan-lever" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sim-muted">
            Thrust lever array (throttle)
          </label>
          <input
            id="turbofan-lever"
            type="range"
            min={THROTTLE_MIN}
            max={THROTTLE_MAX}
            step={0.5}
            value={throttle}
            onChange={(event) => setThrottle(clampThrottle(Number(event.target.value)))}
            aria-valuetext={`${formatRpm(throttle)}, ${BAND_LABELS[band].toLowerCase()}`}
            className="h-11 w-full cursor-pointer accent-sim-sky"
          />
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-sim-muted">
            Engine status
          </div>
          <div className={`mt-1 text-sm font-bold ${BAND_TEXT[band]}`}>{BAND_LABELS[band]}</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-sim-muted">
        A teaching illustration with typical, simplified figures — not data for any particular
        engine. Always use your aircraft&rsquo;s own manuals.
      </p>
    </section>
  );
}

function Readout({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="min-w-[7rem] rounded-xl border border-sim-line bg-sim-panel px-4 py-2 text-center">
      <div className="text-xs uppercase tracking-wider text-sim-muted">{label}</div>
      <div className={`font-mono text-sm font-bold ${className}`}>{value}</div>
    </div>
  );
}

function EngineDrawing({
  glow,
  active,
  flow,
  onSelect,
}: {
  glow: number;
  active: ModuleKey;
  flow: number;
  onSelect: (key: ModuleKey) => void;
}) {
  return (
    <svg
      viewBox="0 0 800 400"
      role="img"
      aria-label="Cutaway of a turbofan engine, air flowing left to right through the fan, compressor, combustion chamber, turbine and exhaust nozzle."
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="tf-gas" gradientUnits="userSpaceOnUse" x1="150" x2="745" y1="0" y2="0">
          <stop offset="0" stopColor="var(--sim-sky)" stopOpacity="0.35" />
          <stop offset="0.38" stopColor="var(--hero-accent)" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="var(--sim-heat)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--sim-alert)" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id="tf-burn">
          <stop offset="0" stopColor="var(--hero-accent)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--sim-heat)" stopOpacity="0" />
        </radialGradient>
        {/* Upper half of the engine; the lower half is this, mirrored. */}
        <g id="tf-half">
          {/* Nacelle */}
          <path
            d="M78 148 C84 118 112 104 150 100 L570 108 C630 112 670 122 706 138 L694 142 C660 130 622 122 566 120 L150 112 C122 114 98 128 92 152 Z"
            fill="var(--sim-line)"
            stroke="var(--sim-sky)"
            strokeWidth="1.5"
          />
          {/* Bypass duct */}
          <path
            d="M96 150 C102 130 124 118 150 116 L566 124 C620 126 656 134 690 148 L650 152 L170 158 L150 166 Z"
            fill="var(--sim-sky)"
            fillOpacity="0.1"
          />
          {/* Core: gas path, then casing */}
          <path
            d="M150 166 L170 160 L340 170 L346 152 L430 152 L436 156 L570 140 L650 150 L745 200 L570 200 L436 200 L346 200 L150 200 Z"
            fill="url(#tf-gas)"
            stroke="var(--sim-sky)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Spinner */}
          <path d="M98 200 Q110 172 150 166 L150 200 Z" fill="var(--sim-sky)" fillOpacity="0.5" />
          {/* Compressor and turbine blade rows */}
          <g stroke="var(--sim-sky)" strokeWidth="2" strokeLinecap="round" opacity="0.8">
            <path d="M190 164 V200 M214 165 V200 M238 166 V200 M262 168 V200 M286 169 V200 M310 170 V200 M334 171 V200" />
            <path d="M450 156 V200 M478 153 V200 M508 150 V200 M538 146 V200" />
          </g>
          {/* Fan blades, as a flickering row so they read as spinning */}
          <path
            className="sim-strobe"
            d="M146 116 V200"
            stroke="var(--on-hero)"
            strokeWidth="9"
            strokeDasharray="10 4"
            fill="none"
            opacity="0.85"
          />
        </g>
      </defs>

      {/* Subtle flowing tech lines behind the engine */}
      <g stroke="var(--sim-sky)" strokeOpacity="0.12" fill="none" strokeWidth="1">
        <path d="M0 80 C200 40 400 120 800 60" />
        <path d="M0 330 C220 360 480 290 800 340" />
        <path d="M0 300 C240 320 500 260 800 300" />
      </g>

      {/* Combustion glow, brighter with power */}
      <ellipse cx="388" cy={CENTRE_Y} rx="62" ry="40" fill="url(#tf-burn)" opacity={glow} />

      <use href="#tf-half" />
      <use href="#tf-half" transform={`matrix(1 0 0 -1 0 ${CENTRE_Y * 2})`} />

      {/* Centreline */}
      <path d="M60 200 H760" stroke="var(--sim-sky)" strokeOpacity="0.3" strokeDasharray="3 8" />

      {/* Air and gas moving through */}
      {STREAMS.flatMap((stream, s) =>
        stream.rows.flatMap((y, r) => {
          const duration = Math.max(0.4, (flow * stream.dist) / (650 * stream.speed));
          return Array.from({ length: PARTICLES }, (_, i) => (
            <circle
              key={`${s}-${r}-${i}`}
              className="sim-particle"
              cx={stream.x}
              cy={y}
              r="3.5"
              fill={stream.colour}
              style={{
                ...cssVars({ "--sim-dist": `${stream.dist}px` }),
                animationDuration: `${duration}s`,
                animationDelay: `${-(i * duration) / PARTICLES}s`,
              }}
            />
          ));
        }),
      )}

      {/* Fan face, as seen from the front */}
      <g aria-hidden="true">
        <circle cx="752" cy="338" r="32" fill="var(--sim-panel)" stroke="var(--sim-sky)" strokeOpacity="0.6" />
        <g className="sim-spin" style={{ transformOrigin: "752px 338px", transformBox: "view-box" }} stroke="var(--on-hero)" strokeWidth="3" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="752" y1="338" x2="752" y2="311" transform={`rotate(${i * 30} 752 338)`} />
          ))}
        </g>
        <circle cx="752" cy="338" r="6" fill="var(--hero-accent)" />
      </g>

      {/* Hit areas and highlight for each section */}
      {MODULES.map((m) => (
        <rect
          key={m.key}
          x={m.span[0]}
          y="96"
          width={m.span[1] - m.span[0]}
          height="208"
          fill={m.key === active ? "var(--hero-accent)" : "transparent"}
          fillOpacity="0.1"
          stroke={m.key === active ? "var(--hero-accent)" : "none"}
          strokeDasharray="5 5"
          className="cursor-pointer"
          aria-hidden="true"
          onClick={() => onSelect(m.key)}
        />
      ))}

      {/* Callouts: full labels from tablet up, numbers on a phone */}
      {MODULES.map((m) => {
        const labelY = m.side === "top" ? 44 : 366;
        const lineFrom = m.side === "top" ? labelY + 12 : labelY - 24;
        const lineTo = m.side === "top" ? 112 : 290;
        const isActive = m.key === active;
        const colour = isActive ? "var(--hero-accent)" : "var(--on-hero)";
        return (
          <g key={m.key} aria-hidden="true" className="pointer-events-none">
            <path d={`M${m.x} ${lineFrom} V${lineTo}`} stroke={colour} strokeOpacity="0.7" strokeDasharray="3 4" />
            <g className="hidden md:inline">
              <text x={m.x} y={labelY} textAnchor="middle" fill={colour} fontSize="17" fontWeight="700" letterSpacing="0.5">
                {m.label}
              </text>
            </g>
            <g className="md:hidden">
              <circle cx={m.x} cy={m.side === "top" ? labelY - 4 : labelY - 4} r="20" fill="var(--sim-panel)" stroke={colour} strokeWidth="2" />
              <text x={m.x} y={labelY + 4} textAnchor="middle" fill={colour} fontSize="24" fontWeight="700">
                {m.number}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
