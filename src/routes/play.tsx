import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CRTScreen } from "@/components/crt/CRTScreen";
import { HandCard } from "@/components/hud/HandCard";
import { StepGuide } from "@/components/hud/StepGuide";
import { WorldMap, type Flight } from "@/components/map/WorldMap";
import { aiOrders } from "@/game/ai";
import {
  ACTION_BUDGET,
  applyDefconDrop,
  applyFallout,
  applyLaunch,
  applyOrder,
  collectRetaliations,
  finishRound,
  groupRetaliations,
  initialState,
  livingNations,
  population,
} from "@/game/engine";
import type { Card, City, GameState, NationId, Order, SecretCard, WeaponCard } from "@/game/types";
import { clearSave, consumeNewGameFlag, loadGame, loadOptions, recordHighscore, saveGame } from "@/lib/game-storage";
import { Scheduler } from "@/lib/scheduler";
import * as sfx from "@/lib/sfx";

export const Route = createFileRoute("/play")({
  component: PlayScreen,
  head: () => ({ meta: [
    { title: "Global Thermonuclear War — Nuclear War WOPR Edition" },
    { name: "description", content: "The NORAD situation room. Launch, intercept and retaliate in this WarGames-styled remake of Nuclear War." },
    { property: "og:title", content: "Global Thermonuclear War — WOPR Situation Room" },
    { property: "og:description", content: "Command a nuclear power from a 1983 phosphor terminal. Play cards, launch missiles, survive the fallout." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

const DEFCON_COLOR: Record<number, string> = {
  1: "text-alert text-glow-alert",
  2: "text-alert text-glow-alert",
  3: "text-amber text-glow-amber",
  4: "text-phosphor text-glow",
  5: "text-phosphor text-glow",
};
const FLIGHT_MS = 3000;

function PlayScreen() {
  const [state, setState] = useState<GameState>(() => initialState(20260702));
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingSecret, setPendingSecret] = useState<SecretCard | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const [animPaused, setAnimPaused] = useState<boolean>(false);
  const [currentAttacker, setCurrentAttacker] = useState<NationId | null>(null);
  const [retaliationBy, setRetaliationBy] = useState<NationId | null>(null);
  const [budget, setBudget] = useState({ launches: 0, diplomacy: 0, secrets: 0 });
  const [running, setRunning] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ from: NationId; name: string; flavor: string } | null>(null);

  const turnLaunchesRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;
  const animSpeedRef = useRef<number>(animSpeed);
  animSpeedRef.current = animSpeed;
  const highscoreRecorded = useRef(false);
  const flightDoneRef = useRef<(() => void) | null>(null);
  const clockRef = useRef<Scheduler | null>(null);
  if (clockRef.current === null && typeof window !== "undefined") clockRef.current = new Scheduler();
  const clock = () => clockRef.current!;

  useEffect(() => {
    const seedParam = Number(new URLSearchParams(window.location.search).get("seed") ?? "");
    if (Number.isFinite(seedParam) && seedParam > 0) {
      setState(initialState(seedParam >>> 0));
      return;
    }
    const wantNew = consumeNewGameFlag();
    if (!wantNew) {
      const saved = loadGame();
      if (saved) { setState(saved); return; }
    }
    setState(initialState(Date.now()));
  }, []);

  useEffect(() => { setAnimSpeed(loadOptions().animSpeed); }, []);
  useEffect(() => () => clockRef.current?.clear(), []);
  useEffect(() => {
    const c = clockRef.current;
    if (!c) return;
    if (animPaused) c.pause(); else c.resume();
  }, [animPaused]);

  const animating = flights.length > 0 || running;
  const peakPopRef = useRef<Record<NationId, number>>({ USA: 1, USSR: 1, CHINA: 1, EURO: 1 });
  (Object.keys(state.nations) as NationId[]).forEach((nid) => {
    const p = population(state, nid);
    if (p > peakPopRef.current[nid]) peakPopRef.current[nid] = p;
  });

  useEffect(() => { if (!state.winner) saveGame(state); }, [state]);
  useEffect(() => {
    if (!state.winner || highscoreRecorded.current) return;
    highscoreRecorded.current = true;
    const humanPop = population(state, state.humanId);
    const outcome: "VICTORY" | "SURVIVED" | "MUTUAL_DESTRUCTION" | "ELIMINATED" =
      state.winner === "NONE" ? "MUTUAL_DESTRUCTION" : state.winner === state.humanId ? "VICTORY" : humanPop > 0 ? "SURVIVED" : "ELIMINATED";
    recordHighscore({ date: Date.now(), nation: state.winner, human: state.humanId, survivedTurns: state.turn, survivorPop: humanPop, outcome });
    clearSave();
  }, [state]);

  const human = state.nations[state.humanId];
  const humanPop = population(state, state.humanId);
  const enemies = useMemo(() => livingNations(state).filter((n) => n !== state.humanId), [state]);
  const launchesLeft = ACTION_BUDGET.launch - budget.launches;
  const diplomacyLeft = ACTION_BUDGET.diplomacy - budget.diplomacy;
  const secretsLeft = ACTION_BUDGET.secret - budget.secrets;
  const selectedCard = human.hand.find((c) => c.id === selectedCardId) ?? null;
  const selectedWeapon = selectedCard?.kind === "weapon" ? (selectedCard as WeaponCard) : null;

  useEffect(() => {
    setBudget({ launches: 0, diplomacy: 0, secrets: 0 });
    turnLaunchesRef.current = 0;
  }, [state.turn]);

  useEffect(() => {
    if (!state.lastSecretBanner) return;
    setBanner(state.lastSecretBanner);
    const cancel = clockRef.current?.after(3200, () => setBanner(null));
    return () => cancel?.();
  }, [state.lastSecretBanner]);

  const sleep = (ms: number) => clock().sleep(ms);
  const klaxon = (cycles = 2) => {
    for (let i = 0; i < cycles; i++) clock().after(i * sfx.KLAXON_CYCLE_MS, () => sfx.klaxonCycle());
  };

  const onFlightsComplete = useCallback(() => {
    const done = flightDoneRef.current;
    flightDoneRef.current = null;
    setFlights([]);
    done?.();
  }, []);

  async function animateLaunch(base: GameState, order: Extract<Order, { kind: "launch" }>): Promise<GameState> {
    const requested = base.cities.find((c) => c.id === order.targetCityId);
    const card = base.nations[order.from].hand.find((c) => c.id === order.cardId);
    const { state: nextState, result } = applyLaunch(base, order);
    const impactCity = base.cities.find((c) => c.id === result.impactCityId) ?? requested ?? null;
    if (!impactCity || !card || card.kind !== "weapon" || result.outcome === "aborted") {
      setState(nextState);
      return nextState;
    }
    const origins = base.cities
      .filter((c) => c.nation === order.from && c.population > 0)
      .sort((a, b) => Math.hypot(a.x - impactCity.x, a.y - impactCity.y) - Math.hypot(b.x - impactCity.x, b.y - impactCity.y));
    const origin = origins[0] ?? base.cities.find((c) => c.nation === order.from);
    if (!origin) { setState(nextState); return nextState; }

    const detonates = result.outcome === "hit" || result.outcome === "wasted";
    const spd = 1 / Math.max(0.01, animSpeedRef.current || 1);
    const label = result.reason === "guidance-fault"
      ? `${order.from} ▶ ${card.name} ⤳ ${impactCity.name} (DRIFT)`
      : `${order.from} ▶ ${card.name} → ${impactCity.name}`;
    const flight: Flight = {
      id: `${order.from}-${order.cardId}-${base.turn}-${impactCity.id}`,
      from: { x: origin.x, y: origin.y },
      to: { x: impactCity.x, y: impactCity.y },
      delay: 0,
      duration: FLIGHT_MS,
      outcome: detonates ? "hit" : "intercept",
      attacker: order.from,
      label,
    };

    await new Promise<void>((resolve) => {
      flightDoneRef.current = resolve;
      setFlights([flight]);
      clock().after(150 * spd, () => sfx.launch(0));
      clock().after((FLIGHT_MS + 100) * spd, () => detonates ? sfx.impact(0) : sfx.intercept(0));
    });
    setState(nextState);
    return nextState;
  }

  async function applyPaced(base: GameState, order: Order, ms: number): Promise<GameState> {
    const next = applyOrder(base, order);
    setState(next);
    await sleep(ms);
    return next;
  }

  async function runNationTurn(base: GameState, nid: NationId, orders: Order[]): Promise<GameState> {
    setCurrentAttacker(nid);
    const spd = 1 / Math.max(0.01, animSpeedRef.current || 1);
    const rank = (o: Order) => o.kind === "playPop" ? 0 : o.kind === "playSecret" ? 1 : o.kind === "propaganda" ? 2 : 3;
    const sorted = [...orders].sort((a, b) => rank(a) - rank(b));
    let s = base;
    for (const o of sorted) {
      if (o.kind === "launch") {
        s = await animateLaunch(s, o);
        turnLaunchesRef.current += 1;
        await sleep(250 * spd);
      } else if (o.kind !== "pass") {
        s = await applyPaced(s, o, 600 * spd);
      }
    }
    setCurrentAttacker(null);
    await sleep(400 * spd);
    return s;
  }

  async function playHumanOrder(order: Order): Promise<void> {
    if (runningRef.current || state.phase !== "orders") return;
    if (order.kind === "launch" && launchesLeft <= 0) return;
    if (order.kind === "propaganda" && diplomacyLeft <= 0) return;
    if (order.kind === "playSecret" && secretsLeft <= 0) return;
    runningRef.current = true;
    setRunning(true);
    try {
      setCurrentAttacker(state.humanId);
      setSelectedCardId(null);
      setPendingSecret(null);
      const base = stateRef.current;
      if (order.kind === "launch") {
        setBudget((b) => ({ ...b, launches: b.launches + 1 }));
        await animateLaunch(base, order);
        turnLaunchesRef.current += 1;
      } else if (order.kind === "propaganda") {
        setBudget((b) => ({ ...b, diplomacy: b.diplomacy + 1 }));
        await applyPaced(base, order, 400);
      } else if (order.kind === "playSecret") {
        setBudget((b) => ({ ...b, secrets: b.secrets + 1 }));
        await applyPaced(base, order, 400);
      } else if (order.kind === "playPop") {
        await applyPaced(base, order, 300);
      }
      setCurrentAttacker(null);
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }

  function onCardClick(card: Card) {
    if (runningRef.current) return;
    if (card.kind === "pop") { void playHumanOrder({ kind: "playPop", from: state.humanId, cardId: card.id }); return; }
    if (card.kind === "secret") {
      if (secretsLeft <= 0) return;
      const needsTarget = ["PROPAGANDA_COUP", "DEFECTOR", "TOP_SECRET", "SUPER_GERM"].includes(card.secret);
      if (needsTarget) { setPendingSecret(card); setSelectedCardId(null); }
      else void playHumanOrder({ kind: "playSecret", from: state.humanId, cardId: card.id });
      return;
    }
    if (launchesLeft <= 0) return;
    setSelectedCardId(selectedCardId === card.id ? null : card.id);
    setPendingSecret(null);
  }

  function pickSecretTarget(target: NationId) {
    if (!pendingSecret) return;
    const s = pendingSecret;
    setPendingSecret(null);
    void playHumanOrder({ kind: "playSecret", from: state.humanId, cardId: s.id, target });
  }

  function onTargetCity(city: City) {
    if (!selectedWeapon || launchesLeft <= 0 || runningRef.current) return;
    void playHumanOrder({ kind: "launch", from: state.humanId, cardId: selectedWeapon.id, targetCityId: city.id });
  }

  async function runEndOfRound(base: GameState, launches: number): Promise<GameState> {
    const spd = 1 / Math.max(0.01, animSpeedRef.current || 1);
    let s = applyFallout(applyDefconDrop(base, launches));
    setState(s);
    await sleep(500 * spd);
    for (let round = 0; round < 4; round++) {
      const { state: flagged, retaliations } = collectRetaliations(s);
      s = flagged;
      setState(s);
      if (retaliations.length === 0) break;
      for (const group of groupRetaliations(retaliations)) {
        setRetaliationBy(group.from);
        setCurrentAttacker(group.from);
        klaxon(2);
        await sleep(1200 * spd);
        for (const r of group.orders) {
          s = await animateLaunch(s, r);
          await sleep(250 * spd);
        }
        setRetaliationBy(null);
        setCurrentAttacker(null);
        await sleep(400 * spd);
      }
    }
    s = finishRound(s);
    setState(s);
    return s;
  }

  async function endTurn() {
    if (runningRef.current || state.phase !== "orders") return;
    runningRef.current = true;
    setRunning(true);
    try {
      let s = stateRef.current;
      const alive = livingNations(s).filter((n) => n !== s.humanId);
      if (alive.length > 0) klaxon(1);
      for (const nid of alive) {
        if (s.nations[nid].eliminated) continue;
        s = await runNationTurn(s, nid, aiOrders(s, nid));
      }
      await runEndOfRound(s, turnLaunchesRef.current);
      turnLaunchesRef.current = 0;
      setCurrentAttacker(null);
      setRetaliationBy(null);
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }

  function restart() {
    clockRef.current?.clear();
    setAnimPaused(false);
    highscoreRecorded.current = false;
    setState(initialState(Date.now()));
    setSelectedCardId(null);
    setPendingSecret(null);
    setFlights([]);
    setBanner(null);
    setBudget({ launches: 0, diplomacy: 0, secrets: 0 });
    turnLaunchesRef.current = 0;
    setCurrentAttacker(null);
    setRetaliationBy(null);
    peakPopRef.current = { USA: 1, USSR: 1, CHINA: 1, EURO: 1 };
  }

  const hasWeapon = human.hand.some((c) => c.kind === "weapon");
  const hasPop = human.hand.some((c) => c.kind === "pop");
  const step: 1 | 2 | 3 = selectedWeapon || pendingSecret ? 2 : launchesLeft <= 0 || (!hasWeapon && !hasPop) ? 3 : 1;
  const hint = animating
    ? retaliationBy
      ? `${retaliationBy} IS EMPTYING ITS SILOS. STAND BY.`
      : currentAttacker && currentAttacker !== state.humanId
        ? `${currentAttacker} IS ACTING. WATCH THE BOARD.`
        : "TRACKING WARHEAD. STAND BY."
    : pendingSecret
      ? `CHOOSE WHICH NATION RECEIVES ${pendingSecret.name}.`
      : selectedWeapon
        ? `${selectedWeapon.name} IS ARMED — CLICK AN ENEMY CITY ON THE MAP.`
        : step === 3
          ? "NO ATTACKS LEFT. PRESS END TURN TO LET THE OTHER POWERS ACT."
          : launchesLeft > 0 && hasWeapon
            ? "CLICK A WEAPON CARD TO ARM IT, OR A POP CARD TO HOUSE CITIZENS."
            : "CLICK A POP CARD TO HOUSE CITIZENS, THEN END TURN.";

  return (
    <CRTScreen>
      <main className="relative z-10 flex min-h-[100dvh] w-full max-w-full flex-col gap-3 overflow-x-hidden px-4 lg:h-[100dvh]" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "max(1rem, env(safe-area-inset-right))" }}>
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs uppercase tracking-[0.3em] text-phosphor-dim">
          <Link to="/" className="hover:text-phosphor">&lt; ABORT</Link>
          <span className="text-glow text-phosphor">STRATEGIC AIR COMMAND — TURN {state.turn}{animating && currentAttacker && <span className={`ml-3 animate-pulse ${currentAttacker === state.humanId ? "text-phosphor text-glow" : "text-alert text-glow-alert"}`}>▶ NOW ACTING: {currentAttacker}{currentAttacker === state.humanId ? " (YOU)" : ""}</span>}{animating && !currentAttacker && <span className="ml-3 text-alert text-glow-alert animate-pulse">MISSILES INBOUND</span>}</span>
          <div className="flex items-center gap-2 font-mono text-[10px] normal-case tracking-widest">
            <span className="text-phosphor-dim">SIM SPEED</span>
            <input type="range" min={0.1} max={2} step={0.05} value={animSpeed} onChange={(e) => setAnimSpeed(parseFloat(e.target.value))} aria-label="Simulation speed" className="h-1 w-24 cursor-pointer accent-phosphor lg:w-32" />
            <span className="w-10 text-right text-phosphor text-glow tabular-nums">{animSpeed.toFixed(2)}×</span>
            {([0.25, 0.5, 1, 2] as const).map((s) => <button key={s} type="button" onClick={() => setAnimSpeed(s)} aria-pressed={animSpeed === s} className={`border px-1.5 py-0.5 ${animSpeed === s ? "border-phosphor bg-phosphor/20 text-phosphor text-glow" : "border-phosphor/40 bg-black/60 text-phosphor/70 hover:bg-phosphor/10"}`}>{s === 1 ? "1×" : s === 0.5 ? "½×" : s === 0.25 ? "¼×" : "2×"}</button>)}
            <button type="button" onClick={() => setAnimPaused((p) => !p)} disabled={!animating} aria-pressed={animPaused} className={`ml-1 border px-2 py-0.5 ${animPaused ? "border-alert bg-alert/20 text-alert text-glow-alert" : "border-phosphor/40 bg-black/60 text-phosphor/70 hover:bg-phosphor/10"} disabled:opacity-40 disabled:hover:bg-black/60`}>{animPaused ? "▶ RESUME" : "❚❚ PAUSE"}</button>
          </div>
          <span className={DEFCON_COLOR[state.defcon]}>DEFCON {state.defcon}</span>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
          <section className="flex min-h-0 flex-col gap-3">
            <div className="terminal-panel relative min-h-[42vh] flex-1 rounded-sm p-2">
              <div className="h-full w-full"><WorldMap state={state} selectedCardId={selectedWeapon?.id ?? null} onTargetCity={onTargetCity} flights={flights} onFlightsComplete={onFlightsComplete} animSpeed={animSpeed} animPaused={animPaused} /></div>
              {selectedWeapon && <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex max-w-[92%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 border-2 border-alert bg-black/90 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-alert text-glow-alert shadow-[0_0_18px_rgba(255,0,0,0.5)]"><span className="animate-pulse">◉ ARMED:</span><span>{selectedWeapon.name}</span><span className="text-phosphor-dim">— CLICK ENEMY CITY</span><button onClick={() => setSelectedCardId(null)} className="border border-phosphor-dim px-2 py-0.5 text-phosphor-dim hover:border-alert hover:text-alert">✕ CANCEL</button></div>}
              {pendingSecret && <div className="absolute inset-x-2 top-3 z-30 mx-auto max-w-md border border-amber bg-black/90 p-3 text-xs text-amber text-glow-amber"><div className="font-bold uppercase tracking-widest">{pendingSecret.name} — SELECT TARGET</div><p className="mt-1 text-phosphor-dim">{pendingSecret.flavor}</p><div className="mt-2 flex flex-wrap gap-1">{enemies.map((nid) => <button key={nid} onClick={() => pickSecretTarget(nid)} className="border border-amber px-2 py-1 uppercase tracking-widest hover:bg-amber/20">{nid}</button>)}<button onClick={() => setPendingSecret(null)} className="ml-auto border border-phosphor-dim px-2 py-1 uppercase tracking-widest text-phosphor-dim hover:text-alert">CANCEL</button></div></div>}
              {retaliationBy && <div className="pointer-events-none absolute inset-x-4 top-1/3 z-30 mx-auto max-w-lg border-2 border-alert bg-black/90 p-3 text-center text-alert text-glow-alert"><div className="text-[10px] uppercase tracking-[0.4em]">☢ FINAL RETALIATION ☢</div><div className="display mt-1 text-xl">{retaliationBy} EMPTIES ITS SILOS</div><div className="mt-1 text-xs text-phosphor-dim">Population zero. Every remaining warhead is in the air.</div></div>}
              {banner && !retaliationBy && <div className="pointer-events-none absolute inset-x-4 top-16 z-30 mx-auto max-w-lg border-2 border-amber bg-black/90 p-3 text-center text-amber text-glow-amber animate-[fade-in_0.3s_ease-out]"><div className="text-[10px] uppercase tracking-[0.4em]">⚠ {banner.from} DECLASSIFIES ⚠</div><div className="display mt-1 text-xl">{banner.name}</div><div className="mt-1 text-xs text-phosphor-dim">{banner.flavor}</div></div>}
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(Object.keys(state.nations) as NationId[]).map((nid) => {
                const n = state.nations[nid];
                const pop = population(state, nid);
                const peak = Math.max(1, peakPopRef.current[nid]);
                const pct = Math.max(0, Math.min(100, (pop / peak) * 100));
                const you = nid === state.humanId;
                const barColor = pct > 60 ? "bg-phosphor" : pct > 25 ? "bg-amber" : "bg-alert";
                return <div key={nid} className={`terminal-panel rounded-sm p-3 text-xs ${n.eliminated ? "opacity-40" : ""} ${you ? "ring-1 ring-amber/60" : ""} ${currentAttacker === nid ? "ring-2 ring-alert" : ""}`}><div className="flex items-center justify-between"><span className="display text-base text-phosphor text-glow">{nid}</span>{you && <span className="text-[10px] uppercase tracking-widest text-amber text-glow-amber">◄ YOU</span>}</div><div className="mt-1 flex items-center justify-between text-phosphor-dim"><span>POP <span className="text-phosphor">{pop}M</span><span className="opacity-60"> / {peak}M</span></span>{n.eliminated && <span className="text-alert text-glow-alert">GONE</span>}</div><div className="mt-1 h-1.5 w-full border border-phosphor/30 bg-black/60"><div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%`, boxShadow: "0 0 6px currentColor" }} /></div><div className="mt-1 flex items-center justify-between text-phosphor-dim"><span>HAND {n.hand.length}</span>{n.abmShields > 0 && <span className="text-amber text-glow-amber">🛡 ×{n.abmShields}</span>}</div></div>;
              })}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-3 lg:h-full lg:overflow-y-auto lg:pr-1">
            {state.phase === "gameover" ? <div className="terminal-panel rounded-sm p-4"><div className="display text-2xl text-alert text-glow-alert">SIMULATION HALTED</div><div className="mt-2 text-phosphor">{state.winner === "NONE" ? "NOBODY WINS NUCLEAR WAR." : state.winner === state.humanId ? `${state.winner} STANDS ALONE. YOU WIN — TECHNICALLY.` : `${state.winner} STANDS ALONE. YOU LOSE.`}</div><p className="mt-3 text-xs uppercase tracking-[0.3em] text-amber text-glow-amber">A strange game. The only winning move is not to play.</p><div className="mt-2 font-mono text-[10px] text-phosphor-dim">SEED {state.seed} · SURVIVED {state.turn} TURNS</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={restart} className="terminal-panel px-3 py-2 text-xs uppercase tracking-[0.25em] text-phosphor hover:bg-phosphor/10">&gt; RUN NEW SIMULATION</button><Link to="/highscore" className="terminal-panel px-3 py-2 text-xs uppercase tracking-[0.25em] text-phosphor hover:bg-phosphor/10">&gt; HIGHSCORES</Link></div></div> : <>
              <StepGuide step={step} hint={hint} />
              <div className="terminal-panel flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm px-3 py-2 text-xs"><span className="text-[10px] uppercase tracking-[0.25em] text-phosphor-dim">LEFT THIS TURN</span><span className={diplomacyLeft > 0 ? "text-phosphor" : "text-phosphor-dim opacity-50"}>DIPL {diplomacyLeft}/{ACTION_BUDGET.diplomacy}</span><span className={launchesLeft > 0 ? "text-alert text-glow-alert" : "text-phosphor-dim opacity-50"}>LAUNCH {launchesLeft}/{ACTION_BUDGET.launch}</span><span className={secretsLeft > 0 ? "text-amber text-glow-amber" : "text-phosphor-dim opacity-50"}>SECRET {secretsLeft}/{ACTION_BUDGET.secret}</span><span className="text-[10px] uppercase tracking-[0.15em] text-phosphor-dim">POP UNLIMITED</span></div>
              <div className="terminal-panel rounded-sm p-3"><div className="flex flex-wrap items-center justify-between gap-1"><div className="text-[10px] uppercase tracking-[0.3em] text-phosphor-dim">YOUR HAND — {human.hand.length} CARDS</div><div className="text-[10px] uppercase tracking-[0.2em] text-amber text-glow-amber">▼ CLICK A CARD TO PLAY</div></div><div className="mt-2 flex flex-wrap gap-2">{human.hand.map((c) => {
                const isSelected = c.id === selectedCardId || c.id === pendingSecret?.id;
                const disabled = running || (c.kind === "weapon" && launchesLeft <= 0) || (c.kind === "secret" && secretsLeft <= 0);
                const reason = c.kind === "weapon" && launchesLeft <= 0 ? "No launches left this turn" : c.kind === "secret" && secretsLeft <= 0 ? "No secrets left this turn" : undefined;
                return <HandCard key={c.id} card={c} selected={isSelected} used={false} disabled={disabled} disabledReason={reason} onClick={() => onCardClick(c)} />;
              })}</div></div>
              <div className="terminal-panel rounded-sm p-3"><div className="text-[10px] uppercase tracking-[0.3em] text-phosphor-dim">PROPAGANDA {diplomacyLeft <= 0 && "(SPENT)"}</div><div className="mt-2 flex flex-wrap gap-1">{enemies.map((nid) => <button key={nid} disabled={diplomacyLeft <= 0 || running} onClick={() => void playHumanOrder({ kind: "propaganda", from: state.humanId, target: nid })} className="rounded-sm border border-border px-2 py-1 text-xs text-phosphor hover:border-phosphor hover:text-glow disabled:opacity-40 disabled:hover:border-border">{nid}</button>)}</div></div>
              <button onClick={endTurn} disabled={running} className={`terminal-panel rounded-sm px-3 py-3 text-sm uppercase tracking-[0.3em] transition ${running ? "border-phosphor/40 text-phosphor-dim" : `border-alert bg-alert/10 text-alert text-glow-alert hover:bg-alert/20 ${step === 3 ? "animate-pulse" : ""}`} disabled:opacity-60`}>&gt;&gt; END TURN<div className="mt-1 text-[10px] tracking-widest text-phosphor-dim">{running ? "OTHER POWERS ARE ACTING…" : "YOUR ORDERS FIRE INSTANTLY — END TURN HANDS THE BOARD OVER"}</div></button>
            </>}
            <div className="terminal-panel shrink-0 rounded-sm p-3"><div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-phosphor-dim"><span>TELEX FEED</span><span className="font-mono tracking-normal opacity-70">SEED {state.seed}</span></div><div className="mt-2 h-40 space-y-1 overflow-y-auto pr-1 text-xs lg:h-44">{[...state.log].slice(-40).reverse().map((l, i) => <div key={i} className={l.tone === "alert" ? "text-alert text-glow-alert" : l.tone === "warn" ? "text-amber text-glow-amber" : "text-phosphor-dim"}><span className="opacity-60">T{l.turn}&gt;</span> {l.text}</div>)}</div></div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-phosphor-dim">YOUR POP {humanPop}M &middot; {enemies.length} HOSTILE</div>
          </aside>
        </div>
      </main>
    </CRTScreen>
  );
}