import { buildDeck, makeCard, pickTabloid } from "./cards";
import { project } from "./projection";
import { livingNations, population } from "./engine-utils";
import { hashSeed, makeRng, nextRand, pick, rngOf } from "./rng";
import { applySecret } from "./secrets";
import type {
  Card,
  City,
  GameState,
  LaunchResult,
  LogEntry,
  Nation,
  NationId,
  Order,
  SecretCard,
  WeaponCard,
} from "./types";

export { livingNations, population };

const NATIONS: {
  id: NationId;
  name: string;
  color: string;
  cities: { name: string; lat: number; lng: number; pop: number }[];
}[] = [
  {
    id: "USA",
    name: "UNITED STATES",
    color: "phosphor",
    cities: [
      { name: "WASHINGTON", lat: 38.9, lng: -77.04, pop: 25 },
      { name: "NEW YORK", lat: 40.71, lng: -74.01, pop: 40 },
      { name: "CHICAGO", lat: 41.88, lng: -87.63, pop: 30 },
      { name: "LOS ANGELES", lat: 34.05, lng: -118.24, pop: 35 },
    ],
  },
  {
    id: "USSR",
    name: "SOVIET UNION",
    color: "alert",
    cities: [
      { name: "MOSCOW", lat: 55.75, lng: 37.62, pop: 40 },
      { name: "LENINGRAD", lat: 59.93, lng: 30.34, pop: 25 },
      { name: "STALINGRAD", lat: 48.71, lng: 44.51, pop: 20 },
      { name: "VLADIVOSTOK", lat: 43.12, lng: 131.89, pop: 15 },
    ],
  },
  {
    id: "CHINA",
    name: "CHINA",
    color: "amber",
    cities: [
      { name: "BEIJING", lat: 39.9, lng: 116.41, pop: 40 },
      { name: "SHANGHAI", lat: 31.23, lng: 121.47, pop: 45 },
      { name: "CHONGQING", lat: 29.56, lng: 106.55, pop: 30 },
      { name: "GUANGZHOU", lat: 23.13, lng: 113.26, pop: 25 },
    ],
  },
  {
    id: "EURO",
    name: "EUROPE",
    color: "phosphor",
    cities: [
      { name: "LONDON", lat: 51.51, lng: -0.13, pop: 25 },
      { name: "PARIS", lat: 48.86, lng: 2.35, pop: 25 },
      { name: "BERLIN", lat: 52.52, lng: 13.4, pop: 20 },
      { name: "ROME", lat: 41.9, lng: 12.5, pop: 20 },
    ],
  },
];

export const NATION_META = NATIONS;
export const HAND_SIZE = 6;

export function initialState(seed = Date.now(), humanId: NationId = "USA"): GameState {
  const normalizedSeed = seed >>> 0;
  const rng = makeRng(normalizedSeed);
  const cities: City[] = [];
  const nations: Record<NationId, Nation> = {} as Record<NationId, Nation>;

  for (const n of NATIONS) {
    for (const c of n.cities) {
      const { x, y } = project(c.lat, c.lng);
      cities.push({
        id: `${n.id}-${c.name}`,
        name: c.name,
        nation: n.id,
        x,
        y,
        population: c.pop,
        fallout: 0,
      });
    }
    nations[n.id] = {
      id: n.id,
      name: n.name,
      color: n.color,
      isAI: n.id !== humanId,
      hand: [],
      eliminated: false,
      retaliating: false,
      abmShields: 0,
    };
  }

  const deck = buildDeck(80, rng);
  for (const nid of Object.keys(nations) as NationId[]) {
    nations[nid].hand = deck.splice(0, HAND_SIZE);
  }

  return {
    turn: 1,
    phase: "orders",
    defcon: 4,
    nations,
    cities,
    deck,
    discard: [],
    orders: [],
    log: [
      { turn: 1, text: "NORAD SIMULATION ONLINE. DEFCON 4.", tone: "info" },
      { turn: 1, text: "GREETINGS PROFESSOR FALKEN. SHALL WE PLAY?", tone: "info" },
    ],
    winner: null,
    humanId,
    lastSecretBanner: null,
    seed: normalizedSeed,
    rngState: hashSeed(normalizedSeed, 0x5eed),
  };
}

function log(state: GameState, text: string, tone: LogEntry["tone"] = "info") {
  state.log.push({ turn: state.turn, text, tone });
}

export const ACTION_BUDGET = {
  diplomacy: 1,
  launch: 2,
  secret: 1,
} as const;

export function applyOrder(prev: GameState, order: Order): GameState {
  if (order.kind === "launch") return applyLaunch(prev, order).state;
  const state: GameState = structuredClone(prev);
  if (order.kind === "playSecret") state.lastSecretBanner = null;
  const nation = state.nations[order.from];
  if (nation.eliminated && !nation.retaliating) return state;
  if (order.kind === "propaganda") resolvePropaganda(state, order);
  else if (order.kind === "playPop") resolvePlayPop(state, order);
  else if (order.kind === "playSecret") resolvePlaySecret(state, order);
  return state;
}

export function applyLaunch(
  prev: GameState,
  order: Extract<Order, { kind: "launch" }>,
): { state: GameState; result: LaunchResult } {
  const state: GameState = structuredClone(prev);
  const nation = state.nations[order.from];
  const idle: LaunchResult = {
    outcome: "aborted",
    from: order.from,
    requestedCityId: order.targetCityId,
    impactCityId: null,
    weaponName: "UNKNOWN",
    damage: 0,
    reason: "no-card",
  };
  if (nation.eliminated && !nation.retaliating) return { state, result: idle };
  const result = resolveLaunch(state, order) ?? idle;
  return { state, result };
}

export function applyDefconDrop(prev: GameState, launchesThisTurn: number): GameState {
  const state: GameState = structuredClone(prev);
  if (launchesThisTurn > 0 && state.defcon > 1) {
    state.defcon = Math.max(1, state.defcon - Math.min(2, launchesThisTurn)) as GameState["defcon"];
  }
  return state;
}

export function applyFallout(prev: GameState): GameState {
  const state: GameState = structuredClone(prev);
  const rng = rngOf(state);
  state.phase = "fallout";
  for (const city of state.cities) {
    if (city.fallout > 0 && city.population > 0) {
      const drain = Math.min(city.population, 3);
      city.population -= drain;
      city.fallout -= 1;
      if (drain > 0) log(state, `FALLOUT: ${city.name} loses ${drain}M. ${pickTabloid(rng)}`, "warn");
    }
  }
  return state;
}

export function collectRetaliations(prev: GameState): {
  state: GameState;
  retaliations: Extract<Order, { kind: "launch" }>[];
} {
  const state: GameState = structuredClone(prev);
  const rng = rngOf(state);
  const retaliations: Extract<Order, { kind: "launch" }>[] = [];
  for (const nid of Object.keys(state.nations) as NationId[]) {
    const n = state.nations[nid];
    if (n.eliminated || population(state, nid) > 0) continue;
    n.eliminated = true;
    n.retaliating = true;
    log(state, `${nid} POPULATION ZERO — FINAL RETALIATION INITIATED.`, "alert");
    const enemies = state.cities.filter((c) => c.nation !== nid && c.population > 0);
    for (const card of [...n.hand]) {
      if (card.kind !== "weapon") continue;
      if (enemies.length === 0) break;
      const target = pick(enemies, rng)!;
      retaliations.push({ kind: "launch", from: nid, cardId: card.id, targetCityId: target.id });
    }
  }
  return { state, retaliations };
}

export function groupRetaliations(
  retaliations: Extract<Order, { kind: "launch" }>[],
): { from: NationId; orders: Extract<Order, { kind: "launch" }>[] }[] {
  const order = NATIONS.map((n) => n.id);
  const groups: { from: NationId; orders: Extract<Order, { kind: "launch" }>[] }[] = [];
  for (const nid of order) {
    const orders = retaliations.filter((r) => r.from === nid);
    if (orders.length) groups.push({ from: nid, orders });
  }
  return groups;
}

export function finishRound(prev: GameState): GameState {
  const state: GameState = structuredClone(prev);
  for (const nid of Object.keys(state.nations) as NationId[]) state.nations[nid].retaliating = false;

  const rng = rngOf(state);
  for (const nid of Object.keys(state.nations) as NationId[]) {
    const n = state.nations[nid];
    if (n.eliminated) continue;
    while (n.hand.length < HAND_SIZE) n.hand.push(state.deck.shift() ?? makeCard(rng));
  }

  const alive = livingNations(state);
  if (alive.length === 0) {
    state.winner = "NONE";
    state.phase = "gameover";
    log(state, "A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY.", "alert");
  } else if (alive.length === 1) {
    state.winner = alive[0];
    state.phase = "gameover";
    log(state, `${alive[0]} STANDS ALONE ON A GLASSED PLANET.`, "warn");
  } else {
    state.turn += 1;
    state.phase = "orders";
    state.orders = [];
    log(state, `TURN ${state.turn} — AWAITING ORDERS.`, "info");
  }
  return state;
}

export function finalizeTurn(prev: GameState, launchesThisTurn: number): GameState {
  let state = applyFallout(applyDefconDrop(prev, launchesThisTurn));
  for (let round = 0; round < 4; round++) {
    const { state: flagged, retaliations } = collectRetaliations(state);
    state = flagged;
    if (retaliations.length === 0) break;
    for (const r of retaliations) state = applyOrder(state, r);
  }
  return finishRound(state);
}

function removeCard(hand: Card[], id: string): Card | undefined {
  const idx = hand.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  return hand.splice(idx, 1)[0];
}

function dist(a: City, b: City): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const INTERCEPT_BASE: Record<"ICBM" | "SLBM" | "BOMBER", number> = {
  ICBM: 0.05,
  SLBM: 0.1,
  BOMBER: 0.25,
};

function defconInterceptBonus(defcon: GameState["defcon"]): number {
  return [0, 0.25, 0.18, 0.1, 0.05, 0][defcon];
}

function resolveLaunch(
  state: GameState,
  order: Extract<Order, { kind: "launch" }>,
): LaunchResult | undefined {
  const attacker = state.nations[order.from];
  const raw = removeCard(attacker.hand, order.cardId);
  if (!raw || raw.kind !== "weapon") return undefined;
  const card = raw as WeaponCard;
  state.discard.push(card);

  const base = {
    from: order.from,
    requestedCityId: order.targetCityId,
    weaponName: card.name,
  } as const;

  const target = state.cities.find((c) => c.id === order.targetCityId);
  if (!target) {
    log(state, `${order.from} → ${card.name} lost — target vector invalid.`, "info");
    return { ...base, outcome: "aborted", impactCityId: null, damage: 0, reason: "invalid-target" };
  }

  if (target.nation === order.from) {
    log(state, `${order.from} → ${card.name} aborted (friendly airspace).`, "info");
    return { ...base, outcome: "aborted", impactCityId: null, damage: 0, reason: "friendly-airspace" };
  }

  const defender = state.nations[target.nation];
  if (defender.abmShields > 0) {
    defender.abmShields -= 1;
    log(state, `${target.nation} ABM SHIELD intercepts ${card.name} above ${target.name}.`, "info");
    return { ...base, outcome: "intercept", impactCityId: target.id, damage: 0, reason: "abm" };
  }

  if (target.population <= 0) {
    log(state, `${order.from} → ${card.name} wasted on rubble at ${target.name}.`, "info");
    target.fallout = Math.min(3, target.fallout + 1);
    return { ...base, outcome: "wasted", impactCityId: target.id, damage: 0, reason: "rubble" };
  }

  const interceptP = INTERCEPT_BASE[card.vehicle] + defconInterceptBonus(state.defcon);
  if (nextRand(state) < interceptP) {
    log(state, `${target.nation} SAM INTERCEPT: ${card.name} splashed en-route to ${target.name}.`, "info");
    return { ...base, outcome: "intercept", impactCityId: target.id, damage: 0, reason: "sam" };
  }

  let impact = target;
  let drifted = false;
  if (nextRand(state) < 0.1) {
    const neighbours = state.cities
      .filter((c) => c.id !== target.id && c.nation === target.nation)
      .sort((a, b) => dist(a, target) - dist(b, target));
    if (neighbours[0] && dist(neighbours[0], target) < 60) {
      impact = neighbours[0];
      drifted = true;
      log(state, `GUIDANCE FAULT: ${card.name} drifts from ${target.name} to ${impact.name}.`, "warn");
    }
  }

  const direct = Math.min(impact.population, card.yield);
  impact.population -= direct;
  impact.fallout = Math.min(3, impact.fallout + Math.ceil(card.yield / 20));
  log(
    state,
    `${order.from} → ${card.name} DIRECT HIT ${impact.name} (${impact.nation}). −${direct}M. ${pickTabloid(rngOf(state))}`,
    "alert",
  );

  const collateralYield = Math.floor(card.yield * 0.25);
  if (collateralYield > 0) {
    for (const c of state.cities) {
      if (c.id === impact.id || c.nation !== impact.nation) continue;
      const d = dist(c, impact);
      if (d > 55 || c.population <= 0) continue;
      const falloff = 1 - d / 55;
      const dmg = Math.min(c.population, Math.max(1, Math.floor(collateralYield * falloff)));
      c.population -= dmg;
      c.fallout = Math.min(3, c.fallout + 1);
      log(state, `  ↳ blast wave: ${c.name} −${dmg}M, fallout drifting.`, "warn");
    }
  }

  if (impact.population <= 0) log(state, `  ↳ ${impact.name} RAZED. Population zero.`, "alert");

  return {
    ...base,
    outcome: "hit",
    impactCityId: impact.id,
    damage: direct,
    reason: drifted ? "guidance-fault" : "direct",
  };
}

function resolvePropaganda(
  state: GameState,
  order: Extract<Order, { kind: "propaganda" }>,
) {
  const rng = rngOf(state);
  const targetCities = state.cities.filter((c) => c.nation === order.target && c.population > 0);
  if (targetCities.length === 0) {
    log(state, `${order.from} PROPAGANDA vs ${order.target} — no living audience.`, "info");
    return;
  }
  const city = pick(targetCities, rng)!;
  const stolen = Math.min(city.population, 3 + Math.floor(rng() * 5));
  city.population -= stolen;
  log(state, `${order.from} PROPAGANDA against ${order.target}: ${stolen}M defect from ${city.name}.`, "warn");
}

function resolvePlayPop(
  state: GameState,
  order: Extract<Order, { kind: "playPop" }>,
) {
  const nation = state.nations[order.from];
  const raw = removeCard(nation.hand, order.cardId);
  if (!raw || raw.kind !== "pop") return;
  state.discard.push(raw);

  const own = state.cities
    .filter((c) => c.nation === order.from)
    .sort((a, b) => a.population - b.population);
  if (own.length === 0) return;

  let remaining = raw.amount;
  let i = 0;
  while (remaining > 0) {
    own[i % own.length].population += 1;
    remaining -= 1;
    i += 1;
  }

  log(state, `${order.from} welcomes ${raw.name}. +${raw.amount}M citizens filed.`, "info");
}

function resolvePlaySecret(
  state: GameState,
  order: Extract<Order, { kind: "playSecret" }>,
) {
  const nation = state.nations[order.from];
  const raw = removeCard(nation.hand, order.cardId);
  if (!raw || raw.kind !== "secret") return;
  const card = raw as SecretCard;
  state.discard.push(card);

  state.lastSecretBanner = { from: order.from, name: card.name, flavor: card.flavor };
  log(state, `⚠ ${order.from} DECLASSIFIES: ${card.name}. ${card.flavor}`, "warn");
  const detail = applySecret(state, order.from, card, order.target);
  log(state, `  ↳ ${detail}`, "info");
}