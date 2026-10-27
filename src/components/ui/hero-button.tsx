// Hero button from 000h by Cojeev — MIT licence — docs, variants and the full library: https://cojeev.com/ui/docs/hero-button/
/* eslint-disable -- vendored third-party component, kept verbatim so it can be re-synced from upstream */
"use client";

import * as React from "react";
import { type CSSProperties, useSyncExternalStore } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import { animate, type AnimationPlaybackControls, frameSteps, motionValue, type Transition } from "motion";
import { AnimatePresence, type HTMLMotionProps, motion, type Target, type TargetAndTransition, useIsPresent } from "motion/react";
import { twMerge } from "tailwind-merge";

// ---- registry/cojeev/motion/clock.ts (inlined) ----
let time:number|null=null
const drivers=new Set<(time:number|null)=>void>()
const now=()=>time??performance.now()
function registerMotionClock(driver:(time:number|null)=>void){drivers.add(driver);return ()=>{drivers.delete(driver)}}
function getMotionTime(){return now()}
function isMotionClockFrozen(){return time!==null}

// ---- registry/cojeev/motion/settings.ts (inlined) ----
const RUNTIME={cfg:{rest:false,reach:true,merge:true,hold:true,jiggleOn:true,press:true,echo:false,dots:0,grain:.08,sheen:.6,curve:1.2,lobeK:130,lobeZ:1,mergeZ:.8,arcK:40,holdK:80,pressK:170,jiggle:.35,jiggleDecay:1.6,restSpeed:1,drift:1,quality:2.5},
 tier:{pill:{amp:0,reach:3,inside:1.2,press:.02},tile:{amp:0,reach:2.4,inside:1,press:.02},nav:{amp:0,reach:1.2,inside:.5,press:.008},card:{amp:0,reach:1,inside:.4,press:.004},blob:{amp:.006,reach:3,inside:1.2,press:.03}}};
const factoryTiers={pill:{amp:.008,reach:4,inside:2,sig:24,R:80,press:.03,lobes:0,depth:0,asym:0,spread:.55},tile:{amp:.008,reach:3.5,inside:1.6,sig:18,R:64,press:.035,lobes:0,depth:0,asym:0,spread:.55},nav:{amp:.0006,reach:3,inside:1.2,sig:24,R:64,press:.010,lobes:0,depth:0,asym:0,spread:.55},card:{amp:.0003,reach:2.5,inside:.9,sig:44,R:56,press:.004,lobes:0,depth:0,asym:0,spread:.55},blob:{amp:.012,reach:4,inside:1.8,sig:22,R:64,press:.05,lobes:0,depth:0,asym:0,spread:.55},spinner:{amp:.14,reach:0,inside:0,sig:1,R:0,press:0,lobes:0,depth:0,asym:0,spread:.55}};
const factoryCfg={quality:2.5,grain:.12,sheen:1,curve:1,lobeK:90,lobeZ:.9,mergeZ:.62,arcK:26,holdK:55,pressK:140,jiggle:.45,jiggleDecay:1.35,restSpeed:1,drift:1,rest:true,reach:true,merge:true,hold:true,jiggleOn:true,press:true,echo:false,echoOff:6,echoScale:1.04,dots:0};
type MorphConfig = typeof factoryCfg
type TierName = keyof typeof factoryTiers
type Tier = typeof factoryTiers.pill
type ProductCategory = "buttons" | "icons" | "pills" | "cards" | "skeleton"
type Category = ProductCategory | "nav" | "inputs" | "controls" | "surfaces"
type MotionSettings = {v:3;mode:"off"|"subtle";cats:Record<Category,boolean>}
type MorphProfile = {cfg:MorphConfig;TIER:Record<TierName,Tier>}
type FlowVariant = "glide"|"stretch"|"jelly"|"comet"|"drop"|"rubber"|"pebble"|"ripple"|"halo"|"off"
type FlowSettings = {variant:FlowVariant;hover:boolean;speed:number;intensity:number;hoverStrength:number}
type SettingsSnapshot = Readonly<{motion:MotionSettings;flow:FlowSettings;profile:MorphProfile;authored:boolean}>
const MOTION_KEY = "v-motion"
const MORPH_KEY = "v-morph-cfg-v3"
const FLOW_KEY = "v-flow-v1"
const PRODUCT_CATEGORIES:readonly ProductCategory[] = ["buttons","icons","pills","cards","skeleton"]
const FLOW_DEFAULTS:Readonly<FlowSettings> = Object.freeze({variant:"glide",hover:true,speed:1,intensity:1,hoverStrength:1})
const FLOW_CHARACTERS:Record<FlowVariant,{label:string;duration:number;ease:string;land:string;glow?:string}> = {
 glide:{label:"Glide",duration:.24,ease:"cubic-bezier(.2,.8,.2,1)",land:"none"},
 stretch:{label:"Stretch",duration:.3,ease:"cubic-bezier(.3,1.15,.4,1)",land:"vf-land"},
 jelly:{label:"Jelly",duration:.5,ease:"cubic-bezier(.3,1.3,.45,1)",land:"vf-jellyx"},
 comet:{label:"Comet",duration:.34,ease:"cubic-bezier(.2,.8,.2,1)",land:"vf-land"},
 drop:{label:"Ink drop",duration:.3,ease:"cubic-bezier(.3,1.25,.4,1)",land:"vf-bloom"},
 rubber:{label:"Rubber",duration:.36,ease:"cubic-bezier(.3,1.3,.4,1)",land:"vf-land"},
 pebble:{label:"Pebble",duration:.46,ease:"cubic-bezier(.32,1.25,.42,1)",land:"vf-lean"},
 ripple:{label:"Ripple",duration:.36,ease:"cubic-bezier(.2,.8,.2,1)",land:"vf-land",glow:"vf-ring"},
 halo:{label:"Halo",duration:.4,ease:"cubic-bezier(.3,1.2,.4,1)",land:"vf-land",glow:"vf-glow"},
 off:{label:"Off",duration:0,ease:"linear",land:"none"},
}
const defaultSettings:MotionSettings={v:3,mode:"subtle",cats:{buttons:true,icons:true,pills:true,cards:false,skeleton:true,nav:false,inputs:false,controls:false,surfaces:false}}
function runtime():MorphProfile {
 const TIER=structuredClone(factoryTiers)
 for(const name of Object.keys(RUNTIME.tier) as (keyof typeof RUNTIME.tier)[]) Object.assign(TIER[name],RUNTIME.tier[name])
 return {cfg:{...factoryCfg,...RUNTIME.cfg},TIER}
}
function immutable<T>(value:T):T {
 if(value && typeof value==="object"){Object.values(value).forEach(immutable);Object.freeze(value)}
 return value
}
const serverSnapshot:SettingsSnapshot=immutable({motion:structuredClone(defaultSettings),flow:{...FLOW_DEFAULTS},profile:runtime(),authored:false})
let settings=structuredClone(defaultSettings), profile=runtime(), flow={...FLOW_DEFAULTS}, authored=false, loaded=false
let snapshot=serverSnapshot
const listeners=new Set<()=>void>()
let releaseEvents:undefined|(()=>void), dispatching=false
function storage(){try{return typeof window==="undefined"?null:window.localStorage}catch{return null}}
function parse(key:string):unknown {try{return JSON.parse(storage()?.getItem(key)||"null")}catch{return null}}
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value)}
function mergeProfile(value:unknown,base:MorphProfile,strict=false):MorphProfile {
 if(!record(value)||(!record(value.cfg)&&!record(value.TIER)))throw new Error("Profile must contain a cfg or TIER object.")
 const next=structuredClone(base)
 if(record(value.cfg)) for(const key of Object.keys(next.cfg) as (keyof MorphConfig)[]){
  const v=value.cfg[key];if(v===undefined)continue
  if(typeof v!==typeof next.cfg[key]||(typeof v==="number"&&!Number.isFinite(v))){if(strict)throw new Error(`Invalid cfg.${key}: expected a finite ${typeof next.cfg[key]}.`);continue}
  Object.assign(next.cfg,{[key]:v})
 }
 if(record(value.TIER))for(const name of Object.keys(next.TIER) as TierName[]){const saved=value.TIER[name];if(!record(saved))continue
  for(const key of Object.keys(next.TIER[name]) as (keyof Tier)[]){const v=saved[key];if(v===undefined)continue
   if(typeof v!=="number"||!Number.isFinite(v)){if(strict)throw new Error(`Invalid TIER.${name}.${key}: expected a finite number.`);continue}
   next.TIER[name][key]=v
  }
 }
 return next
}
function normalizeFlow(value:unknown):FlowSettings {
 const v=record(value)?value:{},number=(key:string,fallback:number,min:number)=>typeof v[key]==="number"&&Number.isFinite(v[key])?Math.max(min,v[key] as number):fallback
 return {variant:typeof v.variant==="string"&&Object.hasOwn(FLOW_CHARACTERS,v.variant)?v.variant as FlowVariant:"glide",hover:typeof v.hover==="boolean"?v.hover:true,speed:number("speed",1,.25),intensity:number("intensity",1,0),hoverStrength:number("hoverStrength",1,0)}
}
function flowToken(name:string,fallback:string,el?:Element){try{return getComputedStyle(el??document.documentElement).getPropertyValue(name).trim()||fallback}catch{return fallback}}
function flowTokenMs(name:string,fallback:number,el?:Element){const v=flowToken(name,"",el),n=parseFloat(v);return Number.isFinite(n)?n*(v.endsWith("ms")?1:1000):fallback}
function applyFlowSettings(){
 if(typeof document==="undefined")return
 const h=document.documentElement,variant=settings.mode==="off"?"off":flow.variant,c=FLOW_CHARACTERS[variant],hover=flow.hover?"on":"off"
 // Read the character tokens before any root write: a computed read after one forces a
 // whole-document style pass. Unchanged writes are skipped, as they still wake every observer.
 const values:Record<string,string>={"--flow-speed":String(flow.speed),"--flow-intensity":String(flow.intensity),"--flow-hover":String(flow.hoverStrength),
  "--flow-ease":variant==="off"?c.ease:flowToken("--e-flow-"+variant,c.ease),
  "--flow-dur":((variant==="off"?0:flowTokenMs("--t-flow-"+variant,c.duration*1000))/1000/flow.speed).toFixed(3)+"s",
  "--flow-land":c.land,"--flow-glow":c.glow||"none"}
 if(h.dataset.flow!==variant)h.dataset.flow=variant
 if(h.dataset.flowHover!==hover)h.dataset.flowHover=hover
 for(const [name,value] of Object.entries(values))if(h.style.getPropertyValue(name)!==value)h.style.setProperty(name,value)
}
function publish(){
 const next={motion:settings,flow,profile,authored}
 if(JSON.stringify(next)===JSON.stringify(snapshot)){applyFlowSettings();return}
 snapshot=immutable(structuredClone(next));applyFlowSettings();listeners.forEach(fn=>fn())
}
function loadMotionSettings(){
 if(loaded||typeof window==="undefined")return
 loaded=true;settings=structuredClone(defaultSettings);profile=runtime();flow={...FLOW_DEFAULTS};authored=false
 const raw=parse(MOTION_KEY)
 if(record(raw)){
  if(raw.mode==="off"||raw.mode==="subtle")settings.mode=raw.mode
  if(raw.v===3&&record(raw.cats))for(const key of PRODUCT_CATEGORIES)if(typeof raw.cats[key]==="boolean")settings.cats[key]=raw.cats[key]
 }
 flow=normalizeFlow(parse(FLOW_KEY))
 const saved=parse(MORPH_KEY)
 if(saved)try{profile=mergeProfile(saved,{cfg:{...factoryCfg},TIER:structuredClone(factoryTiers)});authored=true}catch{/* Corrupt saved data keeps a usable runtime. */}
 try{for(const key of ["v-alive-settings","v-morph-cfg","v-morph-cfg-v2","v-motion-cfg"])storage()?.removeItem(key)}catch{}
 publish()
}
function getMotionSettings(){loadMotionSettings();return structuredClone(settings)}
function getMorphProfile(){loadMotionSettings();return structuredClone(profile)}
function getFlowSettings(){loadMotionSettings();return {...flow}}
function getSettingsSnapshot(){loadMotionSettings();return snapshot}
function getServerSettingsSnapshot(){return serverSnapshot}
function reloadMotionSettings(){loaded=false;loadMotionSettings()}
function acquireEvents(){
 if(releaseEvents||typeof window==="undefined")return
 const onStorage=(event:StorageEvent)=>{if(event.key===null||[MOTION_KEY,MORPH_KEY,FLOW_KEY].includes(event.key))reloadMotionSettings()}
 const onEngine=()=>{if(!dispatching)reloadMotionSettings()}
 window.addEventListener("storage",onStorage);window.addEventListener("v-motion-change",onEngine);window.addEventListener("v-flow",onEngine)
 releaseEvents=()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("v-motion-change",onEngine);window.removeEventListener("v-flow",onEngine);releaseEvents=undefined}
}
function subscribeSettings(fn:()=>void){loadMotionSettings();listeners.add(fn);acquireEvents();return ()=>{listeners.delete(fn);if(!listeners.size)releaseEvents?.()}}
const subscribeMotion=subscribeSettings
function event(name:string){if(typeof window==="undefined")return;dispatching=true;try{window.dispatchEvent(new CustomEvent(name,{detail:name==="v-flow"?getFlowSettings():getMotionSettings()}))}finally{dispatching=false}}

// ---- registry/cojeev/motion/use-reduced-motion.ts (inlined) ----
let query:MediaQueryList|undefined
const listeners_UseReducedMotion=new Set<()=>void>()
const changed=()=>listeners_UseReducedMotion.forEach(listener=>listener())
function media(){return query??=window.matchMedia('(prefers-reduced-motion: reduce)')}
function subscribe(listener:()=>void){
 const q=media();if(!listeners_UseReducedMotion.size)q.addEventListener('change',changed);listeners_UseReducedMotion.add(listener)
 return ()=>{listeners_UseReducedMotion.delete(listener);if(!listeners_UseReducedMotion.size){q.removeEventListener('change',changed);query=undefined}}
}
function snapshot_UseReducedMotion(){return typeof window==='undefined'?false:media().matches}
const serverSnapshot_UseReducedMotion=()=>false
/** Dynamic accessibility preference shared by genuine in-progress indicators and other component roles. */
function useReducedMotion(){return useSyncExternalStore(subscribe,snapshot_UseReducedMotion,serverSnapshot_UseReducedMotion)}

// ---- registry/cojeev/motion/choreography.ts (inlined) ----
/** The shared rhythm. Durations and stagger are seconds, matching Motion's API. */
const motionTokens = {
  spring: {
    responsive: { type: "spring", stiffness: 360, damping: 32, mass: .85 },
    expressive: { type: "spring", stiffness: 260, damping: 22, mass: 1 },
    gentle: { type: "spring", stiffness: 180, damping: 28, mass: 1 },
  },
  ease: { enter: [.2, .8, .2, 1], exit: [.4, 0, 1, 1], settle: [.2, .65, .25, 1] },
  duration: { quick: .16, enter: .32, exit: .18 },
  stagger: .035,
} as const;
const isQuiet = (snapshot: SettingsSnapshot) => snapshot.motion.mode === "off" || snapshot.flow.variant === "off";
function resolveChoreography(snapshot: SettingsSnapshot, reduced: boolean): { quiet: boolean; transition: Transition } {
  const quiet = reduced || isQuiet(snapshot);
  if (quiet) return { quiet, transition: { duration: 0, delay: 0 } };
  const speed = snapshot.flow.speed;
  const spring = ["jelly", "rubber", "drop", "pebble"].includes(snapshot.flow.variant)
    ? motionTokens.spring.expressive : motionTokens.spring.responsive;
  return { quiet, transition: { ...spring, stiffness: spring.stiffness * speed * speed, damping: spring.damping * speed } };
}
/** Reactive settings subscription for reusable React surfaces. */
function useChoreography() {
  const snapshot = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);
  const reduced = useReducedMotion();
  return React.useMemo(() => resolveChoreography(snapshot, reduced), [snapshot, reduced]);
}
/** Connect Motion's JS animations to the existing deterministic document clock. */
function trackMotion(controls: AnimationPlaybackControls) {
  let origin = getMotionTime() - controls.time * 1000;
  let frozen = isMotionClockFrozen();
  if (frozen) controls.pause();
  const release = registerMotionClock(time => {
    if (time === null) {
      if (frozen) controls.play();
      frozen = false;
      return;
    }
    if (!frozen) {
      origin = time - controls.time * 1000;
      controls.pause();
      frozen = true;
    }
    controls.time = Math.max(0, time - origin) / 1000;
    if (controls.time >= controls.duration) controls.complete();
    // A seek schedules Motion's update phase. Flush it at this explicit sample;
    // normal playback stays entirely on Motion's own animation frame loop.
    frameSteps.update.process({ delta: 0, timestamp: performance.now(), isProcessing: false });
  });
  void controls.finished.then(release, release);
  return () => { release(); controls.stop(); };
}
/** One interruptible spring per scalar; retargets inherit the current value and velocity. */
function createMotionLane(initial: number, render: (value: number) => void) {
  const value = motionValue(initial);
  const unsubscribe = value.on("change", render);
  let cancel = () => {};
  let generation = 0;
  const stop = () => { generation++; cancel(); cancel = () => {}; value.stop(); };
  const jump = (target: number) => { stop(); value.jump(target); render(target); };
  return {
    get: () => value.get(),
    jump,
    to(target: number, transition: Transition, complete?: () => void) {
      stop();
      if (transition.duration === 0) { jump(target); complete?.(); return; }
      const owner = generation;
      const controls = animate(value, target, {
        ...transition,
        autoplay: !isMotionClockFrozen(),
        onComplete: () => { if (generation === owner) complete?.(); },
      });
      cancel = trackMotion(controls);
    },
    stop,
    dispose: () => { stop(); unsubscribe(); value.destroy(); },
  };
}

// ---- registry/cojeev/motion/use-motion-visibility.ts (inlined) ----
function subscribePreferences(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    media.removeEventListener("change", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}
function readPreferences() {
  return document.visibilityState === "visible" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** A shared stillness boundary for optional landing-page effects. */
function useMotionVisibility(ref: React.RefObject<Element | null>, mountedElement?: Element | null) {
  const { motion, flow } = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);
  const permitted = React.useSyncExternalStore(subscribePreferences, readPreferences, () => false);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const element = mountedElement ?? ref.current;
    if (!element) { setInView(false); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, mountedElement]);
  return { enabled: permitted && motion.mode !== "off" && flow.variant !== "off", inView };
}

// ---- registry/cojeev/motion/refs.ts (inlined) ----
/** React 19 callback refs may return their own teardown; object refs are mutable commit targets. */
function assignMotionRef<T>(ref:React.Ref<T>|undefined,value:T|null):()=>void{
 if(typeof ref==='function'){
  const cleanup=ref(value)
  return ()=>{if(typeof cleanup==='function')cleanup();else ref(null)}
 }
 if(ref)ref.current=value
 return ()=>{if(ref)ref.current=null}
}

// ---- registry/cojeev/lib/utils.ts (inlined) ----
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---- registry/cojeev/ui/spinner.tsx (inlined) ----
const SpinnerVariants = cva(
  "v-pulse [display:inline-grid] [place-items:center] [width:var(--pulse,34px)] [height:var(--pulse,34px)] [position:relative]",
  {
    variants: {
      variant: { default: "", point: "-point" },
      size: { default: "" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function seedPath(radius: (angle: number) => number) {
  return (
    "M" +
    Array.from({ length: 64 }, (_, i) => {
      const angle = (i / 64) * Math.PI * 2;
      const r = radius(angle);
      return `${(50 + r * Math.cos(angle)).toFixed(2)} ${(50 + r * Math.sin(angle)).toFixed(2)}`;
    }).join("L") +
    "Z"
  );
}
const pebble = seedPath(
  (t) => 41 + 2.4 * Math.cos(3 * t + 0.6) + 1.4 * Math.sin(5 * t),
);
const star = seedPath(
  (t) => 21 + 23 * Math.pow(Math.abs(Math.cos(2 * t)), 1.9),
);
const puff = seedPath((t) => 36 + 6 * Math.abs(Math.cos(4 * t)));
const point = seedPath(
  (t) => 12 + 32 * Math.pow(Math.abs(Math.cos(2 * t)), 2.4),
);
const pointSoft = seedPath(
  (t) => 16 + 28 * Math.pow(Math.abs(Math.cos(2 * t)), 2.2),
);
type SpinnerAppearance = "bloom" | "orbit" | "relay";
type SpinnerProps = React.ComponentProps<"span"> &
  VariantProps<typeof SpinnerVariants> & {
    label?: string;
    appearance?: SpinnerAppearance;
    paused?: boolean;
  };
function Spinner({
  ref,
  className,
  variant,
  size,
  label,
  children,
  appearance = "bloom",
  paused = false,
  ...props
}: SpinnerProps) {
  const host = React.useRef<HTMLSpanElement>(null);
  const { enabled, inView } = useMotionVisibility(host);
  const active =
    enabled &&
    inView &&
    !paused &&
    !className?.split(/\s+/).includes("-paused");
  const attach = React.useCallback(
    (element: HTMLSpanElement | null) => {
      host.current = element;
      const release = assignMotionRef(ref, element);
      return () => {
        host.current = null;
        release();
      };
    },
    [ref],
  );
  const pointed = variant === "point",
    still = pointed ? point : star;
  const caption =
    label ??
    ((props as Record<string, unknown>)["data-label"] as string | undefined);
  return (
    <span
      ref={attach}
      role="status"
      aria-label={caption || "Working"}
      data-slot="spinner"
      data-part="root"
      data-appearance={appearance}
      data-paused={paused || undefined}
      data-animated={active || undefined}
      className={cn(SpinnerVariants({ variant, size }), className)}
      {...props}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {appearance === "bloom" ? (
          <>
            <motion.g
              initial={{ rotate: 0 }}
              animate={{ rotate: active ? [0, 360] : 0 }}
              transition={
                active
                  ? { duration: 16, repeat: Infinity, ease: "linear" }
                  : { duration: 0 }
              }
              style={{ transformOrigin: "50% 50%", transformBox: "view-box" }}
            >
              <motion.path
                className="seed"
                initial={{ d: still }}
                d={still}
                animate={{
                  d: active
                    ? pointed
                      ? [point, pointSoft, point]
                      : [pebble, star, star, puff, pebble]
                    : still,
                }}
                transition={
                  active
                    ? {
                        duration: pointed ? 2.8 : 4.2,
                        repeat: Infinity,
                        times: pointed ? [0, 0.5, 1] : [0, 0.3, 0.45, 0.75, 1],
                        ease: [...motionTokens.ease.settle],
                      }
                    : { duration: 0 }
                }
              />
            </motion.g>
            <motion.circle
              className="core"
              cx="50"
              cy="50"
              r="5"
              initial={{ scale: 1 }}
              animate={{ scale: active ? [1, 0.6, 1] : 1 }}
              transition={
                active
                  ? { duration: 2.1, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0 }
              }
              style={{ transformOrigin: "50% 50%", transformBox: "view-box" }}
            />
          </>
        ) : appearance === "orbit" ? (
          <>
            <circle className="v-pulse__orbit" cx="50" cy="50" r="33" />
            <motion.g
              initial={{ rotate: 0 }}
              animate={{ rotate: active ? [0, 360] : 0 }}
              transition={
                active
                  ? { duration: 3.6, repeat: Infinity, ease: "linear" }
                  : { duration: 0 }
              }
              style={{ transformOrigin: "50% 50%", transformBox: "view-box" }}
            >
              {[0, 1, 2].map((i) => (
                <g key={i} transform={`rotate(${i * 120} 50 50)`}>
                  <ellipse
                    className={`v-pulse__mark v-pulse__mark--${i}`}
                    cx="50"
                    cy="17"
                    rx={9 - i * 2}
                    ry={12 - i * 2}
                  />
                </g>
              ))}
            </motion.g>
            <path
              className="v-pulse__hub"
              d="M50 39Q51 49 61 50Q51 51 50 61Q49 51 39 50Q49 49 50 39Z"
            />
          </>
        ) : (
          <>
            <path className="v-pulse__orbit" d="M15 58H85" />
            {[0, 1, 2].map((i) => (
              <motion.rect
                key={i}
                className={`v-pulse__mark v-pulse__mark--${i}`}
                x={9 + i * 30}
                y="39"
                width="22"
                height="28"
                rx="10"
                initial={{ y: 0, rx: 10, opacity: 1 }}
                animate={{
                  y: active ? [0, -15, 0] : 0,
                  rx: active ? [10, 5, 10] : 10,
                  opacity: active ? [0.45, 1, 0.45] : 1,
                }}
                transition={
                  active
                    ? {
                        duration: 1.8,
                        repeat: Infinity,
                        delay: i * 0.22,
                        ease: [...motionTokens.ease.settle],
                      }
                    : { duration: 0 }
                }
              />
            ))}
          </>
        )}
      </svg>
      {caption && <SpinnerLabel>{caption}</SpinnerLabel>}
      {children}
    </span>
  );
}
const SpinnerLabelVariants = cva(
  "v-pulse__label [font-weight:var(--fw-medium)] [color:var(--v-text-2)] [opacity:1] [position:absolute] [inset:auto_auto_-20px_50%] [transform:translateX(-50%)] [font-size:var(--fs-caps)] [white-space:nowrap]",
  {
    variants: { variant: { default: "" }, size: { default: "" } },
    defaultVariants: { variant: "default", size: "default" },
  },
);
type SpinnerLabelProps = React.ComponentProps<"span"> &
  VariantProps<typeof SpinnerLabelVariants>;
function SpinnerLabel({
  className,
  variant,
  size,
  ...props
}: SpinnerLabelProps) {
  return (
    <span
      data-slot="spinner-label"
      data-part="label"
      className={cn(SpinnerLabelVariants({ variant, size }), className)}
      {...props}
    />
  );
}

// ---- registry/cojeev/ui/presence.tsx (inlined) ----
const shown = { opacity: 1, "--presence-x": "0px", "--presence-y": "0px", "--presence-scale": 1 };
const presencePresets = {
  fade: { initial: { ...shown, opacity: 0 }, animate: shown, exit: { ...shown, opacity: 0 } },
  rise: { initial: { ...shown, opacity: 0, "--presence-y": "10px" }, animate: shown, exit: { ...shown, opacity: 0, "--presence-y": "-6px" } },
  slide: { initial: { ...shown, opacity: 0, "--presence-x": "16px" }, animate: shown, exit: { ...shown, opacity: 0, "--presence-x": "-10px" } },
  scale: { initial: { ...shown, opacity: 0, "--presence-scale": .96 }, animate: shown, exit: { ...shown, opacity: 0, "--presence-scale": .985 } },
  settle: { initial: { ...shown, opacity: 0, "--presence-y": "6px", "--presence-scale": 1.04 }, animate: shown, exit: { ...shown, opacity: 0, "--presence-y": "-5px", "--presence-scale": .94 } },
  soften: { initial: { ...shown, opacity: 0, "--presence-y": "8px", "--presence-blur": "5px" }, animate: { ...shown, "--presence-blur": "0px" }, exit: { ...shown, opacity: 0, "--presence-y": "-10px", "--presence-blur": "6px" } },
  focus: { initial: { ...shown, opacity: 0, "--presence-y": "10px", "--presence-scale": 1.015, "--presence-blur": "9px" }, animate: { ...shown, "--presence-blur": "0px" }, exit: { ...shown, opacity: 0, "--presence-y": "-8px", "--presence-blur": "7px" } },
  mask: {
    initial: { ...shown, opacity: 0, clipPath: "inset(0% 0% 100% 0% round 16px)" },
    animate: { ...shown, clipPath: "inset(0% 0% 0% 0% round 16px)" },
    exit: { ...shown, opacity: 0, clipPath: "inset(0% 0% 100% 0% round 16px)" },
  },
} satisfies Record<string, { initial: Target; animate: Target; exit: Target }>;
type PresencePreset = keyof typeof presencePresets;
type MotionPresenceProps = React.ComponentProps<typeof AnimatePresence>;
/** Keep this boundary mounted; each conditional direct child needs a stable key. */
function MotionPresence({ initial = false, ...props }: MotionPresenceProps) {
  const { quiet } = useChoreography();
  return <AnimatePresence initial={quiet ? false : initial} {...props} />;
}
const MotionSlot = motion.create(Slot);
type MotionSurfaceProps = HTMLMotionProps<"div"> & {
  "data-slot"?: string;
  /** Merge onto exactly one ref-capable child, preserving its native element. */
  asChild?: boolean;
  preset?: PresencePreset;
  /** Seconds; use motionTokens.stagger for a coordinated sibling sequence. */
  delay?: number;
  /** Seconds before exit; cap sibling staggering yourself to a short total window. */
  exitDelay?: number;
  /** Seconds. Soft-focus and settling presets use a gentler 420ms default. */
  exitDuration?: number;
};
/** Defines lifecycle states. An external MotionPresence retains actual removals. */
function MotionSurface({
  asChild = false, preset = "rise", delay = 0, exitDelay = 0, exitDuration, className,
  initial, animate, exit, transition: suppliedTransition, ...props
}: MotionSurfaceProps) {
  const { quiet, transition } = useChoreography();
  const isPresent = useIsPresent();
  const states = presencePresets[preset];
  const Element = asChild ? MotionSlot : motion.div;
  const entrance = { ...transition, delay: Math.max(0, Number.isFinite(delay) ? delay : 0), ...suppliedTransition };
  const soft = ["soften", "focus", "settle"].includes(preset);
  const exitTime = exitDuration === undefined || !Number.isFinite(exitDuration) ? soft ? .42 : motionTokens.duration.exit : Math.min(2, Math.max(0, exitDuration));
  const exitState: TargetAndTransition = { ...states.exit, transition: { duration: exitTime, delay: Number.isFinite(exitDelay) ? Math.min(.6, Math.max(0, exitDelay)) : 0, ease: [...(soft ? motionTokens.ease.settle : motionTokens.ease.exit)] } };
  const children = !isPresent && asChild && React.isValidElement(props.children)
    ? React.cloneElement(props.children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { inert: true, "aria-hidden": true })
    : props.children;
  return <Element
    {...props}
    {...(asChild ? {} : { "data-slot": props["data-slot"] ?? "motion-surface" })}
    data-motion-surface={preset}
    data-motion-quiet={quiet ? "true" : undefined}
    data-motion-exiting={!isPresent ? "true" : undefined}
    inert={!isPresent || props.inert || undefined}
    aria-hidden={!isPresent ? true : props["aria-hidden"]}
    className={cn("v-motion-surface", className)}
    initial={quiet ? false : initial ?? states.initial}
    animate={quiet ? states.animate : animate ?? states.animate}
    exit={quiet ? { ...states.animate, transition: { duration: 0, delay: 0 } } : exit ?? exitState}
    transition={quiet ? { duration: 0, delay: 0 } : entrance}
  >{children}</Element>;
}

// ---- registry/cojeev/motion/flow.ts (inlined) ----
type Group={element:HTMLElement;place:(animate?:boolean)=>void;resolve:()=>void;dispose:()=>void}
const groups=new Map<HTMLElement,Group>()
let users=0,releaseEnvironment=()=>{},trigger:null|{x:number;y:number;t:number}=null
function isFlowQuiet(el?:HTMLElement){return getMotionSettings().mode==='off'||getFlowSettings().variant==='off'||(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches)||!!el?.closest('[data-flow="off"],[data-no-glide]')}
/** Shared activation/settings/visibility subscriptions exist only while a component owns flow. */
function acquireFlowEnvironment(){
 if(users++===0){
  const ac=new AbortController(),opts={signal:ac.signal,capture:true},rm=matchMedia('(prefers-reduced-motion: reduce)')
  const refresh=()=>{applyFlowSettings();groups.forEach(group=>group.resolve())}
  window.addEventListener('pointerdown',event=>{trigger={x:event.clientX,y:event.clientY,t:getMotionTime()}},opts)
  window.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target instanceof Element){const r=event.target.getBoundingClientRect();trigger={x:r.left+r.width/2,y:r.top+r.height/2,t:getMotionTime()}}},opts)
  window.addEventListener('resize',()=>replaceFlow(),{signal:ac.signal,passive:true})
  document.addEventListener('visibilitychange',()=>groups.forEach(group=>group.resolve()),{signal:ac.signal})
  rm.addEventListener('change',refresh,{signal:ac.signal})
  const unsubscribe=subscribeSettings(refresh);applyFlowSettings()
  releaseEnvironment=()=>{ac.abort();unsubscribe();trigger=null}
 }
 let released=false;return ()=>{if(released)return;released=true;if(--users===0)releaseEnvironment()}
}
function replaceFlow(root?:HTMLElement){groups.forEach(group=>{if(!root||group.element===root||root.contains(group.element))group.place(false)})}
const pulses=new WeakMap<HTMLElement,()=>void>()
function cancelFlowPulse(el:HTMLElement){pulses.get(el)?.();pulses.delete(el)}
function pulseFlow(el:HTMLElement){
 cancelFlowPulse(el)
 if(isFlowQuiet(el)||document.hidden||el.closest('.v-glide')||el.matches(':disabled,[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])')||el.closest('[inert],[hidden]'))return
 const surface=el.hasAttribute('data-stable-hit')?el.querySelector<SVGElement>('svg.v-morph'):el
 if(!surface)return
 const scale=surface.style.getPropertyValue('scale'),intensity=Math.min(getFlowSettings().intensity,2)
 let active=true
 const lane=createMotionLane(.975,value=>{if(active)surface.style.setProperty('scale',String(1+(value-1)*intensity))})
 const cleanup=()=>{if(!active)return;active=false;lane.dispose();if(scale)surface.style.setProperty('scale',scale);else surface.style.removeProperty('scale');pulses.delete(el)}
 pulses.set(el,cleanup)
 lane.to(1,resolveChoreography(getSettingsSnapshot(),false).transition,cleanup)
}

// ---- registry/cojeev/motion/flow-press.ts (inlined) ----
const semanticStateTransitions=new Set(['checked:unchecked','unchecked:checked','on:off','off:on','open:closed','closed:open'])
/** Standalone release/change pulse; selected children defer to their group's travelling body. */
function useFlowPress<T extends HTMLElement>(externalRef?:React.Ref<T>):React.RefCallback<T>{
 return React.useCallback((el:T|null)=>{
  let externalCleanup:void|(()=>void)
  if(typeof externalRef==='function')externalCleanup=externalRef(el);else if(externalRef)externalRef.current=el
  if(!el)return
  const release=acquireFlowEnvironment(),ac=new AbortController(),options={capture:true,signal:ac.signal},touched=new Map<HTMLElement,{attribute:string|null;styles:Map<string,string>}>()
  const pulse=(target:HTMLElement)=>{
   if(!touched.has(target))touched.set(target,{attribute:target.getAttribute('data-flow-land'),styles:new Map(['--flow-ease','--flow-dur','--flow-land','--flow-glow'].map(key=>[key,target.style.getPropertyValue(key)]))})
   pulseFlow(target)
  }
  const restore=()=>{for(const [target,old]of touched){cancelFlowPulse(target);if(old.attribute===null)target.removeAttribute('data-flow-land');else target.setAttribute('data-flow-land',old.attribute);for(const [key,value]of old.styles){if(value)target.style.setProperty(key,value);else target.style.removeProperty(key)}}touched.clear()}
  const change=(event:Event)=>{const target=event.target
   if(el.matches('.v-slider,.v-sliderwrap')||target instanceof Element&&target.matches('.v-slider,[role="slider"]')){const output=el.closest('.v-sliderwrap')?.querySelector<HTMLElement>('output');if(output)pulse(output);return}
   if(target instanceof HTMLElement&&target.matches('input[type="checkbox"],input[type="radio"]')){const host=target.closest<HTMLElement>('.v-switch,.v-check,.v-radio,.v-iradio,.v-quest__opt');pulse(host?.matches('.v-check,.v-radio')?target:host??el)}else pulse(el)
  }
  el.addEventListener('pointerup',()=>pulse(el),options)
  el.addEventListener('keyup',event=>{if(event.key==='Enter'||event.key===' ')pulse(el)},options)
  el.addEventListener('change',change,options);el.addEventListener('input',change,options)
  const states=new MutationObserver(records=>{
   if(el.matches(':disabled,[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert],[hidden]')){restore();return}
   const nextValues=new Map<string,string|null>();let changed=false
   for(let index=records.length-1;index>=0;index--){const record=records[index],name=record.attributeName;if(record.target!==el||!name)continue
    const next=nextValues.has(name)?nextValues.get(name)!:el.getAttribute(name);nextValues.set(name,record.oldValue)
    if(name==='data-state')changed ||= semanticStateTransitions.has(`${record.oldValue}:${next}`)
    else if(name==='aria-checked'||name==='aria-pressed')changed ||= record.oldValue!==next
   }
   if(changed)pulse(el)
  })
  states.observe(el,{attributes:true,attributeOldValue:true,attributeFilter:['data-state','aria-checked','aria-pressed','disabled','aria-disabled','data-disabled','inert','hidden']})
  const rm=matchMedia('(prefers-reduced-motion: reduce)'),quiet=()=>{if(isFlowQuiet(el)||document.hidden)restore()}
  rm.addEventListener('change',quiet,{signal:ac.signal});document.addEventListener('visibilitychange',quiet,{signal:ac.signal});const unsubscribe=subscribeSettings(quiet)
  return ()=>{ac.abort();states.disconnect();unsubscribe();restore();release();if(typeof externalCleanup==='function')externalCleanup();else if(typeof externalRef==='function')externalRef(null);else if(externalRef)externalRef.current=null}
 },[externalRef])
}

// ---- registry/cojeev/motion/geometry.ts (inlined) ----
type Spring = {x:number;v:number;to:number;k:number;z:number}
type Rim = number[][] & {per:number;poly?:boolean}
// Authored rounded rim, Catmull-Rom and fixed 4ms integrator.
function rim(w:number,h:number,r:number,step:number){const sw=Math.max(0,w-2*r),sh=Math.max(0,h-2*r),qa=Math.PI*r/2,per=2*sw+2*sh+4*qa,n=Math.max(64,Math.min(320,Math.round(per/step))),out=[] as unknown as Rim;
for(let i=0;i<n;i++){let d=(i/n)*per;const arc=d;let x,y,nx,ny;
if(d<sw){x=r+d;y=0;nx=0;ny=-1}else if((d-=sw)<qa){const a=-Math.PI/2+d/r;x=w-r+r*Math.cos(a);y=r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
else if((d-=qa)<sh){x=w;y=r+d;nx=1;ny=0}else if((d-=sh)<qa){const a=d/r;x=w-r+r*Math.cos(a);y=h-r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
else if((d-=qa)<sw){x=w-r-d;y=h;nx=0;ny=1}else if((d-=sw)<qa){const a=Math.PI/2+d/r;x=r+r*Math.cos(a);y=h-r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
else if((d-=qa)<sh){x=0;y=h-r-d;nx=-1;ny=0}else{d-=sh;const a=Math.PI+d/r;x=r+r*Math.cos(a);y=r+r*Math.sin(a);nx=Math.cos(a);ny=Math.sin(a)}
out.push([x,y,nx,ny,arc])}out.per=per;return out}
const f2=(v:number)=>v.toFixed(2);
// Catmull-Rom for rounded bodies (dense → exact arcs); straight polyline for true shapes (keeps sharp tips)
function path_Geometry(p:number[][],poly=false){const n=p.length;if(poly){let d='M'+f2(p[0][0])+' '+f2(p[0][1]);for(let i=1;i<n;i++)d+='L'+f2(p[i][0])+' '+f2(p[i][1]);return d+'Z'}
let d='';for(let i=0;i<n;i++){const p0=p[(i-1+n)%n],p1=p[i],p2=p[(i+1)%n],p3=p[(i+2)%n];d+=(i?'':`M${f2(p1[0])} ${f2(p1[1])}`)+`C${f2(p1[0]+(p2[0]-p0[0])/6)} ${f2(p1[1]+(p2[1]-p0[1])/6)} ${f2(p2[0]-(p3[0]-p1[0])/6)} ${f2(p2[1]-(p3[1]-p1[1])/6)} ${f2(p2[0])} ${f2(p2[1])}`}return d+'Z'}
const SETTLE=.0008;
/* below this the spring is snapped to target and its velocity zeroed */
const spring=(s:Spring,dt:number)=>{const k=s.k||120,c=2*Math.sqrt(k)*(s.z??1);let t=Math.min(dt,.1);while(t>0){const h=Math.min(.004,t);s.v+=((s.to-s.x)*k-s.v*c)*h;s.x+=s.v*h;t-=h}if(Math.abs(s.to-s.x)<SETTLE&&Math.abs(s.v)<SETTLE){s.x=s.to;s.v=0}};

// ---- registry/cojeev/lib/signature-shapes.ts (inlined) ----
/** Original mathematical silhouettes inspired by the shared organic-shape moodboard.
 * Every path uses the same 96 cubic segments, so state changes can interpolate.
 */
type Point = readonly [number, number];
const tau = Math.PI * 2;
function shapeContour(sample: (angle: number) => Point) {
  const points = Array.from({ length: 96 }, (_, i) => sample(i / 96 * tau));
  const f = (n: number) => Number(n.toFixed(3));
  let path = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length; i++) {
    const before = points[(i + 95) % 96], a = points[i], b = points[(i + 1) % 96], after = points[(i + 2) % 96];
    path += `C${f(a[0] + (b[0] - before[0]) / 6)} ${f(a[1] + (b[1] - before[1]) / 6)} ${f(b[0] - (after[0] - a[0]) / 6)} ${f(b[1] - (after[1] - a[1]) / 6)} ${f(b[0])} ${f(b[1])}`;
  }
  return path + "Z";
}
const radial = (radius: (angle: number) => number, sx = 1, sy = 1) => shapeContour(t => [50 + radius(t) * Math.cos(t) * sx, 50 + radius(t) * Math.sin(t) * sy]);
const signatureShapePaths = {
  "daisy-12": radial(t => 35 + 10 * Math.cos(12 * t)),
  "petal-7": radial(t => 32 + 14 * Math.cos(7 * t)),
  "aster-9": radial(t => 29 + 16 * Math.pow((1 + Math.cos(9 * t)) / 2, 1.6)),
  "sunburst-24": radial(t => 39 + 7 * Math.cos(24 * t)),
  "clover-soft": radial(t => 35 + 10 * Math.cos(4 * t)),
  "cloud-3": radial(t => 37 + 7 * Math.cos(3 * t - .8), 1, .82),
  "pebble-soft": radial(t => 38 + 5 * Math.cos(3 * t + .6) + 2 * Math.sin(5 * t)),
  "pebble-tall": radial(t => 38 + 5 * Math.cos(3 * t + .2) + 2 * Math.sin(2 * t), .68, 1),
  "ribbon-soft": radial(t => 29 + 15 * Math.cos(2 * t) + 2 * Math.sin(5 * t), 1, .82),
  "scalloped-square": radial(t => (36 / Math.pow(Math.pow(Math.abs(Math.cos(t)), 6) + Math.pow(Math.abs(Math.sin(t)), 6), 1 / 6)) + 2.2 * Math.cos(16 * t)),
  "cushion": radial(t => 37 - 5 * Math.cos(4 * t) + 1.5 * Math.cos(8 * t)),
  "seed-wing": radial(t => 34 + 8 * Math.cos(3 * t) + 4 * Math.sin(2 * t)),
} as const;

// ---- registry/cojeev/motion/shapes.ts (inlined) ----
// Authored true shapes, sampled by arc length using a detached SVG probe.
const star_Shapes=(n:number,ro:number,ri:number)=>{const a=[];for(let i=0;i<n*2;i++){const r=i%2?ri:ro,t=-Math.PI/2+i*Math.PI/n;a.push([50+r*Math.cos(t),50+r*Math.sin(t)])}return 'M'+a.map(p=>p.map(v=>v.toFixed(2)).join(' ')).join('L')+'Z'};
const polar=(f:(th:number)=>number)=>(t:number)=>{const th=t*Math.PI*2;const r=f(th);return [50+r*Math.cos(th),50+r*Math.sin(th)]};
const SHAPES:Record<string,string|((t:number)=>number[])>={
...signatureShapePaths,
heart:'M50 90C22 68 6 52 6 33A20 20 0 0 1 50 21A20 20 0 0 1 94 33C94 52 78 68 50 90Z',
crescent:'M60 5A45 45 0 1 0 60 95A50 50 0 0 1 60 5Z',
'star-8':star_Shapes(8,48,30),'star-5':star_Shapes(5,48,22),'star-6':star_Shapes(6,48,28),
'star-4':'M50 2Q58 42 98 50Q58 58 50 98Q42 58 2 50Q42 42 50 2Z',
'blob-4':'M50 4C62 4 70 14 70 24C70 30 66 34 66 34C66 34 70 30 76 30C86 30 96 38 96 50C96 62 86 70 76 70C70 70 66 66 66 66C66 66 70 70 70 76C70 86 62 96 50 96C38 96 30 86 30 76C30 70 34 66 34 66C34 66 30 70 24 70C14 70 4 62 4 50C4 38 14 30 24 30C30 30 34 34 34 34C34 34 30 30 30 24C30 14 38 4 50 4Z',
cross:'M36 4H64Q68 4 68 8V32H92Q96 32 96 36V64Q96 68 92 68H68V92Q68 96 64 96H36Q32 96 32 92V68H8Q4 68 4 64V36Q4 32 8 32H32V8Q32 4 36 4Z',
droplet:'M50 4C50 4 12 46 12 64A38 38 0 0 0 88 64C88 46 50 4 50 4Z',
circle:'M50 4A46 46 0 1 1 49.99 4Z',
triangle:'M46 10Q50 4 54 10L94 84Q97 90 90 90H10Q3 90 6 84Z',
hex:'M25 6.7L75 6.7L100 50L75 93.3L25 93.3L0 50Z',
'flower-5':polar(th=>36+10*Math.cos(5*th)),'flower-6':polar(th=>36+10*Math.cos(6*th)),'flower-8':polar(th=>38+8*Math.cos(8*th)),
'splat-4':polar(th=>33+13*Math.cos(4*th)+2*Math.cos(8*th)),'splat-5':polar(th=>34+12*Math.cos(5*th)),
scallop:polar(th=>44.5+3*Math.cos(16*th)),pebble:polar(th=>42+3*Math.cos(3*th+.6)+2*Math.sin(5*th)),
squircle:t=>{const th=t*Math.PI*2,c=Math.cos(th),s=Math.sin(th);return [50+46*Math.sign(c)*Math.pow(Math.abs(c),.5),50+46*Math.sign(s)*Math.pow(Math.abs(s),.5)]},
egg:t=>{const th=t*Math.PI*2;return [50+38*Math.cos(th)*(1-.16*Math.sin(th)),50+44*Math.sin(th)]},
bean:t=>{const th=t*Math.PI*2,s=Math.sin(th);return [50+42*Math.cos(th),50-(26*s+14*Math.cos(2*th)*(1+s)/2)]},
leaf:t=>{const th=t*Math.PI*2,s=Math.sin(th),x=46*Math.cos(th),y=28*s*Math.pow(Math.abs(s),.45),c=Math.SQRT1_2;return [50+(x-y)*c,50+(x+y)*c]}};
// dense raw polyline for a shape (≈600 points)
function rawShape(name:string){const s=SHAPES[name];const N=600,out=[];if(typeof s==='function'){for(let i=0;i<N;i++)out.push(s(i/N));return out}const pr=document.createElementNS('http://www.w3.org/2000/svg','path');pr.setAttribute('d',s);const L=pr.getTotalLength();for(let i=0;i<N;i++){const p=pr.getPointAtLength(L*i/N);out.push([p.x,p.y])}return out}
// resample a closed polyline by arc length into n points, fitted (contain, centred) into w×h; returns [x,y,nx,ny,arc] + per
function fromShape(name:string,w:number,h:number,step:number){const raw=rawShape(name);let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;for(const [x,y] of raw){if(x<minx)minx=x;if(y<miny)miny=y;if(x>maxx)maxx=x;if(y>maxy)maxy=y}const sc=Math.min(w/(maxx-minx),h/(maxy-miny)),ox=(w-(maxx-minx)*sc)/2-minx*sc,oy=(h-(maxy-miny)*sc)/2-miny*sc;const pts=raw.map(([x,y])=>[x*sc+ox,y*sc+oy]);
const N=pts.length,cum=[0];for(let i=1;i<=N;i++){const a=pts[i-1],b=pts[i%N];cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}const per=cum[N];const n=Math.max(48,Math.min(420,Math.round(per/step)));const out=[] as unknown as Rim;let j=0;
for(let i=0;i<n;i++){const d=per*i/n;while(j<N-1&&cum[j+1]<d)j++;const a=pts[j],b=pts[(j+1)%N],t=(d-cum[j])/((cum[j+1]-cum[j])||1);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0,0,d])}
// normals from neighbours; orient outward using the centroid
let cx=0,cy=0;for(const p of out){cx+=p[0];cy+=p[1]}cx/=n;cy/=n;let sgn=0;for(let i=0;i<n;i++){const a=out[(i-1+n)%n],b=out[(i+1)%n];const tx=b[0]-a[0],ty=b[1]-a[1];const L=Math.hypot(tx,ty)||1;const nx=ty/L,ny=-tx/L;out[i][2]=nx;out[i][3]=ny;sgn+=nx*(out[i][0]-cx)+ny*(out[i][1]-cy)}if(sgn<0)for(const p of out){p[2]=-p[2];p[3]=-p[3]}
out.per=per;out.poly=true;return out}

// ---- registry/cojeev/motion/body.ts (inlined) ----
type BodyFrame={d:string;points:number[][];press:number;active:boolean}
const drawnFrames=new WeakMap<Body,{at:number;frame:BodyFrame}>()
type Body = {
 tier:Tier;tierName:TierName;seed:number;w:number;h:number;base:Rim;R:{left:number;top:number;right:number;bottom:number;width:number;height:number};
 lobe:Spring;arc:Spring;hold:Spring;press:Spring;dirS:{x:Spring;y:Spring};dir:{x:number;y:number};
 ripple:number;jiggle:number;jArc:number;mergeT:number;inside:boolean;near:boolean;focus:boolean;
 lob:null|{n:number;a:number;L:{c:number;a:number;w:number}[]}
}
const scalar=(k:number,z=1):Spring=>({x:0,v:0,to:0,k,z})
function createBody(tier:Tier,tierName:TierName,seed=0):Body{return {tier,tierName,seed,w:0,h:0,base:rim(1,1,.5,2.5),R:{left:0,top:0,right:1,bottom:1,width:1,height:1},lobe:scalar(90,.9),arc:scalar(26),hold:scalar(55),press:scalar(140,.9),dirS:{x:scalar(40),y:scalar(40)},dir:{x:0,y:-1},ripple:0,jiggle:0,jArc:0,mergeT:0,inside:false,near:false,focus:false,lob:null}}
function rewindBody(b:Body){for(const s of [b.lobe,b.arc,b.hold,b.press,b.dirS.x,b.dirS.y]){s.x=s.v=s.to=0}b.jiggle=b.ripple=b.mergeT=0;b.inside=b.near=b.focus=false;b.lob=null;drawnFrames.delete(b)}
function bodyPadding(tier:Tier,cfg:MorphConfig,w:number,h:number){const m=Math.min(w,h);return Math.ceil(tier.reach+(tier.press+tier.depth*1.6)*m+(cfg.echo?cfg.echoOff+m*Math.abs(cfg.echoScale-1)+2:0)+(cfg.dots?16:0))+6}
function stepBody(b:Body,P:{x:number;y:number},dt:number,T:number,cfg:MorphConfig,RM=false,throttleRest=false):BodyFrame{
const tier=b.tier,base=b.base,per=base.per,m=Math.min(b.w,b.h);
const R=b.R!;const sx=b.w/R.width,sy=b.h/R.height;const cx=(P.x-R.left)*sx,cy=(P.y-R.top)*sy;const inBox=P.x>R.left-tier.R&&P.x<R.right+tier.R&&P.y>R.top-tier.R&&P.y<R.bottom+tier.R;const has=P.x>-1e3&&!RM&&tier.reach>0&&inBox;
let ni=0,nd=1e9;if(has){for(let i=0;i<base.length;i+=2){const q=base[i];const dd=(q[0]-cx)**2+(q[1]-cy)**2;if(dd<nd){nd=dd;ni=i}}}
const ins=has&&cx>0&&cx<b.w&&cy>0&&cy<b.h;const dist=Math.sqrt(nd);const near=has&&!ins&&dist<tier.R;
if(has&&(near||ins)){const q=base[ni];let da=q[4]-b.arc.x;da-=Math.round(da/per)*per;b.arc.to=b.arc.x+da;const dx=cx-q[0],dy=cy-q[1],L=Math.hypot(dx,dy)||1;b.dirS.x.to=dx/L;b.dirS.y.to=dy/L}
b.lobe.to=(near&&cfg.reach)?tier.reach*Math.pow(.5*(1-Math.cos(Math.PI*(1-dist/tier.R))),cfg.curve):0;
b.arc.k=cfg.arcK;b.hold.k=cfg.holdK;b.press.k=b.press.to?260:cfg.pressK;if(b.mergeT>0){b.mergeT-=dt;b.lobe.z=cfg.mergeZ;b.lobe.k=105}else{b.lobe.z=cfg.lobeZ;b.lobe.k=cfg.lobeK}
b.hold.to=cfg.hold?(ins?tier.inside*Math.max(.35,1-Math.min(dist,60)/80):(b.focus?tier.inside*.6:0)):0;
if(ins&&!b.inside&&cfg.merge)b.mergeT=.6;if(b.near&&!near&&!ins&&!RM&&cfg.jiggleOn){b.jiggle=1;b.jArc=b.arc.x}
b.inside=ins;b.near=near;
const active=near||ins||b.lobe.x>.02||b.hold.x>.02||b.press.x>.002||b.press.to||b.ripple>0||b.jiggle>0||b.mergeT>0;/* Rest breath no longer keeps the loop alive: it only modulates a body that is ALREADY awake through
     reach, hover, press or an explicit decorative blob. A settled page redraws nothing. */
// The reference checks current spring values before integrating. In particular,
// a newly focused idle body begins its hold on the next 250ms rest refresh.
const cached=drawnFrames.get(b),moving=tier.depth&&tier.lobes&&cfg.drift&&(near||ins)
if(throttleRest&&!active&&!moving&&cached&&T*1000-cached.at<250)return {...cached.frame,active:false}
if(b.jiggle>0)b.jiggle=Math.max(0,b.jiggle-dt*cfg.jiggleDecay);if(b.ripple>0)b.ripple=Math.max(0,b.ripple-dt*1.25);
spring(b.lobe,dt);spring(b.arc,dt);spring(b.hold,dt);spring(b.press,dt);spring(b.dirS.x,dt);spring(b.dirS.y,dt);const dl=Math.hypot(b.dirS.x.x,b.dirS.y.x)||1;b.dir={x:b.dirS.x.x/dl,y:b.dirS.y.x/dl};
const idle=(RM||!cfg.rest)?0:tier.amp*m,lobe=b.lobe.x,hold=b.hold.x,pr=b.press.x,rip=b.ripple,jg=b.jiggle;const isSpin=b.tierName==='spinner';const sig2=2*tier.sig*tier.sig;const pa=Math.atan2(cy-b.h/2,(cx-b.w/2)*(b.h/b.w));
if(tier.depth&&tier.lobes&&(!b.lob||b.lob.n!==tier.lobes||b.lob.a!==tier.asym)){const L=[];let s=b.seed;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};for(let j=0;j<tier.lobes;j++)L.push({c:j/tier.lobes+(rnd()-.5)*tier.asym*.5/tier.lobes,a:1+(rnd()-.5)*tier.asym*.9,w:1+(rnd()-.5)*tier.asym*.6});b.lob={n:tier.lobes,a:tier.asym,L}}
const dr=RM?0:T*.05*cfg.drift,armSig=tier.lobes?(tier.spread||.55)/tier.lobes*.5:0;
const N=base.length,pts=new Array<number[]>(N);
for(let i=0;i<N;i++){const q=base[i],x=q[0],y=q[1],nx=q[2],ny=q[3],arc=q[4],u=arc/per;
 let k=idle*(Math.sin(u*Math.PI*2*(isSpin?3:2)+T*.38*cfg.restSpeed+b.seed)*.6+Math.sin(u*Math.PI*2*3-T*.26*cfg.restSpeed+b.seed*1.3)*.4);
 if(armSig){let bump=-.35;for(const l of b.lob!.L){let du=u-l.c-dr*(1+l.a*.2);du-=Math.round(du);const s2=armSig*l.w;bump+=l.a*Math.exp(-(du*du)/(2*s2*s2))}k+=tier.depth*m*bump}
 let da=arc-b.arc.x;da-=Math.round(da/per)*per;const g=Math.exp(-(da*da)/sig2);
 k+=hold*(g*1.2-.15);
 if(pr&&cfg.press){const a=Math.atan2(ny,nx);const c=Math.cos(a-pa);k+=pr*tier.press*m*(-.9*c*c+.5*(1-c*c))}
 if(rip)k+=Math.sin(u*Math.PI*2*2-(1-rip)*Math.PI*4)*rip*rip*tier.press*m*.6;
 if(jg){let dj=arc-b.jArc;dj-=Math.round(dj/per)*per;const gj=Math.exp(-(dj*dj)/sig2);const t=1-jg;k+=gj*tier.reach*cfg.jiggle*Math.exp(-t*3.2)*Math.cos(t*Math.PI*3.4)}
 const lx=lobe*g*b.dir.x,ly=lobe*g*b.dir.y;const px=x+nx*k+lx,py=y+ny*k+ly;pts[i]=[px,py];}

const output={d:path_Geometry(pts,!!base.poly),points:pts,press:pr,active:!!active};drawnFrames.set(b,{at:T*1000,frame:output});return output
}

// ---- registry/cojeev/motion/category.ts (inlined) ----
const CATS:Record<Category,{sel:string;tier:TierName}>={
buttons:{sel:'.v-btn:not(.-ghost),.v-select,.v-toggle,.v-native,.v-dock__action,.v-menubar__trigger,.v-cal__month,.v-caption-pill',tier:'pill'},
icons:{sel:'.v-ibtn,.v-disk:not(.v-input>.v-disk):not(.v-igroup>.v-disk):not(.v-select .v-disk):not(.v-menu__item .v-disk),.v-search__disk,.v-collapse,.v-assist__close,.v-attached,.v-play,.v-edit,.v-node__port,.v-receipt__dot,.v-mood .v-face',tier:'tile'},
pills:{sel:'.v-badge:not(.-count):not(.-sm),.v-time,.v-stamp,.v-delta,.v-kbd,.v-capsule__name,.v-nav__count,.v-cal__wk.-on,.v-week__day,.v-bubble,.v-pager button,.v-marker,.v-prov',tier:'tile'},
cards:{sel:'.v-card,.v-record,.v-resource,.v-file,.v-alert,.v-state,.v-md__detail,.v-event,.v-needs,.v-upgrade,.v-node,.v-inspector,.v-palette__item,.v-validation,.v-compact,.v-widget,.v-capsule,.v-band,.v-kv.-panel,.v-quest__opt,.v-collapsible__body,.v-acc>details,.v-acc>[data-slot="accordion-item"],.v-empty,.v-feature__body,.v-resizable,.v-table-wrap,.v-list.-grouped,.v-mobile,.v-notch',tier:'card'},
nav:{sel:'.v-nav__item[aria-current="page"],.v-tabs:not(.-underline) .v-tabs:not(.-underline) .v-tab[aria-selected="true"],.v-item,.v-tabs.-pills,.v-tabs.-lenses,.v-seg,.v-menubar,.v-dock__item[aria-current="page"],.v-datestrip button[aria-pressed="true"],.v-cal__d:is([aria-selected="true"],[aria-pressed="true"],[data-state="active"]),.v-menu__item:is([aria-selected="true"],[data-highlighted],[data-state="checked"])',tier:'nav'},
inputs:{sel:'label.v-input,div.v-input,.v-igroup,.v-cmd__input,.v-combo .v-input,.v-otp input,.v-textarea',tier:'nav'},
controls:{sel:'.v-switch,.v-weekdays label,.v-iradio,.v-check input,.v-radio input,.v-slider,.v-track,.v-mood button,.v-hex,.v-avatar:not(.-square),.v-ratio,.v-file__thumb,.v-mask,.v-drops .v-drop',tier:'tile'},
surfaces:{sel:'.v-dialog,.v-sheet,.v-drawer,.v-menu,.v-popover,.v-cmd,.v-toast,.v-assist,.v-dock,.v-dockpanel,.v-sidebar,.v-scroller,.v-scroll,.v-hovercard>.v-popover,.v-collage,.v-feature,.v-ring,.v-prose',tier:'card'},
/* skeletons are the loudest bodies in the library: blob tier, so they breathe at rest and reach for the pointer */
skeleton:{sel:'.v-skel',tier:'pill'}};
const FILL_SEL='.v-btn:not(.-outline):not(.-ghost):not(.v-seg .v-btn),.v-badge:not(.-dashed):not(.-test),.v-card,.v-disk,.v-ibtn.-ink,.v-ibtn.-pink,.v-ibtn.-beige,.v-ibtn.-cream,.v-select,.v-time,.v-stamp,.v-delta,.v-toggle[aria-pressed="true"],.v-alert,.v-state:not(.-filtered),.v-event,.v-item.-selected,.v-md__detail,.v-tabs:not(.-underline) .v-tab[aria-selected="true"],.v-nav__item[aria-current="page"],.v-dock__action,.v-kbd,.v-bubble,.v-capsule__name,.v-nav__count,.v-week__day,.v-cal__month,.v-caption-pill,.v-menubar__trigger[aria-expanded="true"],.v-search__disk,.v-collapse,.v-assist__close,.v-attached,.v-play,.v-receipt__dot,.v-mood .v-face,.v-pager button[aria-current="page"],.v-datestrip button[aria-pressed="true"],.v-cal__d:is([aria-selected="true"],[aria-pressed="true"],[data-state="active"]),.v-cal__wk.-on,.v-switch,.v-weekdays label,.v-iradio:has(input:checked),.v-hex,.v-avatar,.v-skel,.v-track,.v-quest__opt,.v-band,.v-compact,.v-widget,.v-capsule,.v-node,.v-inspector,.v-palette__item,.v-validation,.v-upgrade,.v-needs,.v-record,.v-resource,.v-file,.v-kv.-panel,.v-collapsible__body,.v-acc>details,.v-acc>[data-slot="accordion-item"],.v-list.-grouped,.v-table-wrap,.v-mobile,.v-notch,.v-dialog,.v-sheet,.v-drawer,.v-menu,.v-popover,.v-cmd,.v-toast,.v-assist,.v-dock,.v-dockpanel,.v-sidebar,.v-scroller,.v-collage,.v-feature__body,.v-feature,.v-ratio,.v-file__thumb,.v-mask,.v-igroup,label.v-input,div.v-input,.v-cmd__input,.v-item,.v-menu__item:is([aria-selected="true"],[data-highlighted],[data-state="checked"]),.v-dock__item[aria-current="page"],.v-toggle';
const STROKE_SEL='.v-btn.-outline,.v-badge.-dashed,.v-badge.-test,.v-ibtn,.v-menubar,.v-otp,.v-ring,.v-pager button,.v-resizable,.v-scroll,.v-state.-filtered,.v-drops .v-drop,.v-mood button,.v-node__port,.v-hovercard>.v-popover';
const NEVER_SEL='.v-label,.v-field,.v-help,.v-prov,.v-marker,.v-prose,.v-caps,.v-meta,.v-quiet,.v-sr,label:not(.v-switch):not(.v-weekdays label),legend,dt,dd,p,h1,h2,h3,h4,caption,th:not([data-slot="calendar-week-number"])';
const VOID=/^(INPUT|SELECT|TEXTAREA|HR|IMG|BR)$/
type MorphHost={mode:"fill"|"stroke"|"both";tierName:TierName;explicit:boolean}
/** The hook category is an eligibility request, never permission to decorate arbitrary layout/text. */
function resolveMorphHost(el:HTMLElement,category:Category,settings:MotionSettings):MorphHost|null {
 if(VOID.test(el.tagName)||el.closest('[data-motion="off"],[hidden],svg,.tp,.ap,.code'))return null
 const css=getComputedStyle(el);if(/auto|scroll/.test(css.overflowX+css.overflowY))return null
 // Explicit alive opts into a body, but never turns text/layout into control geometry.
 const ownClasses=/^(v-alive|v-morph-host|v-morph-rel|v-morph-live)$/
 const bare=/^(DIV|SPAN)$/.test(el.tagName)&&!el.dataset.shape&&!el.dataset.tier&&[...el.classList].every(name=>ownClasses.test(name))
 if(el.matches(NEVER_SEL)||el.matches('.v-tip,.v-tooltip')||bare)return null
 const explicit=el.dataset.morph
 if(explicit==='none')return null
 if(explicit==='fill'||explicit==='stroke'||explicit==='both'){
  const tierName=(el.dataset.tier||(el.dataset.shape?'blob':el.matches('.v-card,[role="tablist"]')?'card':el.matches('.v-nav__item,.v-tab')?'nav':el.matches('.v-ibtn')?'tile':'pill')) as TierName
  return {mode:explicit,tierName,explicit:true}
 }
 if(settings.mode==='off'||!settings.cats[category]||!el.matches(CATS[category].sel)||el.matches(NEVER_SEL))return null
 const fill=el.matches(FILL_SEL),stroke=!fill&&el.matches(STROKE_SEL)
 if(!fill&&!stroke)return null
 return {mode:stroke?'stroke':'fill',tierName:(el.dataset.tier||CATS[category].tier) as TierName,explicit:false}
}
/** Authored tier values beat markup; only unchanged factory fields accept per-element overrides. */
function resolveMorphTier(el:HTMLElement,name:TierName,profile:MorphProfile){
 const current=profile.TIER[name],factory=factoryTiers[name];if(!current)return null
 const tier={...current}
 for(const key of ['reach','inside','amp','lobes','depth','asym','spread'] as const){const value=el.dataset[key];if(value!=null&&Number.isFinite(+value)&&current[key]===factory[key])tier[key]=+value}
 return tier
}
const hosts=new Map<HTMLElement,{refresh:()=>void;disable:()=>void}>()
function registerMorphHost(el:HTMLElement,host:{refresh:()=>void;disable:()=>void}){hosts.set(el,host);return ()=>{hosts.delete(el)}}

// ---- registry/cojeev/motion/morph-paint.ts (inlined) ----
const NS='http://www.w3.org/2000/svg'
let shared:SVGSVGElement|null=null,users_MorphPaint=0,serial=0
function node<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string>={}):SVGElementTagNameMap[K]{const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el}
/** One noise pattern and gradient while any alive body owns overlays. */
function acquireDefs(){
 if(!shared){
  const id=++serial;shared=node('svg',{id:'v-morph-defs',width:'0',height:'0','aria-hidden':'true'});shared.style.cssText='position:absolute;width:0;height:0;overflow:hidden'
  const defs=node('defs'),gradient=node('linearGradient',{id:'v-sheen-'+id,x1:'0',y1:'0',x2:'0',y2:'1'}),pattern=node('pattern',{id:'v-grain-'+id,patternUnits:'userSpaceOnUse',width:'160',height:'160'})
  for(const [offset,color,opacity]of [['0','rgb(255,255,255)','.09'],['.45','rgb(255,255,255)','0'],['1','rgb(0,0,0)','.03']])gradient.append(node('stop',{offset,'stop-color':color,'stop-opacity':opacity}))
  const grain=encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")
  pattern.append(node('image',{href:'data:image/svg+xml,'+grain,width:'160',height:'160'}));defs.append(gradient,pattern);shared.append(defs);document.body.prepend(shared)
 }
 users_MorphPaint++;const id=serial;let released=false
 return {id,release:()=>{if(released)return;released=true;if(--users_MorphPaint===0){shared?.remove();shared=null}}}
}
function createMorphOverlays(svg:SVGElement){
 const defs=acquireDefs(),sheen=node('path',{'data-morph-overlay':'sheen',fill:`url(#v-sheen-${defs.id})`}),grain=node('path',{'data-morph-overlay':'grain',fill:`url(#v-grain-${defs.id})`})
 grain.style.mixBlendMode='soft-light';svg.append(sheen,grain);let previous=''
 return {paint:(points:number[][],body:Body,cfg:MorphConfig)=>{
  const inset=path_Geometry(points.map(([x,y],i)=>[x-body.base[i][2]*.75,y-body.base[i][3]*.75]),!!body.base.poly)
  if(inset!==previous){sheen.setAttribute('d',inset);grain.setAttribute('d',inset);previous=inset}
  sheen.style.opacity=String(cfg.sheen);grain.style.opacity=String(cfg.grain)
 },dispose:()=>{sheen.remove();grain.remove();defs.release()}}
}
/** Source RGB interpolation. Six-digit authored hex values are the reference palette format. */
function morphColor(colors:string[],seconds:number){
 const fraction=(seconds*.35)%colors.length,index=Math.floor(fraction),a=colors[index],b=colors[(index+1)%colors.length]
 const rgb=(color:string)=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),A=rgb(a),B=rgb(b)
 return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*(fraction-index))).join(',')})`
}

// ---- registry/cojeev/motion/use-morph.ts (inlined) ----
const instances=new Set<{measure:(t:number)=>void;invalidate:()=>void;frame:(t:number,dt:number)=>boolean;rewind:()=>void;reseed:()=>void;refresh:()=>void}>()
let clock:number|null=null,previous:number|null=null,raf=0,seed:number|null=null
const pointer={x:-1e4,y:-1e4}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function frame(t:number){const dt=previous===null?0:Math.min(.05,Math.max(0,(t-previous)/1000));previous=t;let active=false;instances.forEach(b=>b.measure(t));instances.forEach(b=>{active=b.frame(t,dt)||active});return active}
function wake(){if(clock!==null||raf||!instances.size||document.hidden)return;raf=requestAnimationFrame(t=>{raf=0;if(frame(t))wake()})}
function bodySeed(el:HTMLElement){const raw=el.ownerDocument.documentElement.dataset.seed;const n=seed??(raw!=null&&raw!==""&&Number.isFinite(+raw)?+raw:null);if(n===null)return Math.random()*100;
 let key="",node:Element|null=el;while(node&&node!==el.ownerDocument.documentElement){let i=0,s=node.previousElementSibling;while(s){if(!s.matches("svg.v-morph,#v-morph-defs,.v-glide__pill,.v-glide__hover,.v-glide__trail"))i++;s=s.previousElementSibling}key=node.tagName+i+"/"+key;node=node.parentElement}
 let h=2166136261;for(const c of key+"#"+n){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h%100000/1000
}
const ns="http://www.w3.org/2000/svg"
function svgNode(tag:string,attrs:Record<string,string>={}){const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el}
const clear=(v:string)=>!v||v==="transparent"||v==="rgba(0, 0, 0, 0)"
function surfaceFill(el:HTMLElement){let bg="";for(let p=el.parentElement;p;p=p.parentElement){bg=getComputedStyle(p).backgroundColor;if(!clear(bg))break}const m=/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(bg);const rgb=m?m.slice(1).map(n=>{const v=+n/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4}):[1,1,1];return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]<.18?"rgba(251,244,230,.14)":"var(--v-beige)"}
// What a body is built from, keyed once per settings publish for every host. A character,
// Speed or Intensity change publishes too, but leaves this key alone, so hosts skip it.
let keyedSnapshot:unknown,morphKey=''
function morphInputs(){const s=getSettingsSnapshot();if(s!==keyedSnapshot){keyedSnapshot=s;morphKey=JSON.stringify([s.motion,s.profile])}return morphKey}
// One browser subscription set, acquired by mounted hooks and released with the last host.
let environmentUsers=0,disposeEnvironment=()=>{}
const rootStyleHosts=new Set<()=>void>()
function acquireEnvironment(sync:()=>void){
 rootStyleHosts.add(sync)
 if(environmentUsers++===0){
  const ac=new AbortController(),opts={signal:ac.signal}
  // Palette events can arrive inside another root observer before ours runs.
  // Reconcile geometry before repaint captures the new radius in its signature.
  const refresh=()=>{rootStyleHosts.forEach(sync=>sync());instances.forEach(b=>b.refresh())}
  // Parse once per root mutation batch, not per host. CSSOM preserves declarations
  // containing quoted semicolons while excluding only the flow timing tokens.
  const style=document.createElement('span').style
  const nonFlowStyle=(value:string|null)=>{style.cssText=value??'';for(const name of Array.from(style))if(name.startsWith('--flow-'))style.removeProperty(name);return style.cssText}
  const theme=new MutationObserver(records=>{
   if(records.some(record=>record.attributeName==='style')){
    const next=nonFlowStyle(document.documentElement.getAttribute('style'))
    if(records.some(record=>record.attributeName==='style'&&nonFlowStyle(record.oldValue)!==next))rootStyleHosts.forEach(sync=>sync())
   }
   if(records.some(record=>record.attributeName!=='style'))refresh()
  })
  theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-mode','data-skin','style'],attributeOldValue:true})
  window.addEventListener('v-theme',refresh,opts);window.addEventListener('v-palette',refresh,opts)
  document.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;wake()},{...opts,passive:true})
  document.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1e4;wake()},opts)
  const layout=()=>{instances.forEach(b=>b.invalidate());wake()}
  window.addEventListener('resize',layout,opts);window.addEventListener('scroll',layout,{...opts,capture:true,passive:true})
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{previous=performance.now();wake()}},opts)
  disposeEnvironment=()=>{ac.abort();theme.disconnect();stop();previous=null}
 }
 return ()=>{rootStyleHosts.delete(sync);if(--environmentUsers===0)disposeEnvironment()}
}
/** Component-owned attachment. No document scanning, global API, or provider required. */
function useMorph<T extends HTMLElement>(category:Category,externalRef?:React.Ref<T>){
 const [host,setHost]=React.useState<T|null>(null)
 const syncHost=React.useRef<()=>void>(()=>{})
 const ref=React.useCallback((node:T|null)=>{setHost(node);if(typeof externalRef==="function"){const cleanup=externalRef(node);return ()=>{setHost(null);if(typeof cleanup==="function")cleanup();else externalRef(null)}}if(externalRef)externalRef.current=node;return ()=>{setHost(null);if(externalRef)externalRef.current=null}},[externalRef])
 React.useLayoutEffect(()=>{
  if(!host)return
  const el=host,ac=new AbortController(),opts={signal:ac.signal}
  const mq=matchMedia("(prefers-reduced-motion: reduce)")
  let destroyBody:()=>void=()=>{},retuneProfile:()=>void=()=>attach()
  let retainedBody:Body|undefined,repairBody=()=>{},signature='',autoMode:string|undefined,lastPaint:{fill:string;stroke:string}|null=null
  // Internal aria/class retunes rebuild decoration, but do not re-tag the host.
  // The source keeps its finite CSS radius captured at autoTag (morph.js:298)
  // until automatic decoration is removed, even if responsive dimensions shrink.
  let automaticRadius:number|undefined
  let cornerSignature=''
  const visualSignature=()=>JSON.stringify([
   getComputedStyle(el).borderTopLeftRadius,
   el.className.split(/\s+/).filter(c=>!['v-morph-host','v-morph-live','v-morph-rel'].includes(c)).join(' '),
   ...['motion','tier','reach','inside','amp','lobes','depth','asym','spread','r','shape','sw','dash','colors'].map(k=>el.dataset[k]),
   el.dataset.morph===autoMode?'':el.dataset.morph,el.style.getPropertyValue('--mfill'),el.style.getPropertyValue('--mstroke'),
   ...['aria-selected','aria-current','aria-pressed','aria-checked','aria-expanded','disabled','aria-disabled','aria-busy','data-state','data-highlighted'].map(name=>el.getAttribute(name)),
  ])
  function attach(){
   const nextCorner=getComputedStyle(el).borderTopLeftRadius
   if(nextCorner!==cornerSignature){automaticRadius=undefined;cornerSignature=nextCorner}
   const overrides=new Map<string,string>()
   if(lastPaint)for(const key of ['fill','stroke'] as const){const value=el.style.getPropertyValue('--m'+key);if(value!==lastPaint[key])overrides.set('--m'+key,value)}
   destroyBody();destroyBody=()=>{};lastPaint=null
   for(const [key,value]of overrides){if(value)el.style.setProperty(key,value);else el.style.removeProperty(key)}
   repairBody=()=>{};retuneProfile=()=>attach();autoMode=undefined
   const settings=getMotionSettings(),profile=getMorphProfile(),resolved=resolveMorphHost(el,category,settings)
   if(!resolved){automaticRadius=undefined;return}
   const {mode,tierName,explicit}=resolved,cs=getComputedStyle(el)
   const resolvedTier=resolveMorphTier(el,tierName,profile);if(!resolvedTier){automaticRadius=undefined;return};const tier={...resolvedTier}
   // A selection group owns one travelling body. Its controls and container
   // remain still, even when an authored profile enables breathing or press.
   const selectionGroup=el.closest<HTMLElement>('[data-flow-owned].v-glide')
   const groupBody=!!selectionGroup&&selectionGroup.dataset.flowKind!=='fill'&&selectionGroup.matches('.v-tabs,.v-seg,.v-pager,.v-iradios,[role="tablist"],[data-slot="toggle-group"]')
   const cfg={...profile.cfg};if(settings.mode==="off"||mq.matches||groupBody)for(const k of ["rest","reach","merge","hold","jiggleOn","press"] as const)cfg[k]=false
   const b=retainedBody??createBody(tier,tierName,bodySeed(el));retainedBody=b
   b.tier=tier;b.tierName=tierName;b.w=b.h=0;b.focus=el===el.ownerDocument.activeElement||el.contains(el.ownerDocument.activeElement)
   if(mq.matches||settings.mode==="off"||groupBody)rewindBody(b)
   const old={fill:el.style.getPropertyValue('--mfill'),stroke:el.style.getPropertyValue('--mstroke'),pad:el.style.getPropertyValue('--mpad'),transform:el.style.transform}
   const svg=svgNode('svg',{class:'v-morph','aria-hidden':'true','shape-rendering':'geometricPrecision'})
   // Hidden hosts cannot be measured yet. Keep their new layer at zero size
   // until measure() replaces it, avoiding SVG's 300px intrinsic first frame.
   svg.style.cssText="position:absolute;width:0;height:0;pointer-events:none"
   const path=svgNode('path',{'data-morph-body':'',fill:mode!=='stroke'?'var(--mfill,var(--v-beige))':'none'})
   if(mode!=='fill'){path.setAttribute('stroke','var(--mstroke,transparent)');path.setAttribute('stroke-width',el.dataset.sw||(el.matches('.v-badge.-test')?'1.5':'1'));path.setAttribute('stroke-linejoin','round');const dash=el.dataset.dash||(el.matches('.v-badge.-dashed')?'3 3':'');if(dash)path.setAttribute('stroke-dasharray',dash)}
   const echo=svgNode('path',{'data-morph-echo':'',fill:'none',stroke:'var(--mstroke,var(--mfill,transparent))','stroke-width':'1.5','vector-effect':'non-scaling-stroke'}),dots=svgNode('g',{fill:'var(--mfill,transparent)'})
   echo.style.display=dots.style.display='none';svg.append(path,echo,dots)
   const overlays=el.matches('.v-alive,.combo')?createMorphOverlays(svg):null
   const colors=el.dataset.colors?.split(',').map(color=>color.trim()).filter(color=>/^#[0-9a-f]{6}$/i.test(color))??[]
   const staticBody=mq.matches||settings.mode==='off'||groupBody
   // Quiet bodies keep their authored CSS fill, including live theme/palette changes.
   // Only moving bodies opt out of that paint rule for animated color attributes.
   if(colors.length&&!staticBody)path.setAttribute('data-morph-colors','')

   if(!explicit){el.dataset.morph=mode;el.dataset.autoMorph=category;autoMode=mode}
   el.classList.add('v-morph-host','v-morph-live');const relative=cs.position==='static';if(relative)el.classList.add('v-morph-rel')
   const focused=el.ownerDocument.activeElement;el.prepend(svg);if(focused instanceof HTMLElement&&el.contains(focused)&&el.ownerDocument.activeElement!==focused)focused.focus({preventScroll:true})
   const repaint=()=>{
    // Explicit bodies take their paint from the author's live CSS variables.
    // Only the automatic category adapter captures the host background. Copying
    // inherited paint into an explicit body breaks its parent/theme inheritance.
    if(!explicit&&mode!=='fill')el.style.setProperty('--mstroke',old.stroke||(el.matches('.v-badge.-test')?'var(--v-ink)':el.matches('.v-badge.-dashed')?'var(--v-text-2)':'var(--v-border)'))
    if(!explicit&&mode!=='stroke'){
     // Sample the authored CSS paint without detaching the SVG or changing the
     // host's live class. Detachment during pointer crossings invalidates browser
     // hit testing and stacking; the decorative node must remain mounted.
     // Paint-only :has(>svg.v-morph) rules are suspended by its class, not its DOM.
     // Capture the authored endpoint, not an in-flight background transition.
     // Otherwise busy/selected state changes can freeze the previous paint into
     // --mfill after the host's CSS transition has already finished.
     const transition=el.style.getPropertyValue('transition-property'),transitionPriority=el.style.getPropertyPriority('transition-property')
     el.style.setProperty('transition-property','none','important')
     svg.classList.remove('v-morph')
     el.style.removeProperty('--mfill')
     const paint=getComputedStyle(el),bg=paint.backgroundColor,cssFill=paint.getPropertyValue('--mfill').trim()
     // A transparent CSS fill is meaningful: selected controls reveal the
     // travelling flow layer underneath their own morph body.
     const fill=!clear(bg)?bg:old.fill||cssFill||surfaceFill(el)
     svg.classList.add('v-morph')
     el.style.setProperty('--mfill',fill)
     if(transition)el.style.setProperty('transition-property',transition,transitionPriority)
     else el.style.removeProperty('transition-property')
    }
    lastPaint={fill:el.style.getPropertyValue('--mfill'),stroke:el.style.getPropertyValue('--mstroke')};signature=visualSignature()
   }
   let rectValid=false,rAt=0,resize=true
   let lastD='',dirty=true
   repairBody=()=>{
    if(svg.parentNode!==el){el.prepend(svg);dirty=true}
    el.classList.add('v-morph-host','v-morph-live');if(relative)el.classList.add('v-morph-rel')
    if(!explicit&&!el.dataset.morph)el.dataset.morph=mode
   }
   function measure(){const R=el.getBoundingClientRect();b.R=R;const w=Math.round(R.width),h=Math.round(R.height);if(!w||!h)return;if(w===b.w&&h===b.h)return;b.w=w;b.h=h;const authored=el.dataset.r;const corner=getComputedStyle(el).borderTopLeftRadius,original=parseFloat(corner);
    // Explicit bodies retain their original capsule default. Opt-in CSS corners
    // let a component's radius control change the painted contour as well.
    const cssRadius=Number.isFinite(original)?Math.min(Math.min(w,h)/2,corner.endsWith('%')?Math.min(w,h)*original/100:original):Math.min(w,h)/2;
    const radius=authored==='css'?cssRadius:authored?+authored:explicit?Math.min(w,h)/2:Number.isFinite(original)&&original<200?(automaticRadius??=Math.min(original,Math.min(el.offsetWidth,el.offsetHeight)/2)):Math.min(w,h)/2;b.base=el.dataset.shape&&SHAPES[el.dataset.shape]?fromShape(el.dataset.shape,w,h,Math.max(1,cfg.quality)*.7):rim(w,h,radius,Math.max(1,cfg.quality));const pad=bodyPadding(tier,cfg,w,h);svg.setAttribute('viewBox',`${-pad} ${-pad} ${w+2*pad} ${h+2*pad}`);svg.style.cssText=`position:absolute;left:${-pad}px;top:${-pad}px;width:${w+2*pad}px;height:${h+2*pad}px;pointer-events:none;overflow:visible;z-index:-1`;el.style.setProperty('--mpad',pad+'px');dirty=true}
   // Match the source's read pass before any body writes its press transform.
   // A release keeps the last pressed rect until it is stale or interaction
   // demands another read; reading every frame changes the pressure axis.
   function premeasure(t:number){
    if(!el.isConnected){automaticRadius=undefined;rectValid=false;return}
    const R=b.R,margin=tier.R+40
    const near=rectValid&&pointer.x>-1e3&&pointer.x>R.left-margin&&pointer.x<R.right+margin&&pointer.y>R.top-margin&&pointer.y<R.bottom+margin
    if(!rectValid||t-rAt>250||near||b.press.to||b.lobe.x>.02||b.jiggle>0){b.R=el.getBoundingClientRect();rAt=t;rectValid=true}
    resize=Math.round(b.R.width)!==b.w||Math.round(b.R.height)!==b.h
   }
   const invalidate=()=>{rectValid=false;dirty=true}
   const instance={measure:premeasure,invalidate,frame:(t:number,dt:number)=>{if(!el.isConnected)return false;if(resize){resize=false;b.lob=null;dirty=true;lastD='';measure()}if(!b.w||!b.h||!b.R.width||!b.R.height)return false;const out=stepBody(b,pointer,dt,(staticBody?0:t/1000),cfg,staticBody,!dirty&&!colors.length&&tierName!=='spinner');if(out.d!==lastD){path.setAttribute('d',out.d);lastD=out.d}if(cfg.echo){const m=cfg.echoScale,ox=cfg.echoOff*Math.cos(b.seed),oy=cfg.echoOff*Math.sin(b.seed);echo.setAttribute('d',path_Geometry(out.points.map(([x,y])=>[b.w/2+(x-b.w/2)*m+ox,b.h/2+(y-b.h/2)*m+oy]),!!b.base.poly));echo.style.display=''}else echo.style.display='none';if(cfg.dots){while(dots.childElementCount>cfg.dots)dots.lastElementChild?.remove();while(dots.childElementCount<cfg.dots)dots.append(svgNode('circle',{r:(2+((dots.childElementCount*7+b.seed)%3)).toFixed(1)}));for(let i=0;i<cfg.dots;i++){const j=Math.floor((i/cfg.dots)*b.base.length+b.seed*3)%b.base.length,q=b.base[j],dot=dots.children[i];dot.setAttribute('cx',(out.points[j][0]+q[2]*(8+i*3)).toFixed(2));dot.setAttribute('cy',(out.points[j][1]+q[3]*(8+i*3)).toFixed(2))}dots.style.display=''}else dots.style.display='none';overlays?.paint(out.points,b,cfg);if(colors.length&&!staticBody)path.setAttribute('fill',morphColor(colors,t/1000));if(tierName==='spinner')svg.style.transform=staticBody?'':`rotate(${((t/1000)*40)%360}deg)`;if(el.hasAttribute('data-stable-hit')){el.style.transform=old.transform;if(tierName!=='spinner')svg.style.transform=out.press>.004&&!staticBody?`scale(${1-out.press*.03},${1-out.press*.015})`:''}else if(out.press>.004&&!staticBody)el.style.transform=`scale(${1-out.press*.03},${1-out.press*.015})`;else el.style.transform=old.transform;const work=out.active||dirty||(!staticBody&&(colors.length>0||tierName==='spinner'||!!(tier.depth&&tier.lobes&&cfg.drift&&(b.near||b.inside))));dirty=false;return work},rewind:()=>{rewindBody(b);rectValid=false;rAt=0;dirty=true;lastD=''},reseed:()=>{b.seed=bodySeed(el)},refresh:()=>{repaint();dirty=true;wake()}}
   const bodyAC=new AbortController(),bo={signal:bodyAC.signal}
   const press=()=>{if(!cfg.press||el.matches(':disabled,[aria-disabled="true"]'))return;b.press.to=1;b.press.k=260;wake()}
   const release=()=>{if(b.press.to){b.press.to=0;b.ripple=1;wake()}}
   el.addEventListener('focusin',()=>{b.focus=true;repaint();wake()},bo);el.addEventListener('focusout',()=>{b.focus=false;release();repaint();wake()},bo)
   el.addEventListener('pointerenter',()=>{el.setAttribute('data-hover','');repaint();wake()},bo);el.addEventListener('pointerleave',()=>{el.removeAttribute('data-hover');repaint();wake()},bo)
   el.addEventListener('pointerdown',press,bo);el.addEventListener('pointercancel',release,bo);document.addEventListener('pointerup',release,bo)
   el.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')press()},bo);el.addEventListener('keyup',release,bo)
   const ro=new ResizeObserver(entries=>{for(const entry of entries){const R=entry.contentRect;if(Math.abs(Math.round(R.width)-b.w)<1&&Math.abs(Math.round(R.height)-b.h)<1)continue;invalidate();wake()}});ro.observe(el)
   retuneProfile=()=>{
    const nextSettings=getMotionSettings(),nextProfile=getMorphProfile()
    if(nextSettings.mode!==settings.mode||nextSettings.cats[category]!==settings.cats[category]){attach();signature=visualSignature();return}
    const nextTier=resolveMorphTier(el,tierName,nextProfile);if(!nextTier)return
    const nextCfg={...nextProfile.cfg};if(staticBody)for(const key of ['rest','reach','merge','hold','jiggleOn','press'] as const)nextCfg[key]=false
    if(JSON.stringify(cfg)===JSON.stringify(nextCfg)&&JSON.stringify(tier)===JSON.stringify(nextTier))return
    const resize=cfg.quality!==nextCfg.quality||cfg.echo!==nextCfg.echo||cfg.echoOff!==nextCfg.echoOff||cfg.echoScale!==nextCfg.echoScale||cfg.dots!==nextCfg.dots||tier.reach!==nextTier.reach||tier.press!==nextTier.press||tier.depth!==nextTier.depth
    Object.assign(cfg,nextCfg);Object.assign(tier,nextTier)
    if(resize)b.w=b.h=0
    dirty=true;const time=clock??performance.now();instance.measure(time);instance.frame(time,0);wake()
   }
   repaint();instances.add(instance);const time=clock??performance.now();instance.measure(time);instance.frame(time,0);wake()
   destroyBody=()=>{instances.delete(instance);bodyAC.abort();ro.disconnect();overlays?.dispose();svg.remove();el.classList.remove('v-morph-host','v-morph-live');if(relative)el.classList.remove('v-morph-rel');el.removeAttribute('data-hover');if(!explicit&&el.dataset.morph===mode)delete el.dataset.morph;if(!explicit)delete el.dataset.autoMorph;for(const [key,value]of [['--mfill',old.fill],['--mstroke',old.stroke],['--mpad',old.pad]]){if(value)el.style.setProperty(key,value);else el.style.removeProperty(key)}el.style.transform=old.transform;if(!instances.size)stop()}
  }
  attach()
  signature=visualSignature()
  const sync=()=>{if(visualSignature()!==signature){attach();signature=visualSignature()}else repairBody()}
  syncHost.current=sync
  const children=new MutationObserver(()=>{repairBody()});children.observe(el,{childList:true})
  let inputs=morphInputs()
  const unsubscribe=subscribeMotion(()=>{const next=morphInputs();if(next===inputs)return;inputs=next;retuneProfile();signature=visualSignature()})
  const unregister=registerMorphHost(el,{refresh:()=>{attach();signature=visualSignature()},disable:()=>{destroyBody();automaticRadius=undefined;destroyBody=()=>{};repairBody=()=>{}}})
  const attributes=new MutationObserver(()=>{if(visualSignature()!==signature){attach();signature=visualSignature()}})
  attributes.observe(el,{attributes:true,attributeFilter:['class','style','data-morph','data-tier','data-motion','data-reach','data-inside','data-amp','data-lobes','data-depth','data-asym','data-spread','data-r','data-shape','data-sw','data-dash','data-colors','aria-selected','aria-current','aria-pressed','aria-checked','aria-expanded','disabled','aria-disabled','aria-busy','data-state','data-highlighted']})
  const ancestors=new MutationObserver(records=>{if(records.some(record=>record.attributeName==='data-motion'||record.attributeName==='hidden')||visualSignature()!==signature){attach();signature=visualSignature()}})
  // Root style changes use the shared environment observer, which filters out
  // flow-only writes before any host reads its visual signature.
  for(let parent=el.parentElement;parent;parent=parent.parentElement)ancestors.observe(parent,{attributes:true,attributeFilter:parent===el.ownerDocument.documentElement?['data-motion','hidden','class']:['data-motion','hidden','style','class']})
  mq.addEventListener('change',attach,opts)
  const releaseEnvironment=acquireEnvironment(sync)
  return ()=>{syncHost.current=()=>{};children.disconnect();attributes.disconnect();ancestors.disconnect();unregister();unsubscribe();destroyBody();automaticRadius=undefined;ac.abort();releaseEnvironment()}
 },[host,category])
 React.useLayoutEffect(()=>{syncHost.current()})
 return ref
}

// ---- registry/cojeev/lib/control-appearance.ts (inlined) ----
type ControlRadius = "square" | "soft" | "round" | "pill";
/** Omission inherits the nearest owner's corners; no preference state is created. */
function controlRadiusStyle(radius?: ControlRadius): CSSProperties | undefined {
  if (!radius) return undefined;
  return { "--v-control-radius": { square: "0px", soft: "8px", round: "20px", pill: "999px" }[radius] } as CSSProperties;
}

// ---- registry/cojeev/ui/button.tsx (inlined) ----
const buttonVariants = cva(
  "v-btn [display:inline-flex] items-center justify-center gap-[var(--s-2)] h-[var(--ctl-md)] px-[var(--s-5)] py-0 rounded-[var(--r-pill)] text-[length:var(--fs-control)] font-[number:var(--fw-control)] leading-none whitespace-nowrap bg-[var(--v-ink)] text-[color:var(--v-on-ink)] motion-safe:active:[transform:translateY(1px)]",
  {
    variants: {
      variant: {
        default: "",
        accent:
          "-accent bg-[var(--v-pink)] text-[color:var(--v-on-accent)] hover:bg-[var(--v-pink-deep)]",
        secondary:
          "-secondary bg-[var(--v-blue)] text-[color:var(--v-on-accent)]",
        ghost:
          "-ghost bg-transparent text-[color:var(--v-text)] hover:bg-[var(--v-beige)]",
        outline:
          "-outline bg-transparent text-[color:var(--v-text)] [box-shadow:inset_0_0_0_1px_var(--v-edge)] hover:bg-[var(--v-beige-2)]",
        danger:
          "-danger bg-[var(--v-danger-fill)] text-[color:#fff]",
        block: "-block w-full",
      },
      size: {
        default: "",
        sm: "-sm h-[var(--ctl-sm)] px-[var(--s-4)] text-[length:var(--fs-small)]",
        lg: "-lg h-[var(--ctl-lg)] px-[var(--s-6)] text-[length:var(--fs-body)]",
      },
      shape: { pill: "", card: "-card" },
      fullWidth: { true: "-block w-full", false: "" },
    },
    defaultVariants: { variant: "default", size: "default", shape: "pill", fullWidth: false },
  },
);
type ButtonProps = Omit<React.ComponentProps<"button">, "ref"> &
  VariantProps<typeof buttonVariants> & {
    /** Use one native element (for example a link) as the interactive root. */
    asChild?: boolean;
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
    loading?: boolean;
    loadingIndicator?: React.ReactNode;
    radius?: ControlRadius;
  };
function Button({
  ref: externalRef,
  className,
  variant,
  size,
  shape,
  radius, style,
  fullWidth,
  loading,
  loadingIndicator,
  children,
  asChild = false,
  disabled,
  type = "button",
  "aria-busy": ariaBusy,
  "aria-disabled": ariaDisabled,
  onClick,
  onClickCapture,
  onAuxClickCapture,
  ...props
}: ButtonProps) {
  const morphRef = useMorph<HTMLButtonElement | HTMLAnchorElement>("buttons", externalRef);
  const pressRef = useFlowPress(morphRef);
  const busy = loading ?? (ariaBusy === true || ariaBusy === "true");
  const blocked = disabled || busy || ariaDisabled === true || ariaDisabled === "true";
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={pressRef}
      data-slot="button"
      data-part="root"
      data-r={shape === "card" ? 12 : undefined}
      data-control-shape={shape ?? undefined}
      style={{ ...style, ...controlRadiusStyle(radius) }}
      data-state={disabled ? "disabled" : busy ? "busy" : "rest"}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : disabled}
      aria-busy={busy || undefined}
      aria-disabled={blocked || undefined}
      onClickCapture={(event) => {
        // Stop a slotted link before its own router/click handler can activate.
        if (asChild && blocked) { event.preventDefault(); event.stopPropagation(); return; }
        onClickCapture?.(event);
      }}
      onAuxClickCapture={(event) => {
        if (asChild && blocked) { event.preventDefault(); event.stopPropagation(); return; }
        onAuxClickCapture?.(event);
      }}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        buttonVariants({ variant, size, shape, fullWidth }),
        "leading-none",
        className,
      )}
      {...props}
      tabIndex={asChild && disabled ? -1 : props.tabIndex}
    >
      <MotionPresence>
        {busy && (
          <MotionSurface key="loading" asChild preset="scale">
            <span
              data-slot="button-loading"
              className="v-btn__loading"
              aria-hidden="true"
            >
              {loadingIndicator ?? <ButtonIndicator />}
            </span>
          </MotionSurface>
        )}
      </MotionPresence>
      {asChild ? <Slottable>{children}</Slottable> : children}
    </Comp>
  );
}
function ButtonIndicator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <Spinner
      data-slot="button-indicator"
      data-part="indicator"
      data-label=""
      aria-hidden="true"
      className={className}
      {...props}
    />
  );
}

// ---- registry/cojeev/ui/hero-button.tsx ----
export const heroButtonAppearances = [
  "liquid",
  "split-arrow",
  "paper-fold",
  "pressed-key",
  "ribbon",
  "ticket",
  "seal",
  "ink-sweep",
  "orbit",
  "sliding-window",
  "stacked-paper",
  "spotlight",
] as const;
export type HeroButtonAppearance = (typeof heroButtonAppearances)[number];
export type HeroButtonProps = Omit<ButtonProps, "shape"> & {
  /** Organic keeps a restrained living contour; capsule has a regular resting rim. */
  shape?: "organic" | "capsule";
  showArrow?: boolean;
  /** An authored composition, independent of the existing surface variant and size. */
  appearance?: HeroButtonAppearance;
};
const arrowHead = "M24 7C26 9 29 12 32 14C29 16 26 19 24 21";
const arrowCoil = "M14 12C3 1 3 25 14 23C25 21 21 4 14 12";
const arrowOpening = "M19 7C24 7 28 10 32 14C29 18 24 21 19 21";
const arrowStem = "M7 14C15 14 24 14 32 14";
const stemCoil = "M7 14C7 14 8 14 9 14";
/** A native Button or slotted link, with one shared morph body and a drawing arrow. */
function HeroButtonImpl({
  shape = "organic",
  appearance = "liquid",
  showArrow = true,
  size = "lg",
  variant = "default",
  asChild = false,
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onPointerMove,
  ...props
}: HeroButtonProps) {
  const { quiet } = useChoreography();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const blocked =
    props.disabled ||
    props.loading ||
    props["aria-busy"] === true ||
    props["aria-busy"] === "true" ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  const active = !blocked && (hovered || focused);
  const moving = active && !quiet;
  const arrowTransition = {
    type: "tween" as const,
    duration: quiet ? 0 : moving ? 0.62 : motionTokens.duration.quick,
    ease: motionTokens.ease.enter,
    times: moving ? [0, 0.3, 0.66, 1] : undefined,
  };
  const content = (label: React.ReactNode) => (
    <>
      <span className="v-hero-button__paint" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {appearance === "ticket" && (
        <span className="v-hero-button__edition" aria-hidden="true">
          ADMIT
          <br />
          01
        </span>
      )}
      <span className="v-hero-button__window">
        <span data-slot="hero-button-label" className="v-hero-button__label">
          {label}
        </span>
        {appearance === "sliding-window" && (
          <span className="v-hero-button__echo" aria-hidden="true">
            {label}
          </span>
        )}
      </span>
      {showArrow && (
        <span className="v-hero-button__arrow" aria-hidden="true">
          <svg
            data-slot="hero-button-arrow"
            viewBox="0 0 40 28"
            width="40"
            height="28"
            fill="none"
            focusable="false"
          >
            <motion.path
              data-slot="hero-button-stem"
              d={arrowStem}
              initial={false}
              animate={{
                d: moving
                  ? [arrowStem, stemCoil, arrowStem, arrowStem]
                  : arrowStem,
                pathLength: moving ? [1, 0.05, 0.8, 1] : 1,
              }}
              transition={arrowTransition}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <motion.path
              data-slot="hero-button-head"
              d={arrowHead}
              initial={false}
              animate={{
                d: moving
                  ? [arrowHead, arrowCoil, arrowOpening, arrowHead]
                  : arrowHead,
              }}
              transition={arrowTransition}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </>
  );
  const child = asChild
    ? (React.Children.only(children) as React.ReactElement<{
        children?: React.ReactNode;
      }>)
    : null;
  return (
    <Button
      {...props}
      asChild={asChild}
      size={size}
      variant={variant === "default" || variant === "block" ? "ghost" : variant}
      fullWidth={props.fullWidth || variant === "block"}
      data-slot="hero-button"
      data-hero-variant={variant}
      data-hero-size={size}
      data-hero-shape={shape}
      data-hero-appearance={appearance}
      data-motion-quiet={quiet}
      data-arrow-active={active}
      data-morph="both"
      data-tier={
        [
          "paper-fold",
          "pressed-key",
          "ribbon",
          "ticket",
          "stacked-paper",
        ].includes(appearance)
          ? "card"
          : "pill"
      }
      data-r={
        [
          "paper-fold",
          "pressed-key",
          "ribbon",
          "ticket",
          "stacked-paper",
        ].includes(appearance)
          ? 12
          : undefined
      }
      data-lobes={appearance === "seal" ? 12 : shape === "organic" ? 3 : 0}
      data-depth={
        appearance === "seal" ? 0.06 : shape === "organic" ? 0.024 : 0
      }
      data-asym=".12"
      data-sw="1"
      className={cn("v-hero-button", className)}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (!event.defaultPrevented && event.pointerType !== "touch")
          setHovered(true);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(false);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (
          event.defaultPrevented ||
          appearance !== "spotlight" ||
          quiet ||
          blocked
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--hero-pointer-x",
          `${event.clientX - rect.left}px`,
        );
        event.currentTarget.style.setProperty(
          "--hero-pointer-y",
          `${event.clientY - rect.top}px`,
        );
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented)
          setFocused(event.currentTarget.matches(":focus-visible"));
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setFocused(false);
      }}
    >
      {child
        ? React.cloneElement(child, undefined, content(child.props.children))
        : content(children)}
    </Button>
  );
}
export function HeroButton(props: Parameters<typeof HeroButtonImpl>[0]) {
  return (
    <>
      <CojeevStyles />
      {HeroButtonImpl(props)}
    </>
  );
}

// ---- Styles (React 19 hoists this <style> into <head> and renders it once per page) ----
const COJEEV_CSS = `/* Hero button — styles for 000h by Cojeev (MIT). Plain CSS with native cascade layers; no Tailwind theme or config needed.
   Dark mode: put the \`dark\` class on <html> or an ancestor (shadcn convention); \`[data-mode="dark"]\` works too.
   Fonts: not bundled here; --font-text/--font-display come from the host app (see globals.css). */
@layer theme, base, components, utilities, cojeev-states, cojeev-flow, cojeev-morph, cojeev-accessibility;

/* ---- Tokens: :root is light; [data-mode="dark"] and the shadcn .dark class are dark ---- */
/* Cojeev tokens: one definition per mode. The runtime palettes in lib/appearance-tokens.ts ("paper" is
   this default) re-point these at runtime. Contrast notes below are measured against these values. */
:root{
color-scheme:light;
/* accents [E] I03 */
--v-pink:#F0A4CC;--v-olive:#A8BC75;--v-blue:#95BAE8;--v-yellow:#F1D369;
/* surfaces [M] */
--v-canvas:#F8F6F1;--v-paper:#FFFFFF;/* @kind color */--v-beige:#EEE9E1;--v-beige-2:#f3efe8;--v-cream-pill:#FFFFFF;
--v-ink:#26282d;--v-structure:#14171B;--on-structure:#F9FAFC;--structure-quiet:#242931;--structure-line:#565D68;--structure-text:#E2E6ED;--v-ink-soft:#464951;--v-on-ink:#F8F6F1;
/* text [M] */
--v-text:#26282d;--v-text-2:#464951;--v-text-3:#52565e;--v-skel-face:#EEE9E1;--v-skel-sheen:#FFFFFF;--v-skel-edge:#b4b0ab;--v-disabled-ink:#52565e;--v-disabled-face:#EEE9E1;--v-disabled-edge:#706e6d;/* text-3 6.8:1 on canvas, 6.1:1 on beige — informational grey clears AA on both real surfaces */
/* semantic hues */
--v-danger:#D7473C;/* [M] I07 I16 — FILL only: dots, borders, destructive button (white on it passes) */
--v-danger-ink:#b2433b;--v-danger-fill:#B92D28;/* white text on it = 6.1:1 */--v-olive-ink:#525d3d;/* 6.5:1 on canvas */--v-accent-ink:#704f63;/* weekend / accent ink, 5.8:1 on beige *//* danger ink is text-only: 4.7:1 on --v-danger-soft, 4.6:1 on --v-beige */
--v-brand:#845c73;/* Cojeev mulberry — focus ring only (decision); 5.2:1 on canvas */
--v-border:#b4b0ab;/* hairlines between static surfaces only — 1.8:1 on beige, 2.0:1 on canvas; never a control edge */
--v-edge:#706e6d;/* control edge: 4.2:1 on beige, 4.7:1 on canvas — above the 3:1 floor for interactive boundaries */
--switch-knob:#FFFFFF;--switch-knob-on:#14171B;
/* ---- semantic roles: surfaces, selection, status, data ----
   Deliberate tinted regions so a page is not uniformly beige. Each is a light wash of an identity hue,
   keeping ink text at ≥ 4.5:1 (measured: quiet 14.8, work 13.6, automation 14.0, memory 13.5,
   library 13.6, ai 13.6, alert 13.2). */
--surface-quiet:#FFFFFF;--surface-work:#f1f6fc;--surface-automation:#fdf9ec;--surface-memory:#f4f6ed;
--surface-library:#fdf3f8;--surface-ai:#f1f6fc;--surface-alert:#fcf0ee;
--sel-bg:#fbe9f3;--sel-edge:#a87491;--sel-ink:#26282d;
--status-ok-bg:#f4f6ed;--status-ok-ink:#555f3f;--status-warn-bg:#fdf9ec;--status-warn-ink:#695d33;
--status-danger-bg:#fae7e6;--status-danger-ink:#96342d;--status-info-bg:#f1f6fc;--status-info-ink:#4b5d74;
--status-pending-bg:#e7e7e8;--status-pending-ink:#464951;
--v-scrim:rgba(19,24,32,.46);/* [I] I07 gave a beige veil; a cream dialog on a beige veil measured 1.04:1 and vanished. A warm-ink veil keeps the paper feel and lets the modal stand off the page. */
--v-disabled-fill:#EEE9E1;/* [M] I18 grey Join pill */
/* tonal watermarks [M] ≈ accent 88% + black */
--v-pink-deep:#d693b7;--v-olive-deep:#96a86a;--v-blue-deep:#86a6cf;--v-yellow-deep:#d6bc60;/* [M] I15 watermarks + hover: the SAME hue ~8–12 % darker, not a heavy mix */
/* soft tints for tag pills on beige [I] */
--v-pink-soft:#fbe9f3;
--v-olive-soft:#eaefde;
--v-blue-soft:#e6eef9;
--v-yellow-soft:#fcf4db;
--v-danger-soft:#fae7e6;
/* semantic roles (shadcn-style names) */--card-2:var(--v-beige-2);
/* categories (decision) */
--cat-work:var(--v-blue);--cat-automations:var(--v-yellow);--cat-memory:var(--v-olive);--cat-library:var(--v-pink);--cat-ai-apps:var(--v-blue);--cat-free-models:var(--v-olive);--cat-settings:var(--v-beige);--cat-needs-you:var(--v-pink);--cat-runs:var(--v-yellow);
/* status words — always paired with text/icon */
--status-ok:var(--v-olive);--status-warn:var(--v-yellow);--status-danger:var(--v-danger);--status-info:var(--v-blue);--status-pending:var(--v-ink-soft);--status-off:var(--v-text-3);
--v-font-mono:ui-monospace,"SF Mono",Menlo,monospace;/* terminal only */
/* type scale — every font-size in the library is one of these steps; nothing sits between them.
   hero and display are headlines, section and title head blocks, lead opens a passage, reading is long-form
   copy, body is interface copy, control labels controls, small is helper text under a label, meta is
   secondary data, caps is the smallest step and the floor for any text. */
--fs-hero:72px;--fs-display:44px;--fs-section:26px;--fs-title:21px;--fs-lead:17px;--fs-reading:16px;--fs-body:15px;--fs-control:14px;--fs-small:13px;--fs-meta:12px;--fs-caps:11px;
--lh-hero:.95;/* @kind other */
--lh-display:1.05;/* @kind other */
--lh-title:1.2;/* @kind other */
--lh-body:1.45;/* @kind other */
--lh-control:1.2;/* @kind other */
/* weights — four steps only; the variable faces can do more, the system does not */
--fw-regular:400;/* @kind other */
--fw-medium:500;/* @kind other */
--fw-semibold:600;/* @kind other */
--fw-bold:700;/* @kind other */
--fw-display:var(--fw-medium);/* @kind other */
--fw-title:var(--fw-semibold);/* @kind other */
--fw-body:var(--fw-regular);/* @kind other */
--fw-control:var(--fw-medium);/* @kind other */
--fw-value:var(--fw-bold);/* @kind other */
--ls-display:-.015em;/* @kind other */
--ls-hero:-.03em;/* @kind other */
--ls-caps:.06em;/* @kind other */
/* space — the 4px grid. Padding, margin and gap use these steps; only 1-3px optical nudges stay raw. */
--s-1:4px;--s-2:8px;--s-3:12px;--s-4:16px;--s-5:20px;--s-6:24px;--s-7:28px;--s-8:32px;--s-10:40px;--s-12:48px;--s-16:64px;
/* layout [M] I15 → 1440 */
--shell-inset:28px;--sidebar-w:212px;--sidebar-w-mini:76px;--sidebar-gap:52px;--rail-w:360px;--rail-gap:40px;--topbar-h:44px;--content-max:1440px;
--card-pad:24px;--card-gap:16px;--row-pad:12px 16px;--item-h:64px;--content-offset:16px;--agenda-slot:80px;
/* radius — every corner is one of these steps */
--r-xs:4px;--r-sm:8px;--r-md:12px;--r-card-sm:16px;--r-card:20px;--r-panel:24px;--r-sheet:28px;--r-frame:40px;--r-pill:999px;
/* dimensions [M/O] */
--disk-sm:32px;
--disk-md:40px;
--disk-lg:48px;
--icon-sm:16px;
--icon-md:20px;
--icon-lg:24px;
--icon-stroke:1.6;/* @kind other */
--ctl-sm:32px;
--ctl-md:40px;
--ctl-lg:48px;
--ctl-xl:56px;
--utility:44px;
--utility-overlap:-4px;/* @kind other */
--dock-h:72px;--dock-action:56px;--dock-shoulder:24px;--assist-close:48px;--hex:24px;--edit-badge:36px;
--track-h:10px;--track-h-lg:14px;--track-h-sm:6px;--table-row:72px;--table-head:44px;--nav-row:40px;--date-col:44px;
--hit-min:44px;
/* borders [I] */
--bw-hair:1px;
--bw-featured:1.5px;
--bw-dash:1px dashed var(--v-text-2);/* @kind other */
/* elevation — app surfaces are flat; only floating layers get a shadow [I] */
--shadow-none:none;--shadow-float:0 12px 32px -12px rgba(17,17,17,.18);--shadow-lift:0 1px 0 rgba(17,17,17,.06);
/* z [I] */
--z-base:0;/* @kind other */
--z-sticky:10;/* @kind other */
--z-dock:20;/* @kind other */
--z-sheet:30;/* @kind other */
--z-assist:35;/* @kind other */
--z-dialog:40;/* @kind other */
--z-popover:45;/* @kind other */
--z-toast:50;/* @kind other */
--z-tooltip:60;/* @kind other */
/* motion [I] — decision: alive but unobtrusive */
--t-micro:120ms;/* @kind other */
--t-element:200ms;/* @kind other */
--t-max:300ms;/* @kind other */
--t-draw:600ms;/* @kind other */
--t-count:700ms;/* @kind other */
--breath:6s;/* @kind other */
--enter:cubic-bezier(.2,.8,.2,1);/* @kind other */
--exit:cubic-bezier(.4,0,1,1);/* @kind other */
/* ---- component parameters ----
   Per-instance knobs that components re-point on their own selectors (a hue for an accordion row, the fill a
   motion body paints, a skeleton's face). Registered here with their defaults so every declaration below is a
   known parameter, not an unregistered token. */
--pulse:34px;/* @kind spacing */
--pulse-c:var(--v-pink);/* @kind color */
--c:var(--v-beige);/* @kind color */
--hue:var(--v-pink);/* @kind color */
--hue-deep:var(--v-pink-deep);/* @kind color */
--hue-ink:var(--v-text);/* @kind color */
--wm-m:none;/* @kind other */
--wm:var(--v-beige-2);/* @kind color */
--skel:var(--v-skel-face);/* @kind color */
--sw:var(--v-pink);/* @kind color */
--dot:var(--v-border);/* @kind color */
--disk-bg:var(--v-beige);/* @kind color */
--mfill:transparent;/* @kind color */
--mstroke:transparent;/* @kind color */
--glide-bg:#14171B;/* @kind color */ /* the travelling lozenge is dark in BOTH themes so its cream label always reads */
--glide-fg:#F9FAFC;/* @kind color */
--v-on-accent:#14171B;/* @kind color */ /* ink on pink / yellow / olive / blue, both modes */
/* ---- fixed inks [I] — values that the component sheets painted as raw hex and that do NOT follow the mode switch (the visual is unchanged by tokenising them) ---- */
--ink-fixed:#111111;/* @kind color */ /* structure fills / borders that stay ink in dark mode */
--cream-fixed:#F6EFE2;/* @kind color */ /* cream label on the ink rail, both modes */
--mask-ink:#000000;/* @kind color */ /* opaque paint inside mask-image gradients — only its alpha matters */
--unavail-ink:#52565e;/* @kind color */ /* "unavailable" and disabled date-strip ink */
--alert-ink:#464951;/* @kind color */ /* alert body text and kicker */
--btn-disabled-ink:#52565e;/* @kind color */ /* disabled button label */
--nav-group-ink:#52565e;/* @kind color */ /* catalog rail group label */
--muted-foreground-ink:#2E2A24;/* @kind color */ /* muted text on ink-adjacent surfaces (notch, feature media, selected item) */
--muted-foreground-tinted:#4A443C;/* @kind color */ /* muted text on soft tints and cream cards */
/* ---- legacy kit values [I] — referenced only by legacy-aliases.css for consumers still on the retired names ---- */
--danger-deep:#E9A79F;/* @kind color */ /* the danger alert's deep tint */
--legacy-on-brand:#FDF6F9;/* @kind color */--legacy-accent-5:#E29A6A;/* @kind color */--legacy-success:#5C8C34;/* @kind color */--legacy-warning:#B9831C;/* @kind color */--legacy-info:#3F79B4;/* @kind color */--legacy-danger-fill:#A8402A;/* @kind color */--legacy-success-fill:#3F6B22;/* @kind color */
--rail-sel:rgba(251,244,230,.1);/* @kind color */
--rail-hover:rgba(251,244,230,.055);/* @kind color */
/* ---- the travelling selection: per-character timing [I] — the per-character timing IS the feature; js/flow.js reads these too ---- */
--t-flow-glide:.24s;/* @kind other */--t-flow-glide-h:.24s;/* @kind other */--t-flow-glide-land:.36s;/* @kind other */
--t-flow-stretch:.3s;/* @kind other */--t-flow-stretch-p1:.16s;/* @kind other */
--t-flow-jelly:.5s;/* @kind other */--t-flow-jelly-h:.44s;/* @kind other */--t-flow-jelly-hover:.3s;/* @kind other */--t-flow-jelly-land:.52s;/* @kind other */
--t-flow-comet:.34s;/* @kind other */--t-flow-comet-h:.3s;/* @kind other */--t-flow-comet-trail:.72s;/* @kind other */--t-flow-comet-trail-h:.6s;/* @kind other */
--t-flow-drop:.3s;/* @kind other */--t-flow-drop-gather:.14s;/* @kind other */--t-flow-drop-shoot:.18s;/* @kind other */--t-flow-drop-land:.3s;/* @kind other */
--t-flow-rubber:.36s;/* @kind other */--t-flow-rubber-lead:.2s;/* @kind other */
--t-flow-pebble:.46s;/* @kind other */--t-flow-pebble-h:.4s;/* @kind other */--t-flow-pebble-land:.5s;/* @kind other */
--t-flow-ripple:.36s;/* @kind other */--t-flow-ripple-h:.3s;/* @kind other */--t-flow-ripple-ring:.6s;/* @kind other */--t-flow-ripple-delay:.18s;/* @kind other */
--t-flow-halo:.4s;/* @kind other */--t-flow-halo-h:.34s;/* @kind other */--t-flow-halo-glow:.7s;/* @kind other */
--t-flow-hover:.22s;/* @kind other */--t-flow-radius:.3s;/* @kind other */--t-flow-radius-sm:.2s;/* @kind other */--t-flow-fade:.18s;/* @kind other */--t-flow-fade-sm:.16s;/* @kind other */
--t-flow-label:.2s;/* @kind other */--t-flow-label-delay:.1s;/* @kind other */--t-flow-still:60ms;/* @kind other */--t-flow-land-hold:900ms;/* @kind other */
--t-skel:1.4s;/* @kind other */--t-skel-sheen:2.4s;/* @kind other */--t-pulse:2.1s;/* @kind other */
--e-flow-glide:cubic-bezier(.2,.8,.2,1);/* @kind other */--e-flow-stretch:cubic-bezier(.3,1.15,.4,1);/* @kind other */--e-flow-stretch-p1:cubic-bezier(.4,0,.2,1);/* @kind other */
--e-flow-jelly:cubic-bezier(.3,1.3,.45,1);/* @kind other */--e-flow-jelly-hover:cubic-bezier(.3,1.25,.45,1);/* @kind other */--e-flow-comet:cubic-bezier(.2,.8,.2,1);/* @kind other */--e-flow-comet-trail:cubic-bezier(.2,.7,.15,1);/* @kind other */
--e-flow-drop:cubic-bezier(.3,1.25,.4,1);/* @kind other */--e-flow-drop-gather:cubic-bezier(.4,0,.6,1);/* @kind other */--e-flow-drop-shoot:cubic-bezier(.3,0,.2,1);/* @kind other */
--e-flow-rubber:cubic-bezier(.3,1.3,.4,1);/* @kind other */--e-flow-rubber-lead:cubic-bezier(.2,.9,.3,1);/* @kind other */--e-flow-pebble:cubic-bezier(.32,1.25,.42,1);/* @kind other */
--e-flow-ripple:cubic-bezier(.2,.8,.2,1);/* @kind other */--e-flow-halo:cubic-bezier(.3,1.2,.4,1);/* @kind other */--e-flow-settle:cubic-bezier(.2,.7,.2,1);/* @kind other */
/* ---- ui.js timings [I] ---- */
--t-tooltip:220ms;/* @kind other */--t-hovercard:300ms;/* @kind other */--t-toast:5000ms;/* @kind other */--t-focus-settle:120ms;/* @kind other */
}
/* dark */
:root[data-mode="dark"], .dark{
color-scheme:dark;
/* surfaces */
--v-canvas:#15171A;--v-paper:#20242A;--v-beige:#292F37;--v-beige-2:#20242a;--v-cream-pill:#20242A;
/* ink and text */
--v-ink:#f3f4f4;--v-ink-soft:#bdc1c5;--v-on-ink:#15171A;--v-on-accent:#14171B;--v-text:#f3f4f4;--v-text-2:#bdc1c5;--v-text-3:#a9aeb4;--alert-ink:#bdc1c5;--nav-group-ink:#a9aeb4;--unavail-ink:#a9aeb4;--btn-disabled-ink:#a9aeb4;
/* edges */
--v-border:#4e5359;--v-edge:#8c9094;--v-brand:#F0A4CC;--v-scrim:rgba(0,0,0,.66);
/* accents */
--v-pink:#F0A4CC;--v-pink-deep:#d693b7;--v-pink-soft:#3f3742;--v-olive:#A8BC75;--v-olive-deep:#96a86a;--v-olive-soft:#343b35;--v-olive-ink:#A8BC75;--v-blue:#95BAE8;--v-blue-deep:#86a6cf;--v-blue-soft:#323b47;--v-yellow:#F1D369;--v-yellow-deep:#d6bc60;--v-yellow-soft:#3f3e33;--v-accent-ink:#F0A4CC;
/* danger */
--v-danger:#D7473C;--v-danger-fill:#B92D28;--v-danger-ink:#e3786f;--v-danger-soft:#36282c;
/* structure */
--v-structure:#14171B;--on-structure:#F9FAFC;--structure-quiet:#242931;--structure-line:#565D68;--structure-text:#E2E6ED;--glide-bg:#14171B;--glide-fg:#F9FAFC;
/* states */
--v-skel-face:#292F37;--v-skel-sheen:#20242A;--v-skel-edge:#4e5359;--v-disabled-ink:#a9aeb4;--v-disabled-face:#292F37;--v-disabled-edge:#8c9094;--v-disabled-fill:#292F37;--switch-knob:#20242A;--switch-knob-on:#14171B;--sel-bg:#433a46;--sel-edge:#F0A4CC;--sel-ink:#f3f4f4;
/* semantic surfaces: identity hues over the dark canvas, so a tinted region keeps its meaning and its text contrast */
--surface-quiet:#20242A;--surface-work:#2e3641;--surface-automation:#393932;--surface-memory:#303633;--surface-library:#39333d;--surface-ai:#2e3641;--surface-alert:#383034;
/* status */
--status-ok-bg:#303633;--status-ok-ink:#adc07c;--status-warn-bg:#393932;--status-warn-ink:#F1D369;--status-danger-bg:#36282c;--status-danger-ink:#e99891;--status-info-bg:#2e3641;--status-info-ink:#97bce9;--status-pending-bg:#33373d;--status-pending-ink:#bdc1c5;
/* elevation */
--shadow-float:0 12px 32px -12px rgba(0,0,0,.6);
}
@media (prefers-reduced-motion:reduce){:root{
--t-micro:0ms;/* @kind other */
--t-element:0ms;/* @kind other */
--t-max:0ms;/* @kind other */
--t-draw:0ms;/* @kind other */
--t-count:0ms;/* @kind other */
}}

/* ---- Reset and shared rules (scoped to [data-slot] so the host page is untouched) ---- */
/* Reset follows the reference. Component rules live in layers so accessibility
   overrides can come last without an importance flag. */
@layer base {
  :where([data-slot]) *,
  :where([data-slot]),
  :where([data-slot]) *::before,
  :where([data-slot])::before,
  :where([data-slot]) *::after,
  :where([data-slot])::after { box-sizing:border-box; border-width:0; border-style:none; }
  :where([data-slot]:not([data-slot] [data-slot], [data-slot="shape"], [data-slot="shape-morph"], [data-slot="icon"], [data-slot="animated-icon"], [data-slot="state-chevron"])) { color:var(--v-text); font-family:var(--font-text); font-size:var(--fs-body); line-height:var(--lh-body); font-weight:var(--fw-body); -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
  :where([data-slot]) h1,
  h1:where([data-slot]),
  :where([data-slot]) h2,
  h2:where([data-slot]),
  :where([data-slot]) h3,
  h3:where([data-slot]),
  :where([data-slot]) h4,
  h4:where([data-slot]),
  :where([data-slot]) p,
  p:where([data-slot]),
  :where([data-slot]) figure,
  figure:where([data-slot]),
  :where([data-slot]) ul,
  ul:where([data-slot]),
  :where([data-slot]) ol,
  ol:where([data-slot]) { margin:0; }
  /* Headings balance their lines so a short last word never sits alone; long copy avoids orphans. */
  :where([data-slot]) h1,
  h1:where([data-slot]),
  :where([data-slot]) h2,
  h2:where([data-slot]),
  :where([data-slot]) h3,
  h3:where([data-slot]),
  :where([data-slot]) h4,
  h4:where([data-slot]) { text-wrap:balance; }
  :where([data-slot]) p,
  p:where([data-slot]) { text-wrap:pretty; }
  :where([data-slot]) button,
  button:where([data-slot]),
  :where([data-slot]) input,
  input:where([data-slot]),
  :where([data-slot]) select,
  select:where([data-slot]),
  :where([data-slot]) textarea,
  textarea:where([data-slot]) { font:inherit; color:inherit; }
  :where([data-slot]) code,
  code:where([data-slot]),
  :where([data-slot]) pre,
  pre:where([data-slot]),
  :where([data-slot]) samp,
  samp:where([data-slot]) { font-family:monospace; }
  :where([data-slot]) button,
  button:where([data-slot]) { background:none; border:0; padding:0; cursor:pointer; }
  :where([data-slot]) :where(a[href],area[href],summary,label[for],label:has(input),select,input:is([type="checkbox"],[type="radio"],[type="range"],[type="button"],[type="submit"],[type="reset"],[type="file"]),[role="button"],[role="checkbox"],[role="radio"],[role="switch"],[role="tab"],[role="option"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]),
  :where(a[href],area[href],summary,label[for],label:has(input),select,input:is([type="checkbox"],[type="radio"],[type="range"],[type="button"],[type="submit"],[type="reset"],[type="file"]),[role="button"],[role="checkbox"],[role="radio"],[role="switch"],[role="tab"],[role="option"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]):where([data-slot]) { cursor:pointer; }
  /* Hit-test the control, not changing decorative SVG paths. Icon feedback
     already listens to the owning control. Standalone interactive art is intact. */
  :where(button,a[href],summary,[role="button"],[role="tab"],[role^="menuitem"],[role="option"],[role="checkbox"],[role="radio"],[role="switch"])
    :where([data-slot="icon"][aria-hidden="true"],[data-slot="animated-icon"]:has([data-slot="icon"][aria-hidden="true"]),[data-slot="shape"][aria-hidden="true"],[data-slot="state-chevron"][aria-hidden="true"]) { pointer-events:none; }
  /* Preserve the original browser touch feedback on library elements. */
  :where([data-slot]) { -webkit-tap-highlight-color:initial; }
  :where([data-slot]) img,
  img:where([data-slot]),
  :where([data-slot]) svg,
  svg:where([data-slot]) { display:block; max-width:100%; }
  :where([data-slot]) a,
  a:where([data-slot]) { color:var(--v-text); text-underline-offset:2px; }
  /* The reference preserves native link decoration; Tailwind preflight resets it. */
  :where([data-slot]) a:any-link,
  a:any-link:where([data-slot]) { text-decoration-line:underline; }
  :where([data-slot]) a:hover,
  a:hover:where([data-slot]) { color:var(--v-text-2); }
  :where([data-slot]) :focus-visible,
  :focus-visible:where([data-slot]) { outline:2px solid var(--v-brand); outline-offset:2px; border-radius:var(--r-sm); }
  :where([data-slot]) *::selection,
  :where([data-slot])::selection { background:var(--v-pink); color:var(--ink-fixed); }
}
/* Disabled controls remain hit-testable so their unavailable cursor is visible.
   Their native primitive or event guard still owns activation prevention. */
:where([data-slot]) :is(button,input,select,textarea,[role],[data-slot]):is(:disabled,[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])),
  :is(button,input,select,textarea,[role],[data-slot]):is(:disabled,[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])):where([data-slot]),
  :where([data-slot]) label:has(input:disabled),
  label:has(input:disabled):where([data-slot]) { cursor:not-allowed; }
:where([data-slot]) :is([aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),label:has(input:disabled)) :where(span,svg,path),
  :is([aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),label:has(input:disabled)) :where(span,svg,path):where([data-slot]) { cursor:inherit; }
@layer components {
  :where([data-slot]) .v-body-2,
  .v-body-2:where([data-slot]) { font-size:var(--fs-body); line-height:1.5; color:var(--v-text-2); }
  :where([data-slot]) .v-meta,
  .v-meta:where([data-slot]) { font-size:var(--fs-meta); line-height:1.3; color:var(--v-text-2); }
  :where([data-slot]) .v-id,
  .v-id:where([data-slot]) { font-variant-numeric:tabular-nums; letter-spacing:.02em; }
  :where([data-slot]) .v-icon,
  .v-icon:where([data-slot]) { width:var(--icon-md); height:var(--icon-md); flex:none; stroke-width:var(--icon-stroke); fill:none; }
}
@layer cojeev-accessibility {
  :where([data-slot]) [hidden]:not([hidden="until-found"]),
  [hidden]:not([hidden="until-found"]):where([data-slot]) { display:none; }
  :where([data-slot]) .v-sr,
  .v-sr:where([data-slot]) { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; inset-inline-start:0; inset-block-start:0; }
  @media (prefers-reduced-motion:reduce) {
    :where([data-slot]) *,
  :where([data-slot]),
  :where([data-slot]) *::before,
  :where([data-slot])::before,
  :where([data-slot]) *::after,
  :where([data-slot])::after { animation-duration:0s; animation-iteration-count:1; transition-duration:0s; scroll-behavior:auto; }
  }
}

/* ---- Press and flow motion rules ---- */
@layer cojeev-flow {
/* Shared flow paint and nine authored characters. Scoped to component-owned groups and registry roles. */
[data-flow-owned].v-glide {
  isolation: isolate;
}
:where([data-flow-owned].v-glide) {
  position: relative;
}
[data-flow-owned].v-glide > .v-glide__pill,
[data-flow-owned].v-glide > .v-glide__hover,
[data-flow-owned].v-glide > .v-glide__trail {
  position: absolute;
  left: 0;
  top: 0;
  z-index: var(--glide-layer-z, 0);
  pointer-events: none;
  border-radius: var(--glide-r, 999px);
  width: var(--glide-w, 0px);
  height: var(--glide-h, 0px);
  opacity: var(--glide-o, 0);
  transform: translate3d(var(--glide-x, 0px), var(--glide-y, 0px), 0);
  will-change: transform, width, height;
}
[data-flow-owned].v-glide > .v-glide__hover {
  width: var(--hov-w, 0px);
  height: var(--hov-h, 0px);
  border-radius: var(--hov-r, 999px);
  opacity: calc(var(--hov-o, 0) * var(--flow-hover, 1));
  transform: translate3d(var(--hov-x, 0px), var(--hov-y, 0px), 0);
}
[data-flow-owned].v-glide > .v-glide__pill > i,
[data-flow-owned].v-glide > .v-glide__hover > i,
[data-flow-owned].v-glide > .v-glide__trail > i {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  display: block;
}
[data-flow-owned].v-glide > * > i::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
}
:where(
  [data-flow-owned].v-glide
    > *:not([data-assembly-part]):not(.v-glide__pill):not(.v-glide__hover):not(
      .v-glide__trail
    )
),
:where(
  [data-slot="navigation-menu"][data-flow-owned].v-glide
    .v-nav__item[data-slot="navigation-menu-link"]
) {
  position: relative;
  z-index: 1;
}
[data-flow-owned].v-glide > .v-glide__hover {
  z-index: var(--glide-hover-z, 2);
}
[data-flow-owned].v-glide > .v-glide__trail {
  z-index: var(--glide-trail-z, -2);
  display: none;
}
[data-flow-owned].v-glide > .v-glide__pill > i,
[data-flow-owned].v-glide > .v-glide__trail > i {
  background: var(--glide-bg);
}
/* A group may hand the travelling surface an edge (--glide-ring) and its
   pointer preview a paint (--glide-hover-bg) from its own stylesheet. */
[data-flow-owned].v-glide > .v-glide__pill > i {
  box-shadow: var(--glide-ring, none);
}
[data-flow-owned].v-glide > .v-glide__trail > i {
  opacity: 0.3;
}
[data-flow-owned].v-glide > .v-glide__hover > i {
  background: var(
    --glide-hover-bg,
    color-mix(in oklab, var(--v-ink) 8%, transparent)
  );
}
[data-flow-owned].v-glide [data-glide-active] {
  background: transparent;
  box-shadow: none;
  color: var(--glide-fg);
}
[data-flow-owned].v-glide .v-nav__item[data-glide-active],
[data-flow-owned].v-glide .v-tab[data-glide-active] {
  color: var(--glide-fg);
}
[data-flow-owned].v-glide.-underline > .v-glide__pill > i,
[data-flow-owned].v-glide.-underline > .v-glide__trail > i {
  background: var(--v-pink);
}
[data-flow-owned].v-glide.-underline > .v-glide__hover {
  border-radius: var(--r-md);
}
[data-flow-owned].v-glide.-underline [data-glide-active] {
  color: var(--v-text);
}
/* Notebook and rail paint their travelling surface from tabs.css (paper sheet
   and soft index line); their selected label stays in reading ink. */
.v-tabs[data-flow-owned].v-glide:is(.-notebook, .-rail)
  .v-tab[data-glide-active] {
  color: var(--v-text);
}
.v-tabs[data-flow-owned].v-glide > .v-tab {
  transition: none;
}
/* Opt-in (the motion settings preview): the arriving label takes its
   selected ink as the surface lands, so it never reads dark on the bare track. */
@media (prefers-reduced-motion: no-preference) {
  .v-tabs[data-flow-owned][data-flow-label="land"].v-glide
    > .v-tab[aria-selected="true"] {
    transition: color var(--t-micro) ease var(--flow-dur);
  }
}
.v-nav[data-flow-owned].v-glide > .v-glide__pill > i,
.v-nav[data-flow-owned].v-glide > .v-glide__trail > i {
  background: var(--rail-sel);
}
.v-nav[data-flow-owned].v-glide > .v-glide__hover > i {
  background: var(--rail-hover);
}
.v-nav[data-flow-owned].v-glide > .v-glide__pill {
  border-radius: var(--r-md);
  background: rgba(251, 244, 230, 0.1);
}
.v-nav[data-flow-owned].v-glide .v-nav__item[data-glide-active] {
  color: var(--nav-active-ink, var(--v-pink));
}
.v-nav[data-flow-owned][data-appearance] .v-nav__item {
  transition: background-color var(--t-flow-hover) ease;
}
.v-seg[data-flow-owned].v-glide > .v-glide__pill {
  border-radius: var(--r-pill);
}
.v-seg.-pink[data-flow-owned].v-glide > .v-glide__pill > i,
.v-seg.-pink[data-flow-owned].v-glide > .v-glide__trail > i {
  background: var(--v-pink);
}
.v-seg.-pink[data-flow-owned].v-glide [data-glide-active] {
  color: var(--v-on-accent);
}
.v-seg[data-flow-owned].v-glide
  .v-btn:is([aria-pressed="true"], [aria-checked="true"]) {
  background: transparent;
}
:is(:root[data-mode="dark"], .dark) .v-seg[data-flow-owned].v-glide > .v-glide__pill > i,
:is(:root[data-mode="dark"], .dark) .v-pager[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-pink);
}
:is(:root[data-mode="dark"], .dark)
  .v-seg:where([data-slot], [data-slot] *)
  [data-glide-active], :is(:root[data-mode="dark"], .dark)
  .v-pager:where([data-slot], [data-slot] *)
  [data-glide-active] {
  color: var(--v-on-accent);
}
:is(:root[data-mode="dark"], .dark)
  .v-tabs[data-flow-owned].v-glide:is(.-pills, .-lenses) {
  --glide-bg: var(--v-pink);
  --glide-fg: var(--v-on-accent);
}
.v-weekdays[data-flow-owned].v-glide > .v-glide__pill > i,
.v-iradios[data-flow-owned].v-glide > .v-glide__pill > i,
.v-md__list[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--sel-bg);
}
.v-weekdays[data-flow-owned].v-glide [data-glide-active],
.v-iradios[data-flow-owned].v-glide [data-glide-active],
.v-md__list[data-flow-owned].v-glide [data-glide-active] {
  color: var(--sel-ink);
}
.v-quest__opts[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--questionnaire-flow-face, var(--v-pink-soft));
}
.v-quest__opts[data-flow-owned].v-glide > .v-glide__hover > i {
  background: color-mix(in oklab, var(--v-ink) 8%, transparent);
}
.v-quest__opts[data-flow-owned].v-glide [data-glide-active] {
  color: var(--v-text);
}
.v-quest__opts[data-flow-owned].v-glide [data-glide-active] small {
  color: var(--v-text);
}
:is(:root[data-mode="dark"], .dark)
  .v-quest__opts[data-flow-owned].v-glide
  > .v-glide__pill
  > i {
  background: var(
    --questionnaire-flow-face,
    color-mix(in oklab, var(--v-pink) 28%, var(--v-beige-2))
  );
}
.v-datestrip[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-pink);
  box-shadow: inset 0 0 0 1px var(--v-ink);
}
.v-datestrip[data-flow-owned].v-glide [data-glide-active],
.v-datestrip[data-flow-owned].v-glide [data-glide-active] b {
  color: var(--v-on-accent);
}
[data-flow-fields][data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-pink-soft);
}
[data-flow-fields][data-flow-owned].v-glide > .v-glide__hover {
  display: none;
}
[data-flow-fields][data-flow-owned].v-glide [data-glide-active] {
  color: var(--v-text);
}
[data-flow-fields][data-flow-owned].v-glide
  [data-glide-active]:not(.v-otp input):not([data-slot="input-otp-slot"]) {
  box-shadow: inset 0 0 0 2px var(--v-brand);
}
[data-flow-fields][data-flow-owned].v-glide
  .v-field:has([data-glide-active])
  .v-label {
  color: var(--v-accent-ink);
  transition: color var(--t-flow-radius-sm) ease;
}
[data-flow-fields][data-flow-owned].v-glide > .v-glide__pill > i::after {
  inset: auto 0 0 auto;
}
.v-menu[data-flow-owned].v-glide > .v-glide__pill > i,
.v-cmd__list[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-beige);
}
.v-menu[data-flow-owned].v-glide > .v-glide__hover > i,
.v-cmd__list[data-flow-owned].v-glide > .v-glide__hover > i {
  background: color-mix(in oklab, var(--v-ink) 4%, transparent);
}
.v-menu[data-flow-owned].v-glide [data-glide-active]:not(.-danger),
.v-cmd__list[data-flow-owned].v-glide [data-glide-active]:not(.-danger) {
  color: var(--v-text);
}
.v-menu[data-flow-owned].v-glide [data-glide-active].-danger,
.v-cmd__list[data-flow-owned].v-glide [data-glide-active].-danger {
  color: var(--v-danger-ink);
}
.v-menu[data-flow-owned].v-glide .v-menu__item:hover:not([data-glide-active]),
.v-cmd__list[data-flow-owned].v-glide
  .v-menu__item:hover:not([data-glide-active]) {
  background: transparent;
}
.v-list[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--sel-bg);
  box-shadow: inset 0 0 0 1px var(--sel-edge);
}
.v-list[data-flow-owned].v-glide [data-glide-active] {
  color: var(--sel-ink);
}
.v-carousel__dots[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-pink);
}
.v-carousel__dots[data-flow-owned].v-glide button {
  transition: none;
}
.v-dock[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-pink);
}
.v-dock[data-flow-owned].v-glide .v-dock__item[data-glide-active] {
  color: var(--v-pink);
}
.v-dock[data-flow-owned].v-glide .v-dock__item[aria-current="page"]::after {
  display: none;
}
[data-flow-owned].v-glide[data-flow-kind="bar"] > .v-glide__hover {
  border-radius: var(--r-md);
}
:root[data-flow-hover="off"] [data-flow-owned].v-glide > .v-glide__hover,
[data-flow-owned].v-glide[data-flow-hover="off"] > .v-glide__hover {
  display: none;
}
[data-flow-owned].v-glide > .v-glide__hover {
  transition:
    transform calc(var(--t-flow-hover) / var(--flow-speed, 1)) var(--enter),
    width calc(var(--t-flow-hover) / var(--flow-speed, 1)) var(--enter),
    height calc(var(--t-flow-hover) / var(--flow-speed, 1)) var(--enter),
    border-radius var(--t-flow-radius-sm) ease,
    opacity var(--t-flow-fade-sm) ease;
}
[data-flow-owned].v-glide > .v-glide__pill,
[data-flow-owned].v-glide > .v-glide__trail {
  transition:
    border-radius var(--t-flow-radius) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="glide"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-glide) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-glide),
    width calc(var(--t-flow-glide) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-glide),
    height
      calc(var(--t-flow-glide-h) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-glide),
    border-radius var(--t-flow-radius) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="glide"] > .v-glide__pill.-land > i {
  animation: none;
}
@keyframes vf-land {
  0% {
    transform: scale(
      calc(1 + 0.05 * var(--flow-intensity, 1)),
      calc(1 - 0.08 * var(--flow-intensity, 1))
    );
  }
  60% {
    transform: scale(
      calc(1 - 0.015 * var(--flow-intensity, 1)),
      calc(1 + 0.03 * var(--flow-intensity, 1))
    );
  }
  100% {
    transform: scale(1);
  }
}
[data-flow-owned].v-glide[data-flow-v="stretch"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-stretch) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-stretch),
    width calc(var(--t-flow-stretch) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-stretch),
    height
      calc(var(--t-flow-stretch) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-stretch),
    border-radius var(--t-flow-radius-sm) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="stretch"] > .v-glide__pill.-phase1 {
  transition:
    transform
      calc(var(--t-flow-stretch-p1) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-stretch-p1),
    width
      calc(var(--t-flow-stretch-p1) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-stretch-p1),
    height
      calc(var(--t-flow-stretch-p1) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-stretch-p1);
}
[data-flow-owned].v-glide[data-flow-v="jelly"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-jelly) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-jelly),
    width calc(var(--t-flow-jelly) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-jelly),
    height
      calc(var(--t-flow-jelly-h) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-jelly),
    border-radius var(--t-flow-glide-h) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="jelly"] > .v-glide__hover {
  transition-timing-function: var(--e-flow-jelly-hover);
  transition-duration: calc(var(--t-flow-jelly-hover) / var(--flow-speed, 1));
}
[data-flow-owned].v-glide[data-flow-v="jelly"][data-dir="x"]
  > .v-glide__pill.-land
  > i {
  animation: vf-jellyx calc(var(--t-flow-jelly-land) / var(--flow-speed, 1))
    var(--e-flow-jelly);
}
[data-flow-owned].v-glide[data-flow-v="jelly"][data-dir="y"]
  > .v-glide__pill.-land
  > i {
  animation: vf-jellyy calc(var(--t-flow-jelly-land) / var(--flow-speed, 1))
    var(--e-flow-jelly);
}
@keyframes vf-jellyx {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(
      calc(1 + 0.14 * var(--flow-intensity, 1)),
      calc(1 - 0.16 * var(--flow-intensity, 1))
    );
  }
  65% {
    transform: scale(
      calc(1 - 0.05 * var(--flow-intensity, 1)),
      calc(1 + 0.06 * var(--flow-intensity, 1))
    );
  }
  85% {
    transform: scale(
      calc(1 + 0.02 * var(--flow-intensity, 1)),
      calc(1 - 0.02 * var(--flow-intensity, 1))
    );
  }
  100% {
    transform: scale(1);
  }
}
@keyframes vf-jellyy {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(
      calc(1 - 0.14 * var(--flow-intensity, 1)),
      calc(1 + 0.14 * var(--flow-intensity, 1))
    );
  }
  65% {
    transform: scale(
      calc(1 + 0.05 * var(--flow-intensity, 1)),
      calc(1 - 0.05 * var(--flow-intensity, 1))
    );
  }
  85% {
    transform: scale(
      calc(1 - 0.01 * var(--flow-intensity, 1)),
      calc(1 + 0.02 * var(--flow-intensity, 1))
    );
  }
  100% {
    transform: scale(1);
  }
}
[data-flow-owned].v-glide[data-flow-v="comet"] > .v-glide__trail {
  display: block;
}
[data-flow-owned].v-glide[data-flow-v="comet"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-comet) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-comet),
    width calc(var(--t-flow-comet) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-comet),
    height
      calc(var(--t-flow-comet-h) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-comet),
    border-radius var(--t-flow-comet-h) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="comet"] > .v-glide__trail {
  transition:
    transform
      calc(var(--t-flow-comet-trail) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-comet-trail),
    width
      calc(var(--t-flow-comet-trail) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-comet-trail),
    height
      calc(
        var(--t-flow-comet-trail-h) * var(--glide-d, 1) / var(--flow-speed, 1)
      )
      var(--e-flow-comet-trail),
    border-radius var(--t-flow-comet-h) ease,
    opacity var(--t-flow-comet-h) ease;
}
[data-flow-owned].v-glide[data-flow-v="drop"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-drop) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop),
    width calc(var(--t-flow-drop) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop),
    height calc(var(--t-flow-drop) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop),
    border-radius var(--t-flow-radius-sm) ease,
    opacity var(--t-flow-drop-shoot) ease;
}
[data-flow-owned].v-glide[data-flow-v="drop"] > .v-glide__pill.-gather {
  transition:
    transform
      calc(var(--t-flow-drop-gather) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop-gather),
    width
      calc(var(--t-flow-drop-gather) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop-gather),
    height
      calc(var(--t-flow-drop-gather) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop-gather),
    border-radius var(--t-flow-drop-gather) ease;
}
[data-flow-owned].v-glide[data-flow-v="drop"] > .v-glide__pill.-shoot {
  transition:
    transform
      calc(var(--t-flow-drop-shoot) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-drop-shoot),
    width
      calc(var(--t-flow-drop-shoot) * var(--glide-d, 1) / var(--flow-speed, 1)),
    height
      calc(var(--t-flow-drop-shoot) * var(--glide-d, 1) / var(--flow-speed, 1));
}
[data-flow-owned].v-glide[data-flow-v="drop"] > .v-glide__pill.-land > i {
  animation: vf-bloom calc(var(--t-flow-drop) / var(--flow-speed, 1))
    var(--e-flow-drop);
}
@keyframes vf-bloom {
  0% {
    transform: scale(calc(1 - 0.08 * var(--flow-intensity, 1)));
  }
  100% {
    transform: scale(1);
  }
}
[data-flow-owned].v-glide[data-flow-v="rubber"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-rubber) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-rubber),
    width calc(var(--t-flow-rubber) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-rubber),
    height calc(var(--t-flow-rubber) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-rubber),
    border-radius var(--t-flow-rubber-lead) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="rubber"] > .v-glide__pill.-lead {
  transition:
    transform
      calc(var(--t-flow-rubber-lead) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-rubber-lead),
    width
      calc(var(--t-flow-rubber-lead) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-rubber-lead),
    height
      calc(var(--t-flow-rubber-lead) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-rubber-lead);
}
[data-flow-owned].v-glide[data-flow-v="pebble"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-pebble) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-pebble),
    width calc(var(--t-flow-pebble) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-pebble),
    height
      calc(var(--t-flow-pebble-h) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-pebble),
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="pebble"][data-dir="x"]
  > .v-glide__pill.-land
  > i {
  animation: vf-pebble-x calc(var(--t-flow-pebble-land) / var(--flow-speed, 1))
    var(--e-flow-pebble);
}
[data-flow-owned].v-glide[data-flow-v="pebble"][data-dir="y"]
  > .v-glide__pill.-land
  > i,
[data-flow-owned].v-glide[data-flow-v="pebble"]:not([data-dir])
  > .v-glide__pill.-land
  > i {
  animation: vf-pebble-y calc(var(--t-flow-pebble-land) / var(--flow-speed, 1))
    var(--e-flow-pebble);
}
@keyframes vf-pebble-x {
  0% {
    border-radius: var(--glide-r, 999px);
    transform: none;
  }
  30% {
    border-radius: calc(var(--glide-h, 40px) * 0.46)
      calc(var(--glide-h, 40px) * 0.54) calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.5) / calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.44) calc(var(--glide-h, 40px) * 0.56)
      calc(var(--glide-h, 40px) * 0.5);
    transform: scale(
        calc(1 + 0.03 * var(--flow-intensity, 1)),
        calc(1 - 0.07 * var(--flow-intensity, 1))
      )
      skewX(calc(-3deg * var(--flow-intensity, 1)));
  }
  65% {
    border-radius: calc(var(--glide-h, 40px) * 0.54)
      calc(var(--glide-h, 40px) * 0.46) calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.5) / calc(var(--glide-h, 40px) * 0.48)
      calc(var(--glide-h, 40px) * 0.52) calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.5);
    transform: scale(
        calc(1 - 0.01 * var(--flow-intensity, 1)),
        calc(1 + 0.03 * var(--flow-intensity, 1))
      )
      skewX(calc(1deg * var(--flow-intensity, 1)));
  }
  100% {
    border-radius: var(--glide-r, 999px);
    transform: none;
  }
}
@keyframes vf-pebble-y {
  0% {
    border-radius: var(--glide-r, 999px);
    transform: none;
  }
  30% {
    border-radius: calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.5) calc(var(--glide-h, 40px) * 0.46)
      calc(var(--glide-h, 40px) * 0.54) / calc(var(--glide-h, 40px) * 0.56)
      calc(var(--glide-h, 40px) * 0.5) calc(var(--glide-h, 40px) * 0.44)
      calc(var(--glide-h, 40px) * 0.5);
    transform: scale(
        calc(1 - 0.04 * var(--flow-intensity, 1)),
        calc(1 + 0.05 * var(--flow-intensity, 1))
      )
      skewY(calc(-1.2deg * var(--flow-intensity, 1)));
  }
  65% {
    border-radius: calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.5) calc(var(--glide-h, 40px) * 0.54)
      calc(var(--glide-h, 40px) * 0.46) / calc(var(--glide-h, 40px) * 0.5)
      calc(var(--glide-h, 40px) * 0.52) calc(var(--glide-h, 40px) * 0.48)
      calc(var(--glide-h, 40px) * 0.5);
    transform: scale(
        calc(1 + 0.015 * var(--flow-intensity, 1)),
        calc(1 - 0.02 * var(--flow-intensity, 1))
      )
      skewY(calc(0.4deg * var(--flow-intensity, 1)));
  }
  100% {
    border-radius: var(--glide-r, 999px);
    transform: none;
  }
}
[data-flow-owned].v-glide[data-flow-v="ripple"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-ripple) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-ripple),
    width calc(var(--t-flow-ripple) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-ripple),
    height
      calc(var(--t-flow-ripple-h) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-ripple),
    border-radius var(--t-flow-ripple-h) ease,
    opacity var(--t-flow-ripple-delay) ease;
}
[data-flow-owned].v-glide[data-flow-v="ripple"]
  > .v-glide__pill.-land
  > i::after {
  animation: vf-ripple calc(var(--t-flow-ripple-ring) / var(--flow-speed, 1))
    var(--e-flow-settle) calc(var(--t-flow-ripple-delay) / var(--flow-speed, 1));
}
@keyframes vf-ripple {
  0% {
    box-shadow: 0 0 0 0 var(--glide-ripple, var(--v-pink));
    opacity: 0.55;
  }
  100% {
    box-shadow: 0 0 0 calc(16px * var(--flow-intensity, 1))
      var(--glide-ripple, var(--v-pink));
    opacity: 0;
  }
}
[data-flow-owned].v-glide[data-flow-v="halo"] > .v-glide__pill {
  transition:
    transform
      calc(var(--t-flow-halo) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-halo),
    width calc(var(--t-flow-halo) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-halo),
    height calc(var(--t-flow-halo-h) * var(--glide-d, 1) / var(--flow-speed, 1))
      var(--e-flow-halo),
    border-radius var(--t-flow-radius) ease,
    opacity var(--t-flow-fade) ease;
}
[data-flow-owned].v-glide[data-flow-v="halo"]
  > .v-glide__pill.-land
  > i::after {
  animation: vf-halo calc(var(--t-flow-halo-glow) / var(--flow-speed, 1))
    var(--e-flow-settle);
}
@keyframes vf-halo {
  0% {
    box-shadow: 0 0 0 0 transparent;
    opacity: 0;
  }
  30% {
    box-shadow: 0 0 calc(22px * var(--flow-intensity, 1))
      calc(6px * var(--flow-intensity, 1))
      color-mix(in oklab, var(--v-pink) 60%, transparent);
    opacity: 1;
  }
  100% {
    box-shadow: 0 0 calc(30px * var(--flow-intensity, 1))
      calc(10px * var(--flow-intensity, 1)) transparent;
    opacity: 0;
  }
}
[data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide:is(.-still, [data-flow-still])
  > .v-glide__pill,
[data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide:is(.-still, [data-flow-still])
  > .v-glide__hover,
[data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide:is(.-still, [data-flow-still])
  > .v-glide__trail {
  transition: none;
}
[data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide[data-flow-kind="bar"]
  > .v-glide__pill
  > i,
[data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide[data-flow-kind="bar"]
  > .v-glide__pill
  > i::after {
  animation: none;
}
[data-flow-owned].v-glide.-underline > .v-glide__trail {
  display: none;
}
[data-flow-owned].v-glide > .v-tab,
[data-flow-owned].v-glide > .v-btn,
[data-flow-owned].v-glide > .v-nav__item,
[data-flow-owned].v-glide > .v-item,
[data-flow-owned].v-glide > label,
[data-flow-owned].v-glide > .v-iradio[data-slot="radio-group-item"],
[data-slot="navigation-menu"][data-flow-owned].v-glide
  .v-nav__item[data-slot="navigation-menu-link"] {
  transition:
    color var(--t-flow-label) ease
      calc(var(--t-flow-label-delay) / var(--flow-speed, 1)),
    background-color var(--t-flow-hover) ease,
    box-shadow var(--t-flow-hover) ease,
    transform var(--t-micro) var(--enter);
}
@media (hover: none) {
  [data-flow-owned].v-glide > .v-glide__hover {
    display: none;
  }
}
:root:not([data-flow-hover="off"])
  [data-flow-owned].v-glide:not([data-flow-hover="off"])
  > :is(.v-btn, .v-tab, .v-nav__item):hover:not([data-glide-active]),
:root:not([data-flow-hover="off"])
  [data-slot="navigation-menu"][data-flow-owned].v-glide:not(
    [data-flow-hover="off"]
  )
  .v-nav__item[data-slot="navigation-menu-link"]:hover:not(
    [data-glide-active]
  ) {
  background: transparent;
}
[data-flow-owned].v-glide[data-flow-v="off"] > .v-glide__pill,
[data-flow-owned].v-glide[data-flow-v="off"] > .v-glide__hover,
[data-flow-owned].v-glide[data-flow-v="off"] > .v-glide__trail {
  transition: none;
}
[data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide[data-flow-v="off"]
  > .v-glide__pill
  > i {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide
    > .v-glide__pill,
  [data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide
    > .v-glide__hover,
  [data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide
    > .v-glide__trail {
    transition: none;
  }
  [data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide
    > *
    > i,
  [data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned][data-flow-owned].v-glide
    > *
    > i::after {
    animation: none;
  }
}
:root.-doc-hidden [data-flow-owned].v-glide > .v-glide__pill,
:root.-doc-hidden [data-flow-owned].v-glide > .v-glide__trail {
  transition: none;
}
:root {
  --flow-ease: var(--e-flow-glide);
  --flow-dur: var(--t-flow-glide);
  --flow-land: none;
  --flow-glow: none /* @kind other */;
}
[data-flow-land]:where([data-slot], [data-slot] *) {
  animation:
    var(--flow-land) calc(var(--flow-dur) * 0.85) var(--flow-ease),
    var(--flow-glow) calc(var(--flow-dur) * 1.6) var(--e-flow-settle);
}
@keyframes vf-lean {
  0% {
    transform: none;
  }
  35% {
    transform: scale(
        calc(1 + 0.04 * var(--flow-intensity, 1)),
        calc(1 - 0.07 * var(--flow-intensity, 1))
      )
      skewX(calc(-3deg * var(--flow-intensity, 1)));
  }
  70% {
    transform: scale(
        calc(1 - 0.01 * var(--flow-intensity, 1)),
        calc(1 + 0.03 * var(--flow-intensity, 1))
      )
      skewX(calc(1deg * var(--flow-intensity, 1)));
  }
  100% {
    transform: none;
  }
}
@keyframes vf-ring {
  0% {
    outline: 0 solid color-mix(in oklab, var(--v-pink) 70%, transparent);
  }
  100% {
    outline: calc(12px * var(--flow-intensity, 1)) solid transparent;
  }
}
@keyframes vf-glow {
  0% {
    outline: 0 solid transparent;
  }
  35% {
    outline: calc(6px * var(--flow-intensity, 1)) solid
      color-mix(in oklab, var(--v-pink) 40%, transparent);
  }
  100% {
    outline: calc(10px * var(--flow-intensity, 1)) solid transparent;
  }
}
[data-flow-in="grow"]:where([data-slot], [data-slot] *) {
  transform-origin: var(--flow-ox, 50%) var(--flow-oy, 100%);
  animation:
    vf-grow var(--flow-dur) var(--flow-ease) both,
    var(--flow-glow) calc(var(--flow-dur) * 1.6) var(--e-flow-settle);
}
@keyframes vf-grow {
  from {
    opacity: 0;
    transform: scale(calc(1 - 0.3 * min(1, var(--flow-intensity, 1))));
  }
}
[data-flow-in="enter"]:where([data-slot], [data-slot] *) {
  animation:
    vf-enter var(--flow-dur) var(--flow-ease) both,
    var(--flow-land) calc(var(--flow-dur) * 0.9) var(--flow-ease)
      var(--flow-dur);
}
@keyframes vf-enter {
  from {
    opacity: 0;
    transform: scale(calc(1 - 0.06 * var(--flow-intensity, 1)));
  }
}
.v-switch:where([data-slot], [data-slot] *),
.v-switch:where([data-slot], [data-slot] *)::after,
.v-check:where([data-slot], [data-slot] *) input,
.v-radio:where([data-slot], [data-slot] *) input,
.v-toggle:where([data-slot], [data-slot] *) {
  transition-timing-function: var(--flow-ease);
  transition-duration: var(--flow-dur);
}
.v-track:where([data-slot], [data-slot] *) > i {
  transition:
    width var(--flow-dur) var(--flow-ease),
    background var(--t-flow-radius-sm) ease;
}
.v-ring:where([data-slot], [data-slot] *) circle {
  transition-timing-function: var(--flow-ease);
  transition-duration: var(--flow-dur);
}
.v-bars:where([data-slot], [data-slot] *) > i {
  transition:
    height var(--flow-dur) var(--flow-ease),
    transform var(--flow-dur) var(--flow-ease);
  transform-origin: bottom;
}
.v-skel:where([data-slot], [data-slot] *) {
  animation-duration: calc(var(--t-skel) / var(--flow-speed, 1));
}
.v-skel:where([data-slot], [data-slot] *)::after {
  animation-duration: calc(var(--t-skel-sheen) / var(--flow-speed, 1));
}
.v-pulse:where([data-slot], [data-slot] *) .core {
  animation-duration: calc(var(--t-pulse) / var(--flow-speed, 1));
}
.v-acc:where([data-slot], [data-slot] *) > details::details-content,
.v-collapsible:where([data-slot], [data-slot] *)::details-content {
  display: grid;
  grid-template-rows: 0fr;
  block-size: auto;
  overflow: clip;
  transition: grid-template-rows var(--flow-dur) var(--flow-ease);
}
.v-acc:where([data-slot], [data-slot] *) > details[open]::details-content,
.v-collapsible:where([data-slot], [data-slot] *)[open]::details-content {
  grid-template-rows: 1fr;
  block-size: auto;
}
.v-acc__body:where([data-slot], [data-slot] *),
.v-collapsible__body:where([data-slot], [data-slot] *) {
  min-height: 0;
}
.v-acc:where([data-slot], [data-slot] *) > details[open] > .v-acc__body,
.v-collapsible:where([data-slot], [data-slot] *)[open] > .v-collapsible__body {
  animation: vf-enter var(--flow-dur) var(--flow-ease) both;
}
.v-acc:where([data-slot], [data-slot] *) summary .v-chev,
[data-slot="accordion-trigger"] .v-chev {
  transition-timing-function: var(--flow-ease);
  transition-duration: var(--flow-dur);
}
.v-avatar:where([data-slot], [data-slot] *),
.v-hex:where([data-slot], [data-slot] *),
.v-kbd:where([data-slot], [data-slot] *),
.v-crumbs:where([data-slot], [data-slot] *) a,
.v-bars:where([data-slot], [data-slot] *) > i,
.v-ratio:where([data-slot], [data-slot] *) {
  transition-property: transform;
  transition-duration: var(--flow-dur);
  transition-timing-function: var(--flow-ease);
}
.v-avatar:where([data-slot], [data-slot] *):hover,
.v-hex:where([data-slot], [data-slot] *):hover,
.v-kbd:where([data-slot], [data-slot] *):hover {
  transform: scale(calc(1 + 0.05 * var(--flow-intensity, 1)));
}
.v-ratio:where([data-slot], [data-slot] *):hover {
  transform: scale(calc(1 + 0.015 * var(--flow-intensity, 1)));
}
.v-table:where([data-slot], [data-slot] *) tbody tr,
.v-table:where([data-slot], [data-slot] *) tbody tr .v-disk,
.v-sliderwrap:where([data-slot], [data-slot] *) output {
  transition-timing-function: var(--flow-ease);
  transition-duration: var(--flow-dur);
}
.v-slider:where([data-slot], [data-slot] *)::-webkit-slider-thumb {
  transition:
    transform var(--flow-dur) var(--flow-ease),
    border-radius var(--flow-dur) var(--flow-ease),
    background var(--t-flow-radius-sm) ease;
}
.v-crumbs:where([data-slot], [data-slot] *) a:hover {
  transform: translateY(calc(-1px * var(--flow-intensity, 1)));
}
.v-bars:where([data-slot], [data-slot] *) > i:hover {
  transform: scaleY(calc(1 + 0.04 * var(--flow-intensity, 1)));
}
.v-cal__grid[data-flow-owned].v-glide > .v-glide__pill > i {
  background: var(--v-pink);
}
.v-cal__grid[data-flow-owned].v-glide [data-glide-active] {
  color: var(--v-on-accent);
}
.v-cal__grid[data-flow-owned].v-glide > .v-glide__hover {
  display: none;
}
.v-cal__grid[data-flow-owned].v-glide .v-cal__d:hover:not([data-glide-active]) {
  background: transparent;
}
:root[data-flow="off"] [data-flow-in]:where([data-slot], [data-slot] *),
:root[data-flow="off"] [data-flow-land]:where([data-slot], [data-slot] *),
[data-flow="off"] [data-flow-in]:where([data-slot], [data-slot] *),
[data-flow="off"] [data-flow-land]:where([data-slot], [data-slot] *) {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-flow-in]:where([data-slot], [data-slot] *),
  [data-flow-land]:where([data-slot], [data-slot] *) {
    animation: none;
  }
}

/* Layer paint owns selection wells; selected labels stay transparent at every theme/state specificity. */
[data-flow-owned].v-glide
  [data-glide-active][data-glide-active][data-glide-active] {
  background: transparent;
}
[data-flow-owned].v-glide:not([data-flow-kind="fill"])
  [data-glide-active][data-glide-active][data-glide-active] {
  box-shadow: none;
}
/* Effective motion overrides do not rewrite authored settings. */
:root[data-flow="off"] [data-slot]:is(.v-skel, .v-pulse, .v-ring, .v-bars),
:root[data-flow="off"] [data-slot]:is(.v-skel, .v-pulse, .v-ring, .v-bars) *,
:root[data-flow="off"] [data-slot].v-skel::after {
  animation-play-state: paused;
}
:root[data-flow="off"]
  [data-slot]:is(.v-avatar, .v-hex, .v-kbd, .v-ratio):hover {
  transform: none;
}
:root[data-flow="off"] [data-slot],
[data-flow="off"] [data-slot] {
  --flow-dur: 0s;
  --flow-land: none;
  --flow-glow: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-slot]:is(.v-skel, .v-pulse, .v-ring, .v-bars),
  [data-slot]:is(.v-skel, .v-pulse, .v-ring, .v-bars) *,
  [data-slot].v-skel::after {
    animation-play-state: paused;
  }
  [data-slot]:is(.v-avatar, .v-hex, .v-kbd, .v-ratio):hover {
    transform: none;
  }
  [data-slot] {
    --flow-dur: 0s;
    --flow-land: none;
    --flow-glow: none;
  }
}

/* Radix owns real thumb and indicator elements in the React port. */
[data-slot="switch-thumb"],
[data-slot="checkbox-indicator"],
[data-slot="radio-group-indicator"] {
  transition-timing-function: var(--flow-ease);
  transition-duration: var(--flow-dur);
}
[data-slot="progress-indicator"] {
  transition:
    width var(--flow-dur) var(--flow-ease),
    transform var(--flow-dur) var(--flow-ease),
    background var(--t-flow-radius-sm) ease;
}
[data-slot="accordion-content"][data-state="open"],
[data-slot="collapsible-content"][data-state="open"] {
  animation: vf-enter var(--flow-dur) var(--flow-ease) both;
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="switch-thumb"],
  [data-slot="checkbox-indicator"],
  [data-slot="radio-group-indicator"],
  [data-slot="progress-indicator"] {
    transition-duration: 0s;
  }
}

/* Source morph injects this after flow at specificity one. Keep stronger flow contexts intact. */
[data-morph]:where([data-slot].v-morph-host) {
  transition: transform 0s;
}

/* Source alive.css:529 keeps radio and questionnaire tiles beige even under the travelling fill. */
:is(:root[data-mode="dark"], .dark)
  .v-iradios[data-flow-owned]
  .v-iradio[data-glide-active] {
  background: var(--v-beige);
}
:is(:root[data-mode="dark"], .dark)
  .v-quest__opts[data-flow-owned]
  .v-quest__opt[data-glide-active] {
  background: var(--questionnaire-flow-base, var(--v-beige));
}

/* Selection feedback belongs to the shared layer, keeping text and target
   geometry still during pointer, keyboard and touch activation. */
:is(
    .v-tabs,
    .v-seg,
    .v-pager,
    .v-iradios,
    [role="tablist"],
    [data-slot="toggle-group"]
  )[data-flow-owned].v-glide:not([data-flow-kind="fill"])
  :is(.v-tab, .v-btn, .v-toggle, .v-nav__item, [role="tab"], [role="radio"]):is(
    :hover,
    :active
  ) {
  transform: none;
}
/* Off also covers CSS-only press feedback after automatic Morph detaches. */
[data-flow="off"]
  [data-slot]:is(
    .v-btn,
    .v-ibtn,
    .v-toggle,
    .v-tab,
    .v-nav__item,
    .v-menu__item,
    .v-item
  ):is(:hover, :active) {
  transform: none;
}
/* A zero-duration transition with a delay is still a running animation. */
@media (prefers-reduced-motion: reduce) {
  [data-flow-owned] {
    --t-flow-label-delay: 0s;
  }
  [data-flow-owned].v-glide,
  [data-flow-owned].v-glide * {
    transition-delay: 0s;
    animation-delay: 0s;
  }
}
:root[data-flow="off"] [data-flow-owned],
:root[data-flow="off"] [data-flow-owned] * {
  transition-delay: 0s;
  animation-delay: 0s;
}

[data-flow="off"] [data-slot] {
  transition-duration: 0s;
  transition-delay: 0s;
  animation-duration: 0s;
  animation-delay: 0s;
  animation-iteration-count: 1;
}

/* Motion owns travel and feedback. CSS still supplies colors and layer layout. */
:root
  [data-flow-owned][data-flow-engine="motion"].v-glide[data-flow-v]
  > :is(.v-glide__pill, .v-glide__hover, .v-glide__trail) {
  transition: none;
  will-change: auto;
}
:root
  [data-flow-owned][data-flow-engine="motion"].v-glide[data-flow-v]
  > :is(.v-glide__pill, .v-glide__hover, .v-glide__trail)
  > i,
:root
  [data-flow-owned][data-flow-engine="motion"].v-glide[data-flow-v]
  > :is(.v-glide__pill, .v-glide__hover, .v-glide__trail)
  > i::after {
  animation: none;
}
/* Matches the shared layer rule's weight, which would otherwise pin the trail to the pill and hide Comet's tail. */
[data-flow-owned][data-flow-engine="motion"].v-glide > .v-glide__trail {
  transform: translate3d(var(--trail-x, 0px), var(--trail-y, 0px), 0);
  width: var(--trail-w, 0px);
  height: var(--trail-h, 0px);
  border-radius: var(--trail-r, 999px);
  opacity: var(--trail-o, 0);
}
[data-flow-presence] {
  animation: none;
}
/* This animation changes no visible property. Its end event lets Radix unmount
   after Motion's exit, keeping focus management and component contracts intact. */
@keyframes v-motion-presence {
  from {
    --v-presence-beat: 0;
  }
  to {
    --v-presence-beat: 1;
  }
}
[data-flow-presence][data-state="closed"] {
  animation: v-motion-presence var(--flow-exit-duration, 0.22s) linear;
  pointer-events: none;
}
:root[data-flow="off"] [data-flow-presence][data-state="closed"],
[data-flow="off"] [data-flow-presence][data-state="closed"] {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-flow-presence][data-state="closed"] {
    animation: none;
  }
}
}

/* ---- Morph host rules ---- */
@layer cojeev-morph {
[data-slot].v-morph-host { isolation: isolate; }
[data-slot].v-morph-rel { position: relative; }
[data-slot].v-morph-host > svg.v-morph { max-width: none; max-height: none; }
[data-slot].v-morph-host > svg.v-morph, [data-slot].v-morph-host > svg.v-morph * { pointer-events: none; }
[data-slot].v-morph-host > svg.v-morph > [data-morph-body]:not([data-morph-colors]) { fill: var(--mfill, transparent); }
[data-slot].v-morph-host > svg.v-morph > [data-morph-body][stroke] { stroke: var(--mstroke, transparent); }
[data-slot].v-morph-host[data-morph="stroke"] > svg.v-morph > [data-morph-body] { fill: none; }
[data-slot].v-morph-host > svg.v-morph > [data-morph-echo] { fill: none; }
[data-slot].v-morph-live[data-morph="stroke"], [data-slot].v-morph-live[data-morph="both"] { border-color: transparent; box-shadow: none; }
[data-slot=badge].v-badge.-dashed.v-morph-live, [data-slot=badge].v-badge.-test.v-morph-live { border-color: transparent; }
}

/* ---- button styles ---- */
@layer cojeev-states {
/* The face and the morph layer share the same opaque state paint. Busy keeps its
   variant identity; disabled is a separate, deliberately quiet state. */
.v-btn[data-slot] {
  text-decoration: none;
  transition: background var(--t-micro) var(--enter), color var(--t-micro), transform var(--t-micro) var(--enter);
}
/* Card choices keep Button's interaction contract; callers own their layout. */
.v-btn[data-slot].-card {
  height:auto;
  min-height:44px;
  padding:var(--s-3);
  border-radius:var(--r-md);
  white-space:normal;
}
.v-btn[data-slot].-secondary { background:var(--v-blue); color:var(--v-on-accent); box-shadow:none; }
.v-btn[data-slot]:not(.-accent):not(.-secondary):not(.-ghost):not(.-outline):not(.-danger):not(:disabled):not([aria-disabled="true"]):hover {
  background:color-mix(in oklab,var(--v-ink) 88%,var(--v-canvas));
}
.v-btn[data-slot].-secondary:not(:disabled):not([aria-disabled="true"]):hover { background:color-mix(in oklab,var(--v-blue) 90%,var(--ink-fixed)); }
.v-btn[data-slot].-danger:not(:disabled):not([aria-disabled="true"]):hover { background:color-mix(in oklab,var(--v-danger-fill) 88%,black); }
:is(:root[data-mode="dark"], .dark) .v-btn[data-slot]:not(.-accent):not(.-secondary):not(.-ghost):not(.-outline):not(.-danger):not(:disabled):not([aria-disabled="true"]:not([aria-busy="true"])) { background:var(--v-pink); color:var(--v-on-accent); }
:is(:root[data-mode="dark"], .dark) .v-btn[data-slot]:is(.-ghost,.-outline) { color:var(--v-text); }
.v-btn[data-slot] .v-icon { width:18px; height:18px; }
.v-btn[data-slot][aria-busy="true"] { position:relative; cursor:progress; gap:var(--s-3); }
.v-btn__loading[data-slot] { --pulse:20px; display:inline-flex; align-items:center; justify-content:center; flex:none; pointer-events:none; }
.v-btn[data-slot] [data-slot="button-indicator"] { width:20px; height:20px; }
.v-btn[data-slot] [data-slot="button-indicator"] svg { width:100%; height:100%; overflow:visible; }
.v-btn[data-slot] [data-slot="button-indicator"] .seed { fill:currentColor; }
.v-btn[data-slot] [data-slot="button-indicator"] .core { fill:transparent; }
/* Native disabled or a consumer's aria-disabled wins over every variant/theme;
   aria-disabled added only for loading suppresses activation, not readability. */
:root .v-btn[data-slot]:is(:disabled,[aria-disabled="true"]:not([aria-busy="true"])) {
  background:var(--v-disabled-face); color:var(--v-disabled-ink); box-shadow:inset 0 0 0 1px var(--v-disabled-edge); cursor:not-allowed; transform:none;
}
@media(prefers-reduced-motion:reduce) { .v-btn[data-slot] { transition:none; } }
[data-stable-hit].v-btn { transform:none; }
}

/* ---- spinner styles ---- */
@layer cojeev-states {
/* Motion owns the indicator's contour, rotation, and pulse. */
.v-pulse[data-slot] {
  flex-shrink: 0;
}
.v-pulse[data-slot] svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.v-pulse[data-slot] .seed {
  fill: var(--pulse-c, var(--v-pink));
}
.v-pulse[data-slot] .core {
  fill: var(--v-on-accent);
}
.v-pulse[data-slot]:has([data-slot="spinner-label"]) {
  margin-bottom: var(--s-7);
}
.v-pulse__label[data-slot] {
  width: max-content;
  max-width: min(32ch, 70vw);
  white-space: normal;
  text-align: center;
  line-height: 1.4;
  top: calc(100% + 8px);
  bottom: auto;
}
.v-pulse__orbit {
  fill: none;
  stroke: var(--v-border);
  stroke-width: 1.5;
}
.v-pulse__hub {
  fill: var(--v-text);
}
.v-pulse__mark--0 {
  fill: var(--pulse-c, var(--v-pink));
}
.v-pulse__mark--1 {
  fill: var(--v-blue);
}
.v-pulse__mark--2 {
  fill: var(--v-olive);
}
.v-loader-example {
  min-width: 0;
  width: 100%;
  display: grid;
  gap: var(--s-5);
}
.v-loader-example__stage {
  position: relative;
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  column-gap: var(--s-7);
  row-gap: var(--s-5);
  padding: var(--s-7);
  border: 1px solid var(--v-border);
  border-radius: var(--r-sheet) var(--r-sheet) var(--r-sm) var(--r-sheet);
  background: var(--v-paper);
}
.v-loader-example__index {
  grid-column: 1/-1;
  font-size: var(--fs-caps);
  letter-spacing: 0.12em;
  color: var(--v-text-2);
}
.v-loader-example__drawing {
  display: grid;
  place-items: center;
  width: 120px;
  min-height: 120px;
  position: relative;
}
.v-loader-example__drawing:before {
  content: "";
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 45% 55% 52% 48%;
  background: color-mix(in srgb, var(--v-pink) 12%, transparent);
}
.v-loader-example[data-appearance="orbit"] .v-loader-example__drawing:before {
  background: color-mix(in srgb, var(--v-blue) 12%, transparent);
  border-radius: 50%;
}
.v-loader-example[data-appearance="relay"] .v-loader-example__drawing:before {
  background: color-mix(in srgb, var(--v-olive) 12%, transparent);
  border-radius: var(--r-panel) var(--r-sm) var(--r-panel) var(--r-sm);
}
.v-loader-example__copy {
  align-self: center;
  min-width: 0;
}
.v-loader-example__copy h3 {
  margin: 0;
  font-size: var(--fs-title);
  line-height: 1.25;
  font-weight: var(--fw-semibold);
  letter-spacing: -0.025em;
}
.v-loader-example__copy p {
  margin: var(--s-3) 0 0;
  font-size: var(--fs-control);
  color: var(--v-text-2);
  line-height: 1.65;
  max-width: 45ch;
}
.v-loader-example__status {
  grid-column: 1/-1;
  border-top: 1px solid var(--v-border);
  padding-top: var(--s-4);
  font-size: var(--fs-meta);
  color: var(--v-text-2);
}
.v-loader-example__done[data-slot] {
  --is: 36px;
  color: var(--v-text);
}
.v-loader-example > .v-loading-example__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-2);
}
.v-loader-example > .v-loading-example__actions > [data-slot="button"] {
  width: auto;
  min-height: 44px;
}
@media (max-width: 600px) {
  .v-loader-example__stage {
    grid-template-columns: 1fr;
    padding: var(--s-6);
    gap: var(--s-5);
  }
  .v-loader-example__drawing {
    justify-self: start;
  }
}
}

/* ---- presence styles ---- */
@layer cojeev-states {
/* Separate lifecycle channels preserve a child's authored transform/contour owner. */
.v-motion-surface[data-motion-surface] {
  translate: var(--presence-x,0px) var(--presence-y,0px);
  scale: var(--presence-scale,1);
}
.v-motion-surface:is([data-motion-surface="soften"],[data-motion-surface="focus"]) { filter:blur(var(--presence-blur,0px)); }
.v-motion-surface[data-motion-quiet="true"] { translate: none; scale: none; clip-path: none; }
.v-motion-surface[data-motion-quiet="true"]:is([data-motion-surface="soften"],[data-motion-surface="focus"]) { filter:none; }
.v-motion-surface[data-motion-exiting="true"] { pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .v-motion-surface[data-motion-surface] { translate: none; scale: none; clip-path: none; }
  .v-motion-surface:is([data-motion-surface="soften"],[data-motion-surface="focus"]) { filter:none; }
}
}

/* ---- hero-button styles ---- */
@layer cojeev-states {
/* The SVG face takes the same semantic paint as the native fallback. */
:root .v-btn.v-hero-button[data-slot][data-hero-variant] {
  --hero-fill: var(--v-ink);
  --hero-ink: var(--v-on-ink);
  --hero-edge: var(--v-ink);
  --mfill: var(--hero-fill);
  --mstroke: var(--hero-edge);
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 62px;
  min-width: 240px;
  max-width: 100%;
  padding: 0 var(--s-6) 0 var(--s-7);
  gap: var(--s-6);
  border-radius: var(--r-pill);
  background: var(--hero-fill);
  color: var(--hero-ink);
  font: var(--fw-semibold) var(--fs-lead)/1.2 var(--font-text);
  letter-spacing: -0.025em;
  text-decoration: none;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}
:root .v-btn.v-hero-button[data-slot][data-hero-variant="accent"] {
  --hero-fill: var(--v-pink);
  --hero-ink: var(--v-on-accent);
  --hero-edge: var(--v-border);
}
:root .v-btn.v-hero-button[data-slot][data-hero-variant="secondary"] {
  --hero-fill: var(--v-blue);
  --hero-ink: var(--v-on-accent);
  --hero-edge: var(--v-border);
}
:root .v-btn.v-hero-button[data-slot][data-hero-variant="danger"] {
  --hero-fill: var(--v-danger-fill);
  --hero-ink: #fff;
  --hero-edge: var(--v-danger-fill);
}
:root
  .v-btn.v-hero-button[data-slot]:is(
    [data-hero-variant="outline"],
    [data-hero-variant="ghost"]
  ) {
  --hero-fill: var(--v-paper);
  --hero-ink: var(--v-text);
  --hero-edge: var(--v-border);
}
:root .v-btn.v-hero-button[data-slot]:has(> svg.v-morph) {
  background: transparent;
}
.v-hero-button[data-slot] > svg.v-morph {
  filter: drop-shadow(
    0 3px 0 color-mix(in oklab, var(--hero-edge) 34%, transparent)
  );
}
.v-hero-button__label {
  position: relative;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}
.v-hero-button__arrow {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 32px;
}
.v-hero-button__arrow svg {
  overflow: visible;
}
:root .v-btn.v-hero-button[data-slot][data-hero-size="sm"] {
  height: 48px;
  min-width: 180px;
  padding-inline: var(--s-5);
  gap: var(--s-4);
  font-size: var(--fs-control);
}
:root .v-btn.v-hero-button[data-slot][data-hero-size="default"] {
  height: 56px;
  min-width: 216px;
  padding-inline: var(--s-6);
  gap: var(--s-5);
  font-size: var(--fs-reading);
}
:root .v-btn.v-hero-button[data-slot]:focus-visible {
  outline: 2px solid var(--v-text);
  outline-offset: 7px;
}
:root
  .v-btn.v-hero-button[data-slot]:is(
    :disabled,
    [aria-disabled="true"]:not([aria-busy="true"])
  ) {
  --hero-fill: var(--v-disabled-face);
  --hero-ink: var(--v-disabled-ink);
  --hero-edge: var(--v-disabled-edge);
  color: var(--v-disabled-ink);
  box-shadow: none;
}
.v-hero-button[data-slot]:is(:disabled, [aria-disabled="true"]) > svg.v-morph {
  filter: none;
}

/* Twelve material/interaction concepts, all around one stationary native target. */
.v-hero-button__window {
  position: relative;
  min-width: 0;
  z-index: 1;
}
.v-hero-button__label {
  display: block;
}
.v-hero-button__arrow {
  position: relative;
  z-index: 1;
  transition: transform var(--t-element) var(--enter);
}
.v-hero-button__paint {
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.v-hero-button__paint > i {
  position: absolute;
  display: none;
  pointer-events: none;
}
.v-hero-button__edition {
  position: relative;
  z-index: 1;
  font-size: var(--fs-caps);
  line-height: 1.4;
  letter-spacing: 0.08em;
  text-align: center;
  flex: none;
  padding-inline-end: var(--s-4);
  border-inline-end: 1px dashed currentColor;
}
.v-hero-button__echo {
  position: absolute;
  inset: 0;
  transform: translateY(150%);
}
.v-hero-button__label,
.v-hero-button__echo {
  transition: transform var(--t-element) var(--enter);
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="split-arrow"] {
  padding-inline-end: var(--s-3);
  gap: var(--s-5);
}
.v-hero-button[data-hero-appearance="split-arrow"] .v-hero-button__arrow {
  width: 46px;
  height: 42px;
  border-radius: var(--r-pill);
  background: var(--v-pink);
  color: var(--v-on-accent);
}
.v-hero-button[data-hero-appearance="split-arrow"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__arrow {
  transform: translateX(4px);
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="paper-fold"] {
  border-radius: var(--r-md) var(--r-sheet) var(--r-md) var(--r-md);
  padding-inline: var(--s-6);
}
:root
  .v-btn.v-hero-button[data-hero-appearance="paper-fold"][data-hero-variant="default"] {
  --hero-fill: var(--v-yellow);
  --hero-ink: var(--v-on-accent);
  --hero-edge: var(--v-border);
}
.v-hero-button[data-hero-appearance="paper-fold"]
  .v-hero-button__paint
  > i:first-child {
  display: block;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: var(--v-on-accent);
  opacity: 0.16;
  clip-path: polygon(0 0, 100% 100%, 0 100%);
  transform-origin: 100% 0;
  transition: transform var(--t-element) var(--enter);
}
.v-hero-button[data-hero-appearance="paper-fold"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint
  > i:first-child {
  transform: scale(1.6);
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="pressed-key"] {
  border-radius: var(--r-card-sm);
}
.v-hero-button[data-hero-appearance="pressed-key"] > svg.v-morph {
  filter: drop-shadow(
    0 6px 0 color-mix(in srgb, var(--hero-edge) 40%, transparent)
  );
  transition: filter var(--t-micro);
}
.v-hero-button[data-hero-appearance="pressed-key"] .v-hero-button__paint {
  inset: 5px;
  border: 1px solid color-mix(in srgb, var(--hero-ink) 25%, transparent);
  border-radius: var(--r-sm);
}
.v-hero-button[data-hero-appearance="pressed-key"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__window,
.v-hero-button[data-hero-appearance="pressed-key"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__arrow {
  transform: translateY(2px);
}
.v-hero-button[data-hero-appearance="pressed-key"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  > svg.v-morph {
  filter: drop-shadow(
    0 2px 0 color-mix(in srgb, var(--hero-edge) 40%, transparent)
  );
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="ribbon"] {
  border-radius: var(--r-sm);
  padding-inline-start: var(--s-8);
}
:root
  .v-btn.v-hero-button[data-hero-appearance="ribbon"][data-hero-variant="default"] {
  --hero-fill: var(--v-blue);
  --hero-ink: var(--v-on-accent);
  --hero-edge: var(--v-border);
}
.v-hero-button[data-hero-appearance="ribbon"] .v-hero-button__paint {
  border-radius: var(--r-sm);
}
.v-hero-button[data-hero-appearance="ribbon"] .v-hero-button__paint > i {
  display: block;
  top: -15%;
  bottom: -15%;
  left: 8px;
  width: 5px;
  background: currentColor;
  opacity: 0.2;
  transform: skewX(-20deg);
  transition: transform var(--t-element) var(--enter);
}
.v-hero-button[data-hero-appearance="ribbon"]
  .v-hero-button__paint
  > i:nth-child(2) {
  left: 17px;
}
.v-hero-button[data-hero-appearance="ribbon"]
  .v-hero-button__paint
  > i:nth-child(3) {
  display: none;
}
.v-hero-button[data-hero-appearance="ribbon"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint
  > i {
  transform: translateX(4px) skewX(-30deg);
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="ticket"] {
  border-radius: var(--r-md);
  gap: var(--s-4);
  padding-inline: var(--s-5);
  min-width: min(280px, 100%);
}
:root
  .v-btn.v-hero-button[data-hero-appearance="ticket"][data-hero-variant="default"] {
  --hero-fill: var(--v-olive);
  --hero-ink: var(--v-on-accent);
  --hero-edge: var(--v-border);
}
.v-hero-button[data-hero-appearance="ticket"] .v-hero-button__arrow {
  border-inline-start: 1px dashed currentColor;
  padding-inline-start: var(--s-2);
}
.v-hero-button[data-hero-appearance="ticket"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__arrow {
  transform: rotate(-7deg) translateX(3px);
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="seal"] {
  height: 132px;
  width: 132px;
  min-width: 132px;
  border-radius: 50%;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-6);
  text-align: center;
  font-size: var(--fs-lead);
}
:root
  .v-btn.v-hero-button[data-hero-appearance="seal"][data-hero-variant="default"] {
  --hero-fill: var(--v-pink);
  --hero-ink: var(--v-on-accent);
  --hero-edge: var(--v-border);
}
.v-hero-button[data-hero-appearance="seal"] .v-hero-button__paint {
  inset: 9px;
  border: 1px dashed var(--hero-ink);
  border-radius: 50%;
  transition: transform var(--t-max) var(--enter);
}
.v-hero-button[data-hero-appearance="seal"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint {
  transform: rotate(25deg);
}

:root
  .v-btn.v-hero-button[data-hero-appearance="ink-sweep"][data-hero-variant="default"] {
  --hero-fill: var(--v-canvas);
  --hero-ink: var(--v-text);
  --hero-edge: var(--v-border);
}
.v-hero-button[data-hero-appearance="ink-sweep"]
  .v-hero-button__paint
  > i:first-child {
  display: block;
  inset: 18% 5%;
  background: var(--v-pink);
  border-radius: 50% 30% 55% 20%;
  opacity: 0.35;
  transform: scaleX(0.08);
  transform-origin: left;
  transition: transform var(--t-max) var(--enter);
}
.v-hero-button[data-hero-appearance="ink-sweep"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint
  > i:first-child {
  transform: scaleX(1);
}

.v-hero-button[data-hero-appearance="orbit"] .v-hero-button__arrow {
  border: 1px solid currentColor;
  border-radius: 50%;
  width: 46px;
  height: 46px;
}
.v-hero-button[data-hero-appearance="orbit"] .v-hero-button__arrow::after {
  content: "";
  position: absolute;
  inset: -6px;
  border: 1px solid color-mix(in srgb, currentColor 45%, transparent);
  border-radius: 50%;
  transform: rotate(-35deg) scaleX(0.72);
  transition: transform var(--t-max) var(--enter);
}
.v-hero-button[data-hero-appearance="orbit"] .v-hero-button__arrow::before {
  content: "";
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--v-pink);
  top: -6px;
  left: 18px;
  transform-origin: 4px 30px;
  transition: transform var(--t-max) var(--enter);
}
.v-hero-button[data-hero-appearance="orbit"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__arrow::before {
  transform: rotate(160deg);
}
.v-hero-button[data-hero-appearance="orbit"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__arrow::after {
  transform: rotate(35deg) scaleX(0.72);
}

.v-hero-button[data-hero-appearance="sliding-window"] .v-hero-button__window {
  overflow: hidden;
  padding-block: 2px;
}
.v-hero-button[data-hero-appearance="sliding-window"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__label {
  transform: translateY(-150%);
}
.v-hero-button[data-hero-appearance="sliding-window"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__echo {
  transform: translateY(0);
}

:root
  .v-btn.v-hero-button[data-slot][data-hero-size][data-hero-appearance="stacked-paper"] {
  border-radius: var(--r-md);
}
:root
  .v-btn.v-hero-button[data-hero-appearance="stacked-paper"][data-hero-variant="default"] {
  --hero-fill: var(--v-canvas);
  --hero-ink: var(--v-text);
  --hero-edge: var(--v-border);
}
.v-hero-button[data-hero-appearance="stacked-paper"] .v-hero-button__paint {
  overflow: visible;
  inset: 0;
}
.v-hero-button[data-hero-appearance="stacked-paper"] .v-hero-button__paint > i {
  display: block;
  inset: 4px;
  border: 1px solid var(--hero-edge);
  border-radius: var(--r-sm);
  transform: translateY(6px) rotate(-2deg);
  transition: transform var(--t-element) var(--enter);
}
.v-hero-button[data-hero-appearance="stacked-paper"]
  .v-hero-button__paint
  > i:nth-child(2) {
  transform: translateY(10px) rotate(2deg);
}
.v-hero-button[data-hero-appearance="stacked-paper"]
  .v-hero-button__paint
  > i:nth-child(3) {
  display: none;
}
.v-hero-button[data-hero-appearance="stacked-paper"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint
  > i:first-child {
  transform: translateY(7px) rotate(-4deg);
}
.v-hero-button[data-hero-appearance="stacked-paper"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint
  > i:nth-child(2) {
  transform: translateY(12px) rotate(4deg);
}

.v-hero-button[data-hero-appearance="spotlight"] .v-hero-button__paint {
  background: radial-gradient(
    70px circle at var(--hero-pointer-x, 50%) var(--hero-pointer-y, 50%),
    color-mix(in srgb, var(--hero-ink) 25%, transparent),
    transparent
  );
  opacity: 0.35;
  transition: opacity var(--t-element);
}
.v-hero-button[data-hero-appearance="spotlight"][data-arrow-active="true"]:not(
    [data-motion-quiet="true"]
  )
  .v-hero-button__paint {
  opacity: 1;
}
.v-hero-button[data-motion-quiet="true"]
  :is(
    .v-hero-button__label,
    .v-hero-button__echo,
    .v-hero-button__arrow,
    .v-hero-button__paint,
    .v-hero-button__paint > i
  ),
.v-hero-button[data-motion-quiet="true"] .v-hero-button__arrow::before,
.v-hero-button[data-motion-quiet="true"] .v-hero-button__arrow::after {
  transition: none;
}
:root
  .v-btn.v-hero-button[data-slot][data-hero-appearance="seal"][data-hero-size="sm"] {
  width: 112px;
  min-width: 112px;
  height: 112px;
  padding: var(--s-4);
  font-size: var(--fs-body);
}
:root
  .v-btn.v-hero-button[data-slot][data-hero-appearance="seal"][data-hero-size="lg"] {
  width: 148px;
  min-width: 148px;
  height: 148px;
  padding: var(--s-6);
  font-size: var(--fs-lead);
}
:root
  .v-btn.v-hero-button[data-slot][data-hero-appearance][data-hero-variant]:is(
    :disabled,
    [aria-disabled="true"]:not([aria-busy="true"])
  ) {
  --hero-fill: var(--v-disabled-face);
  --hero-ink: var(--v-disabled-ink);
  --hero-edge: var(--v-disabled-edge);
  color: var(--v-disabled-ink);
}
.v-hero-demo {
  display: grid;
  justify-items: center;
  gap: var(--s-4);
  padding: var(--s-8) var(--s-3);
  text-align: center;
  min-width: 0;
}
.v-hero-demo > .v-meta {
  max-width: 32ch;
  font-size: var(--fs-small);
  line-height: 1.6;
}
.v-hero-demo [role="status"] {
  font-size: var(--fs-meta);
  min-height: 1.6em;
}
.v-hero-demo[data-compact] {
  padding: var(--s-6) var(--s-3);
}
@media (max-width: 600px) {
  :root
    .v-btn.v-hero-button[data-hero-appearance]:not(
      [data-hero-appearance="seal"]
    ) {
    min-width: 0;
    gap: var(--s-4);
    padding-inline: var(--s-5);
  }
}
}

/* ---- control-appearance styles ---- */
@layer cojeev-states {
/* One inherited corner contract, with a readable cap for multiline/native fields. */
:is(.v-input,.v-igroup,.v-select,.v-native,.v-number-input,.v-btn) {
  border-radius: var(--v-control-radius, var(--r-pill));
}
:is(.v-textarea,.v-composer,.v-native,.v-multi-select__trigger) {
  border-radius: min(var(--v-control-radius, 20px), 20px);
}
.v-btn[data-control-shape="card"] { border-radius: var(--r-md); }
.v-btn[data-control-shape="pill"] { border-radius: var(--r-pill); }

/* A Field can own the treatment for its immediate shell; explicit child paint wins. */
:root .v-native[data-appearance] { padding-inline-end:var(--s-10); }
:root .v-native[data-appearance][size]:not([size="1"]) { padding-inline:var(--s-2); }
[data-slot="field"][data-appearance="contour"] { --v-field-face: var(--v-canvas); }
:root [data-appearance="contour"]:is(.v-input,.v-igroup,.v-textarea,.v-native,.v-select,.v-number-input,.v-multi-select__trigger),
:root [data-slot="field"][data-appearance="contour"] :is(.v-input,.v-igroup,.v-textarea):not([data-appearance]) {
  background-color: var(--v-canvas);
  color: var(--v-text);
  box-shadow: inset 0 0 0 1px var(--v-edge);
}
:root [data-appearance="editorial"]:is(.v-input,.v-igroup,.v-textarea,.v-native,.v-select,.v-number-input,.v-multi-select__trigger),
:root [data-slot="field"][data-appearance="editorial"] :is(.v-input,.v-igroup,.v-textarea):not([data-appearance]) {
  border-radius: 0;
  background-color: transparent;
  color: var(--v-text);
  box-shadow: inset 0 -1px 0 var(--v-edge);
  padding-inline: 2px;
}
:root [data-slot="field"][data-appearance="inset"] {
  padding: var(--s-4) var(--s-4);
  border-radius: min(var(--v-control-radius, 20px), 20px);
  background: var(--v-beige);
  color: var(--v-text);
  box-shadow: inset 0 1px 2px color-mix(in oklab, var(--v-text) 9%, transparent);
  gap: var(--s-2);
}
:root [data-appearance="inset"]:is(.v-input,.v-igroup,.v-textarea,.v-native,.v-select,.v-number-input,.v-multi-select__trigger) {
  background-color: var(--v-beige);
  color: var(--v-text);
  box-shadow: inset 0 1px 2px color-mix(in oklab, var(--v-text) 12%, transparent);
}
:root [data-slot="field"][data-appearance="inset"] :is(.v-input,.v-igroup,.v-textarea):not([data-appearance]) {
  background: transparent;
  box-shadow: none;
  padding-inline: 0;
}
:root [data-slot="field"][data-appearance="inset"] [data-slot="field-label"] { color: var(--v-text-2); }
:root [data-slot="field"][data-appearance="inset"]:focus-within { outline: 2px solid var(--v-brand); outline-offset: 2px; }
:root [data-appearance]:is(.v-input,.v-igroup,.v-textarea,.v-native,.v-select,.v-number-input,.v-multi-select__trigger):focus-within,
:root [data-slot="field"][data-appearance] :is(.v-input,.v-igroup,.v-textarea):focus-within {
  outline: 2px solid var(--v-brand);
  outline-offset: 3px;
}
:root [data-slot="field"][data-appearance="inset"] :is(.v-input,.v-igroup,.v-textarea):focus-within { outline: none; }
:root [data-appearance]:is(.v-input,.v-igroup,.v-textarea,.v-native,.v-select,.v-number-input,.v-multi-select__trigger):is(:disabled,[data-disabled="true"],:has(input:disabled)),
:root [data-slot="field"][data-appearance] :is(.v-input,.v-igroup,.v-textarea):is(:disabled,:has(input:disabled)) {
  background: var(--v-disabled-face);
  color: var(--v-disabled-ink);
  box-shadow: inset 0 0 0 1px var(--v-disabled-edge);
  cursor: not-allowed;
}
:root [data-slot="field"][data-appearance][data-state="error"],
:root [data-appearance]:is(.v-input,.v-igroup,.v-textarea,.v-native,.v-select,.v-number-input,.v-multi-select__trigger):is([aria-invalid="true"],[data-invalid="true"],:has([aria-invalid="true"])) {
  outline: 2px solid var(--v-danger-fill);
  outline-offset: 3px;
}
:root [data-slot="field"][data-appearance][data-state="error"] [role="alert"] { color: var(--v-danger-ink); }

.v-form-example { display: grid; gap: var(--s-5); width: 100%; min-width: 0; max-width: 480px; margin-inline: auto; }
.v-form-example__intro { display: grid; gap: var(--s-1); }
.v-form-example__intro strong { font-family: var(--font-display, inherit); font-size: var(--fs-title); font-weight: var(--fw-medium); }
.v-form-example__intro p { margin: 0; color: var(--v-text-2); font-size: var(--fs-small); line-height: 1.5; }
.v-form-example__status { min-height: 1.5em; margin: 0; font-size: var(--fs-meta); color: var(--v-text-2); overflow-wrap: anywhere; }
.v-form-example__footer { display: flex; gap: var(--s-3); align-items: center; justify-content: space-between; }

/* Composer owns one surface, while the actual textarea keeps native editing. */
:root .v-composer[data-appearance] { border-radius:min(var(--v-control-radius,20px),20px); background:var(--v-canvas); color:var(--v-text); box-shadow:inset 0 0 0 1px var(--v-edge); }
:root .v-composer[data-appearance="inset"] { background:var(--v-beige); box-shadow:inset 0 1px 2px color-mix(in oklab,var(--v-text) 12%,transparent); }
:root .v-composer[data-appearance="editorial"] { border-radius:0; background:transparent; box-shadow:inset 0 -1px 0 var(--v-edge); }
:root .v-composer[data-appearance] .v-textarea:is(:focus,:hover,:not(:focus)) { background:transparent; box-shadow:none; outline:0; border-radius:0; resize:vertical; }
:root .v-composer[data-appearance] .v-textarea-scroll > textarea { padding-inline-end:var(--s-8); }
:root [data-slot="field"][data-appearance] [data-slot="input-group"] .v-textarea { background:transparent; box-shadow:none; outline:0; border:0; border-radius:0; }
:root .v-composer[data-appearance]:focus-within { outline:2px solid var(--v-brand); outline-offset:3px; }
:root [data-slot="field"][data-appearance="inset"] .v-composer[data-appearance] { background:transparent; box-shadow:none; outline:0; }
.v-form-example[data-form-example="field"] { max-width:600px; }
.v-form-example [data-slot="field-label"] { font-size:var(--fs-control); line-height:1.5; }
.v-form-example [data-slot="field-description"] { font-size:var(--fs-small); margin:0; }
.v-form-example__footer > .v-btn, .v-form-example [data-slot="textarea-composer-bar"] > .v-btn { min-height:44px; }
.v-form-example [data-slot="textarea-composer-bar"] { justify-content:space-between; flex-wrap:wrap; gap:var(--s-3); padding:var(--s-3) var(--s-3); border-top:1px solid var(--v-border); }
.v-form-example__allowance { height:4px; border-radius:var(--r-xs); overflow:hidden; background:var(--v-beige); margin-top:-8px; }
.v-form-example__allowance > span { display:block; height:100%; max-width:100%; border-radius:inherit; background:var(--v-blue-deep); }
.v-form-example__label-row { display:flex; align-items:baseline; flex-wrap:wrap; gap:var(--s-2); justify-content:space-between; }
.v-form-example__label-row > span { font-size:var(--fs-meta); color:var(--v-text-2); }
.v-form-example__hint { margin:0; color:var(--v-text-2); font-size:var(--fs-small); line-height:1.5; }
/* Editorial draws only the focus edge: no moving caret, label or hit area. */
:root [data-appearance="editorial"]:is(.v-input,.v-igroup,.v-textarea,.v-composer),
:root [data-slot="field"][data-appearance="editorial"] :is(.v-input,.v-igroup,.v-textarea):not([data-appearance]) {
  background-image:linear-gradient(var(--v-brand),var(--v-brand)); background-repeat:no-repeat; background-position:left bottom; background-size:0% 2px;
  transition:background-size var(--t-micro) var(--enter);
}
:root [data-appearance="editorial"]:is(.v-input,.v-igroup,.v-textarea,.v-composer):focus-within,
:root [data-slot="field"][data-appearance="editorial"] :is(.v-input,.v-igroup,.v-textarea):focus-within { background-size:100% 2px; outline:0; }
@media(prefers-reduced-motion:reduce) { :root [data-slot="field"] :is(.v-input,.v-igroup,.v-textarea,.v-composer) { transition:none; } }
}
`;

function CojeevStyles() {
  return (
    <style href="000h-hero-button" precedence="default">
      {COJEEV_CSS}
    </style>
  );
}
