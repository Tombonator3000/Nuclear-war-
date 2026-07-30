import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { City, GameState, NationId } from "@/game/types";
import { MAP_HEIGHT, MAP_WIDTH, PROJECTION_SCALE, PROJECTION_TRANSLATE } from "@/game/projection";

export interface Flight {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
  duration: number;
  outcome: "hit" | "intercept";
  attacker?: NationId;
  label?: string;
}

interface Props {
  state: GameState;
  selectedCardId: string | null;
  onTargetCity: (city: City) => void;
  flights?: Flight[];
  onFlightsComplete?: () => void;
  animSpeed?: number;
  animPaused?: boolean;
}

const NATION_STROKE: Record<NationId, string> = {
  USA: "var(--color-phosphor)",
  USSR: "var(--color-alert)",
  CHINA: "var(--color-amber)",
  EURO: "var(--color-phosphor)",
};

let cachedLand: Feature<Geometry> | null = null;
let cachedBorders: Feature<Geometry> | null = null;
let cachedCountries: FeatureCollection<Geometry> | null = null;

async function loadWorld() {
  if (cachedLand && cachedBorders && cachedCountries) return { land: cachedLand, borders: cachedBorders, countries: cachedCountries };
  const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = (await res.json()) as any;
  const countriesGeom = topo.objects.countries;
  const landGeom = topo.objects.land;
  cachedLand = feature(topo, landGeom) as unknown as Feature<Geometry>;
  cachedBorders = mesh(topo, countriesGeom, (a, b) => a !== b) as unknown as Feature<Geometry>;
  cachedCountries = feature(topo, countriesGeom) as unknown as FeatureCollection<Geometry>;
  return { land: cachedLand, borders: cachedBorders, countries: cachedCountries };
}

interface View { x: number; y: number; w: number; h: number }
const INITIAL_VIEW: View = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
const MIN_W = MAP_WIDTH / 20;
const MAX_W = MAP_WIDTH;

function clampView(v: View): View {
  const w = Math.min(MAX_W, Math.max(MIN_W, v.w));
  const h = w * (MAP_HEIGHT / MAP_WIDTH);
  const x = Math.min(MAP_WIDTH - w, Math.max(0, v.x));
  const y = Math.min(MAP_HEIGHT - h, Math.max(0, v.y));
  return { x, y, w, h };
}

export type MapStyle = "wopr" | "dark" | "wireframe";
interface StylePreset {
  label: string;
  bgFill: string;
  gridOpacity: number;
  graticuleColor: string;
  graticuleOpacity: number;
  graticuleWidth: number;
  landFill: string;
  landFillOpacity: number;
  landStroke: string;
  landStrokeOpacity: number;
  landStrokeWidth: number;
  landGlow: string | null;
  borderStroke: string;
  borderStrokeOpacity: number;
  borderStrokeWidth: number;
  vignette: boolean;
  cityGlow: boolean;
}

const STYLE_PRESETS: Record<MapStyle, StylePreset> = {
  wopr: { label: "WOPR", bgFill: "url(#grid)", gridOpacity: 1, graticuleColor: "var(--color-phosphor)", graticuleOpacity: 0.12, graticuleWidth: 0.4, landFill: "var(--color-phosphor)", landFillOpacity: 0.06, landStroke: "var(--color-phosphor)", landStrokeOpacity: 0.85, landStrokeWidth: 0.6, landGlow: "drop-shadow(0 0 1.5px var(--color-phosphor))", borderStroke: "var(--color-phosphor)", borderStrokeOpacity: 0.35, borderStrokeWidth: 0.3, vignette: true, cityGlow: true },
  dark: { bgFill: "oklch(0.10 0.03 240)", label: "DARK", gridOpacity: 0.25, graticuleColor: "var(--color-amber)", graticuleOpacity: 0.08, graticuleWidth: 0.35, landFill: "oklch(0.22 0.04 220)", landFillOpacity: 1, landStroke: "var(--color-amber)", landStrokeOpacity: 0.55, landStrokeWidth: 0.4, landGlow: null, borderStroke: "var(--color-amber)", borderStrokeOpacity: 0.25, borderStrokeWidth: 0.25, vignette: true, cityGlow: true },
  wireframe: { bgFill: "oklch(0.04 0 0)", label: "WIRE", gridOpacity: 0, graticuleColor: "var(--color-phosphor-dim)", graticuleOpacity: 0.35, graticuleWidth: 0.35, landFill: "transparent", landFillOpacity: 0, landStroke: "var(--color-phosphor)", landStrokeOpacity: 1, landStrokeWidth: 0.5, landGlow: null, borderStroke: "var(--color-phosphor-dim)", borderStrokeOpacity: 0.8, borderStrokeWidth: 0.3, vignette: false, cityGlow: false },
};

export function WorldMap({ state, selectedCardId, onTargetCity, flights, onFlightsComplete, animSpeed = 1, animPaused = false }: Props) {
  const [world, setWorld] = useState<{ land: Feature<Geometry>; borders: Feature<Geometry>; countries: FeatureCollection<Geometry> } | null>(null);
  useEffect(() => { loadWorld().then(setWorld).catch(() => setWorld(null)); }, []);

  const { pathLand, pathBorders, pathGraticule } = useMemo(() => {
    const projection = geoEquirectangular().scale(PROJECTION_SCALE).translate(PROJECTION_TRANSLATE);
    const path = geoPath(projection);
    return { pathLand: world ? path(world.land) ?? "" : "", pathBorders: world ? path(world.borders) ?? "" : "", pathGraticule: path(geoGraticule10()) ?? "" };
  }, [world]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const panRef = useRef({ active: false, startX: 0, startY: 0, startView: INITIAL_VIEW, pointerId: -1, moved: false });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef({ active: false, startDist: 0, startCenter: { x: 0, y: 0 }, startView: INITIAL_VIEW, moved: false });
  const k = MAP_WIDTH / view.w;
  const inv = 1 / k;

  const rafRef = useRef<number | null>(null);
  const pendingViewRef = useRef<View | null>(null);
  const viewRef = useRef<View>(view);
  viewRef.current = view;
  const scheduleView = useCallback((next: View) => {
    pendingViewRef.current = next;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const v = pendingViewRef.current;
      pendingViewRef.current = null;
      if (v) setView(v);
    });
  }, []);
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  useEffect(() => {
    const svg = svgRef.current as (SVGSVGElement & { pauseAnimations?: () => void; unpauseAnimations?: () => void }) | null;
    if (!svg) return;
    if (animPaused) svg.pauseAnimations?.(); else svg.unpauseAnimations?.();
  }, [animPaused]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (clientX - rect.left) / rect.width;
    const my = (clientY - rect.top) / rect.height;
    const prev = pendingViewRef.current ?? viewRef.current;
    const newW = Math.min(MAX_W, Math.max(MIN_W, prev.w / factor));
    const newH = newW * (MAP_HEIGHT / MAP_WIDTH);
    const wx = prev.x + mx * prev.w;
    const wy = prev.y + my * prev.h;
    scheduleView(clampView({ x: wx - mx * newW, y: wy - my * newH, w: newW, h: newH }));
  }, [scheduleView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const beginPinch = () => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    pinchRef.current = { active: true, startDist: Math.hypot(dx, dy) || 1, startCenter: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, startView: view, moved: false };
    panRef.current.active = false;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) { beginPinch(); return; }
    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startView: view, pointerId: e.pointerId, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.active && pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const start = pinchRef.current;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx0 = (start.startCenter.x - rect.left) / rect.width;
      const my0 = (start.startCenter.y - rect.top) / rect.height;
      const wx = start.startView.x + mx0 * start.startView.w;
      const wy = start.startView.y + my0 * start.startView.h;
      const newW = Math.min(MAX_W, Math.max(MIN_W, start.startView.w / (dist / start.startDist)));
      const newH = newW * (MAP_HEIGHT / MAP_WIDTH);
      const mx1 = (cx - rect.left) / rect.width;
      const my1 = (cy - rect.top) / rect.height;
      pinchRef.current.moved = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      scheduleView(clampView({ x: wx - mx1 * newW, y: wy - my1 * newH, w: newW, h: newH }));
      return;
    }
    const p = panRef.current;
    if (!p.active || p.pointerId !== e.pointerId) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - p.startX) / rect.width) * p.startView.w;
    const dy = ((e.clientY - p.startY) / rect.height) * p.startView.h;
    if (!p.moved && Math.abs(e.clientX - p.startX) + Math.abs(e.clientY - p.startY) > 3) {
      p.moved = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (!p.moved) return;
    scheduleView(clampView({ ...p.startView, x: p.startView.x - dx, y: p.startView.y - dy }));
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const wasPinching = pinchRef.current.active;
    pointersRef.current.delete(e.pointerId);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (wasPinching) {
      if (pointersRef.current.size < 2) {
        pinchRef.current.active = false;
        panRef.current.moved = true;
        panRef.current.active = false;
      }
      return;
    }
    if (panRef.current.pointerId === e.pointerId) panRef.current.active = false;
  };

  const handleCityClick = (city: City) => { if (!panRef.current.moved) onTargetCity(city); };
  const zoomIn = () => { const svg = svgRef.current; if (!svg) return; const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.6); };
  const zoomOut = () => { const svg = svgRef.current; if (!svg) return; const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.6); };
  const reset = () => setView(INITIAL_VIEW);

  const [style, setStyle] = useState<MapStyle>(() => {
    if (typeof window === "undefined") return "wopr";
    const v = window.localStorage.getItem("nw:mapStyle");
    return v === "dark" || v === "wireframe" || v === "wopr" ? v : "wopr";
  });
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("nw:mapStyle", style); }, [style]);
  const preset = STYLE_PRESETS[style];

  return (
    <div className="relative h-full w-full">
      <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="h-full w-full touch-none select-none" role="img" aria-label="Global situation map" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ cursor: panRef.current.active ? "grabbing" : "grab" }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-grid)" strokeWidth={0.5 * inv} /></pattern>
          <radialGradient id="mapVignette" cx="50%" cy="50%" r="65%"><stop offset="70%" stopColor="black" stopOpacity="0" /><stop offset="100%" stopColor="black" stopOpacity="0.5" /></radialGradient>
          <filter id="cityGlow"><feGaussianBlur stdDeviation="1.5" /></filter>
        </defs>
        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill={preset.bgFill} />
        {preset.bgFill !== "url(#grid)" && preset.gridOpacity > 0 && <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#grid)" opacity={preset.gridOpacity} />}
        <path d={pathGraticule} fill="none" stroke={preset.graticuleColor} strokeOpacity={preset.graticuleOpacity} strokeWidth={preset.graticuleWidth * inv} />
        {pathLand && <path d={pathLand} fill={preset.landFill} fillOpacity={preset.landFillOpacity} stroke={preset.landStroke} strokeOpacity={preset.landStrokeOpacity} strokeWidth={preset.landStrokeWidth * inv} style={preset.landGlow ? { filter: preset.landGlow } : undefined} />}
        {pathBorders && <path d={pathBorders} fill="none" stroke={preset.borderStroke} strokeOpacity={preset.borderStrokeOpacity} strokeWidth={preset.borderStrokeWidth * inv} />}
        {preset.vignette && <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#mapVignette)" pointerEvents="none" />}
        {!world && <text x={view.x + view.w / 2} y={view.y + view.h / 2} textAnchor="middle" fill="var(--color-phosphor)" fontFamily="var(--font-mono)" fontSize={12 * inv} style={{ textShadow: "0 0 4px currentColor" }}>LOADING GEODETIC DATASET…</text>}
        {state.cities.map((city) => {
          const dead = city.population <= 0;
          const stroke = NATION_STROKE[city.nation];
          const baseR = dead ? 2.2 : 2.2 + Math.min(4.5, city.population / 10);
          const r = baseR * inv;
          const clickable = selectedCardId != null && city.nation !== state.humanId && !dead;
          return <g key={city.id} data-city={city.id} onClick={() => clickable && handleCityClick(city)} style={{ cursor: clickable ? "crosshair" : "inherit" }}>
            {clickable && <circle cx={city.x} cy={city.y} r={r + 6 * inv} fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth={0.6 * inv} strokeDasharray={`${2 * inv} ${2 * inv}`}><animate attributeName="r" values={`${r + 5 * inv};${r + 10 * inv};${r + 5 * inv}`} dur="1.4s" repeatCount="indefinite" /></circle>}
            <g stroke={stroke} strokeWidth={0.4 * inv} opacity={dead ? 0.25 : 0.5}><line x1={city.x - r - 3 * inv} y1={city.y} x2={city.x - r} y2={city.y} /><line x1={city.x + r} y1={city.y} x2={city.x + r + 3 * inv} y2={city.y} /><line x1={city.x} y1={city.y - r - 3 * inv} x2={city.x} y2={city.y - r} /><line x1={city.x} y1={city.y + r} x2={city.x} y2={city.y + r + 3 * inv} /></g>
            <circle cx={city.x} cy={city.y} r={r} fill={dead ? "transparent" : stroke} stroke={stroke} strokeWidth={(dead ? 0.8 : 0.4) * inv} filter={preset.cityGlow ? "url(#cityGlow)" : undefined} opacity={dead ? 0.3 : 1} />
            {city.fallout > 0 && <circle cx={city.x} cy={city.y} r={r + 3 * inv} fill="none" stroke="var(--color-amber)" strokeWidth={0.5 * inv} strokeDasharray={`${1 * inv} ${3 * inv}`} opacity="0.7" />}
            <text x={city.x + r + 3 * inv} y={city.y + 2.5 * inv} fill={stroke} fontFamily="var(--font-mono)" fontSize={6 * inv} style={{ textShadow: "0 0 3px currentColor" }}>{city.name} {dead ? "✕" : `${city.population}M`}</text>
          </g>;
        })}
        {flights && flights.length > 0 && <MissileLayer flights={flights} inv={inv} onComplete={onFlightsComplete} speedMul={1 / Math.max(0.01, animSpeed)} paused={animPaused} />}
      </svg>
      <div className="pointer-events-none absolute right-2 top-2 flex flex-col gap-1 font-mono text-xs"><button type="button" onClick={zoomIn} className="pointer-events-auto h-7 w-7 border border-phosphor/60 bg-black/60 text-phosphor hover:bg-phosphor/10" aria-label="Zoom in">+</button><button type="button" onClick={zoomOut} className="pointer-events-auto h-7 w-7 border border-phosphor/60 bg-black/60 text-phosphor hover:bg-phosphor/10" aria-label="Zoom out">−</button><button type="button" onClick={reset} className="pointer-events-auto h-7 w-7 border border-phosphor/60 bg-black/60 text-phosphor hover:bg-phosphor/10" aria-label="Reset view">⟳</button></div>
      <div className="pointer-events-none absolute left-2 top-2 flex gap-1 font-mono text-[10px]">{(Object.keys(STYLE_PRESETS) as MapStyle[]).map((s) => { const active = s === style; return <button key={s} type="button" onClick={() => setStyle(s)} aria-pressed={active} className={`pointer-events-auto border px-2 py-1 tracking-widest transition-colors ${active ? "border-phosphor bg-phosphor/20 text-phosphor" : "border-phosphor/40 bg-black/60 text-phosphor/70 hover:bg-phosphor/10"}`}>{STYLE_PRESETS[s].label}</button>; })}</div>
      <div className="pointer-events-none absolute bottom-2 right-2 border border-phosphor/40 bg-black/60 px-2 py-0.5 font-mono text-[10px] text-phosphor/80">ZOOM ×{k.toFixed(1)}</div>
    </div>
  );
}

function MissileLayerInner({ flights, inv, onComplete, speedMul = 1, paused = false }: { flights: Flight[]; inv: number; onComplete?: () => void; speedMul?: number; paused?: boolean }) {
  const ms = (v: number) => Math.round(v * speedMul);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const remainingRef = useRef(0);
  const resumeAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const flightsKey = flights.map((f) => f.id).join("|");
  const total = flights.length ? Math.max(...flights.map((f) => f.delay + f.duration)) * speedMul + ms(1600) : 0;

  useEffect(() => {
    if (!total) return;
    firedRef.current = false;
    remainingRef.current = total;
    resumeAtRef.current = performance.now();
  }, [flightsKey, total]);

  useEffect(() => {
    if (!total || paused) return;
    resumeAtRef.current = performance.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (firedRef.current) return;
      firedRef.current = true;
      onCompleteRef.current?.();
    }, Math.max(0, remainingRef.current));
    return () => {
      if (timerRef.current == null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - resumeAtRef.current));
    };
  }, [flightsKey, total, paused]);

  return <g pointerEvents="none">{flights.map((f) => {
    const dx = f.to.x - f.from.x;
    const dy = f.to.y - f.from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const midX = (f.from.x + f.to.x) / 2;
    const midY = (f.from.y + f.to.y) / 2;
    const arcH = Math.min(220, dist * 0.55);
    const d = `M ${f.from.x} ${f.from.y} Q ${midX} ${midY - arcH} ${f.to.x} ${f.to.y}`;
    const delay = ms(f.delay);
    const dur = ms(f.duration);
    const impactDelay = delay + dur;
    const isHit = f.outcome === "hit";
    const arcColor = (f.attacker ? NATION_STROKE[f.attacker] : null) ?? (isHit ? "var(--color-alert)" : "var(--color-amber)");
    const labelX = midX;
    const labelY = midY - arcH - 4 * inv;
    const revealMax = dist + arcH + 20 * inv;
    const clipId = `trail-clip-${f.id}`;
    return <g key={f.id}>
      <defs><clipPath id={clipId}><circle cx={f.from.x} cy={f.from.y} r={0}><animate attributeName="r" from={0} to={revealMax} begin={`${delay}ms`} dur={`${dur}ms`} fill="freeze" /></circle></clipPath></defs>
      <path d={d} fill="none" stroke={arcColor} strokeOpacity="0.1" strokeWidth={0.3 * inv} strokeDasharray={`${1.2 * inv} ${2.5 * inv}`} />
      <path d={d} fill="none" stroke={arcColor} strokeWidth={0.8 * inv} strokeLinecap="round" strokeDasharray={`${2.5 * inv} ${2 * inv}`} clipPath={`url(#${clipId})`} style={{ filter: `drop-shadow(0 0 2.5px ${arcColor})` }} />
      <circle r={1.8 * inv} fill="var(--color-amber)" opacity={0} style={{ filter: "drop-shadow(0 0 4px var(--color-amber))" }}><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.02;0.98;1" begin={`${delay}ms`} dur={`${dur}ms`} fill="freeze" /><animateMotion path={d} begin={`${delay}ms`} dur={`${dur}ms`} fill="freeze" rotate="auto" /></circle>
      {f.label && <g opacity={0}><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" begin={`${delay}ms`} dur={`${dur + ms(400)}ms`} fill="freeze" /><rect x={labelX - 42 * inv} y={labelY - 5 * inv} width={84 * inv} height={7 * inv} fill="black" fillOpacity="0.7" stroke={arcColor} strokeOpacity="0.6" strokeWidth={0.3 * inv} /><text x={labelX} y={labelY} textAnchor="middle" fontSize={5 * inv} fontFamily="monospace" fill={arcColor}>{f.label}</text></g>}
      {isHit ? <g opacity={0}><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.75;1" begin={`${impactDelay}ms`} dur={`${ms(1500)}ms`} fill="freeze" /><circle cx={f.to.x} cy={f.to.y} r={1 * inv} fill="none" stroke="var(--color-alert)" strokeWidth={1 * inv}><animate attributeName="r" from={2 * inv} to={28 * inv} begin={`${impactDelay}ms`} dur={`${ms(1400)}ms`} fill="freeze" /><animate attributeName="stroke-opacity" from="1" to="0" begin={`${impactDelay}ms`} dur={`${ms(1400)}ms`} fill="freeze" /></circle><circle cx={f.to.x} cy={f.to.y} r={0.5 * inv} fill="none" stroke="var(--color-amber)" strokeWidth={0.5 * inv}><animate attributeName="r" from={1 * inv} to={18 * inv} begin={`${impactDelay + ms(200)}ms`} dur={`${ms(1200)}ms`} fill="freeze" /><animate attributeName="stroke-opacity" from="1" to="0" begin={`${impactDelay + ms(200)}ms`} dur={`${ms(1200)}ms`} fill="freeze" /></circle><circle cx={f.to.x} cy={f.to.y} r={0} fill="var(--color-amber)"><animate attributeName="r" from={0} to={7 * inv} begin={`${impactDelay}ms`} dur={`${ms(350)}ms`} fill="freeze" /><animate attributeName="fill-opacity" values="0.95;0.6;0" keyTimes="0;0.4;1" begin={`${impactDelay}ms`} dur={`${ms(700)}ms`} fill="freeze" /></circle>{[0,45,90,135,180,225,270,315].map((a) => { const rad = (a * Math.PI) / 180; return <line key={a} x1={f.to.x} y1={f.to.y} x2={f.to.x + Math.cos(rad) * 14 * inv} y2={f.to.y + Math.sin(rad) * 14 * inv} stroke="var(--color-alert)" strokeWidth={0.5 * inv} strokeOpacity="0"><animate attributeName="stroke-opacity" values="0;1;0" keyTimes="0;0.15;1" begin={`${impactDelay}ms`} dur={`${ms(600)}ms`} fill="freeze" /></line>; })}</g> : <g opacity={0}><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.2;1" begin={`${impactDelay}ms`} dur={`${ms(500)}ms`} fill="freeze" /><circle cx={f.to.x} cy={f.to.y} r={0} fill="none" stroke="var(--color-amber)" strokeWidth={0.6 * inv}><animate attributeName="r" from={0} to={6 * inv} begin={`${impactDelay}ms`} dur={`${ms(400)}ms`} fill="freeze" /></circle></g>}
    </g>;
  })}</g>;
}

const MissileLayer = memo(MissileLayerInner);