import { describe, expect, it } from "vitest";
import {
  applyFallout,
  applyLaunch,
  applyOrder,
  collectRetaliations,
  groupRetaliations,
  initialState,
  population,
} from "../src/game/engine";
import type { GameState, NationId, PopulationCard, WeaponCard } from "../src/game/types";

function giveWeapon(
  s: GameState,
  nid: NationId,
  yieldMt = 50,
  vehicle: WeaponCard["vehicle"] = "ICBM",
): WeaponCard {
  const card: WeaponCard = {
    kind: "weapon",
    id: `w-${nid}-${yieldMt}-${vehicle}-${s.nations[nid].hand.length}`,
    name: `TEST NUKE + ${yieldMt}MT`,
    yield: yieldMt,
    vehicle,
  };
  s.nations[nid].hand.push(card);
  return card;
}

function findSeed(
  reason: string,
  build: (s: GameState) => { from: NationId; cardId: string; targetCityId: string },
  opts: { vehicle?: WeaponCard["vehicle"]; defcon?: GameState["defcon"] } = {},
) {
  for (let seed = 1; seed < 4000; seed++) {
    const s = initialState(seed);
    if (opts.defcon) s.defcon = opts.defcon;
    const order = build(s);
    const { state, result } = applyLaunch(s, { kind: "launch", ...order });
    if (result.reason === reason) return { seed, before: s, state, result };
  }
  throw new Error(`no seed produced reason=${reason}`);
}

describe("authoritative launch results", () => {
  it("reports a plain direct hit with matching damage", () => {
    const s = initialState(4242);
    const w = giveWeapon(s, "USA", 10);
    const target = s.cities.find((c) => c.id === "USSR-MOSCOW")!;
    const { state, result } = applyLaunch(s, {
      kind: "launch",
      from: "USA",
      cardId: w.id,
      targetCityId: "USSR-MOSCOW",
    });
    if (result.outcome !== "hit") return;
    const after = state.cities.find((c) => c.id === result.impactCityId)!;
    const beforeCity = s.cities.find((c) => c.id === result.impactCityId)!;
    expect(result.impactCityId).toBe(target.id);
    expect(beforeCity.population - after.population).toBe(result.damage);
  });

  it("guidance fault reports the ACTUAL impact city, and the damage lands there", () => {
    const { seed, before, state, result } = findSeed("guidance-fault", (s) => ({
      from: "USA",
      cardId: giveWeapon(s, "USA", 10).id,
      targetCityId: "USSR-MOSCOW",
    }));
    expect(seed).toBeGreaterThan(0);
    expect(result.outcome).toBe("hit");
    expect(result.impactCityId).not.toBe(result.requestedCityId);
    const requestedBefore = before.cities.find((c) => c.id === result.requestedCityId)!;
    const requestedAfter = state.cities.find((c) => c.id === result.requestedCityId)!;
    expect(requestedBefore.population - requestedAfter.population).toBeLessThan(result.damage);
    const impactBefore = before.cities.find((c) => c.id === result.impactCityId)!;
    const impactAfter = state.cities.find((c) => c.id === result.impactCityId)!;
    expect(impactBefore.population - impactAfter.population).toBe(result.damage);
    expect(result.damage).toBeGreaterThan(0);
    expect(state.cities.some((c) => c.id === result.impactCityId)).toBe(true);
  });

  it("SAM intercept reports intercept metadata and leaves the target untouched", () => {
    const { before, state, result } = findSeed(
      "sam",
      (s) => ({
        from: "USA",
        cardId: giveWeapon(s, "USA", 20, "BOMBER").id,
        targetCityId: "USSR-MOSCOW",
      }),
      { defcon: 1 },
    );
    expect(result.outcome).toBe("intercept");
    expect(result.impactCityId).toBe("USSR-MOSCOW");
    expect(result.damage).toBe(0);
    expect(population(state, "USSR")).toBe(population(before, "USSR"));
  });

  it("ABM shield intercept consumes one shield and deals no damage", () => {
    const s = initialState(777);
    s.nations.USSR.abmShields = 1;
    const w = giveWeapon(s, "USA", 40);
    const { state, result } = applyLaunch(s, {
      kind: "launch",
      from: "USA",
      cardId: w.id,
      targetCityId: "USSR-MOSCOW",
    });
    expect(result).toMatchObject({ outcome: "intercept", reason: "abm", impactCityId: "USSR-MOSCOW", damage: 0 });
    expect(state.nations.USSR.abmShields).toBe(0);
    expect(population(state, "USSR")).toBe(population(s, "USSR"));
  });

  it("wasted-on-rubble and friendly airspace are distinguishable", () => {
    const s = initialState(31337);
    for (const c of s.cities) if (c.id === "USSR-MOSCOW") c.population = 0;
    const rubble = applyLaunch(s, {
      kind: "launch",
      from: "USA",
      cardId: giveWeapon(s, "USA", 20).id,
      targetCityId: "USSR-MOSCOW",
    });
    expect(rubble.result).toMatchObject({ outcome: "wasted", reason: "rubble" });
    const friendly = applyLaunch(s, {
      kind: "launch",
      from: "USA",
      cardId: giveWeapon(s, "USA", 20).id,
      targetCityId: "USA-CHICAGO",
    });
    expect(friendly.result).toMatchObject({ outcome: "aborted", reason: "friendly-airspace", impactCityId: null });
  });

  it("discards the weapon exactly once and never resolves twice", () => {
    const s = initialState(99);
    const w = giveWeapon(s, "USA", 15);
    const handBefore = s.nations.USA.hand.length;
    const discardBefore = s.discard.length;
    const { state } = applyLaunch(s, {
      kind: "launch",
      from: "USA",
      cardId: w.id,
      targetCityId: "USSR-LENINGRAD",
    });
    expect(state.nations.USA.hand.length).toBe(handBefore - 1);
    expect(state.discard.length).toBe(discardBefore + 1);
    expect(state.discard.filter((c) => c.id === w.id).length).toBe(1);
    expect(s.nations.USA.hand.length).toBe(handBefore);
  });

  it("save/resume preserves the next launch result exactly", () => {
    const s = initialState(20260730);
    const w = giveWeapon(s, "USA", 25);
    const resumed: GameState = JSON.parse(JSON.stringify(s));
    const a = applyLaunch(s, { kind: "launch", from: "USA", cardId: w.id, targetCityId: "CHINA-SHANGHAI" });
    const b = applyLaunch(resumed, { kind: "launch", from: "USA", cardId: w.id, targetCityId: "CHINA-SHANGHAI" });
    expect(b.result).toEqual(a.result);
    expect(b.state).toEqual(a.state);
  });
});

describe("population cards", () => {
  it("files the full card amount, including the 25M card", () => {
    for (const amount of [5, 10, 15, 20, 25]) {
      const s = initialState(555);
      const card: PopulationCard = { kind: "pop", id: `pop-${amount}`, name: `${amount}M TEST CITIZENS`, amount };
      s.nations.USA.hand.push(card);
      const before = population(s, "USA");
      const after = applyOrder(s, { kind: "playPop", from: "USA", cardId: card.id });
      expect(population(after, "USA") - before).toBe(amount);
    }
  });
});

describe("simultaneous Final Retaliation", () => {
  it("groups two eliminated nations into two ordered sequences", () => {
    const s = initialState(8181);
    for (const c of s.cities) {
      if (c.nation === "USSR" || c.nation === "CHINA") {
        c.population = 1;
        c.fallout = 1;
      }
    }
    giveWeapon(s, "USSR", 20);
    giveWeapon(s, "USSR", 30);
    giveWeapon(s, "CHINA", 25);
    const dead = applyFallout(s);
    expect(population(dead, "USSR")).toBe(0);
    expect(population(dead, "CHINA")).toBe(0);
    const { state, retaliations } = collectRetaliations(dead);
    expect(state.nations.USSR.retaliating).toBe(true);
    expect(state.nations.CHINA.retaliating).toBe(true);
    const groups = groupRetaliations(retaliations);
    expect(groups.map((g) => g.from)).toEqual(["USSR", "CHINA"]);
    expect(groups[0].orders.every((o) => o.from === "USSR")).toBe(true);
    expect(groups[1].orders.every((o) => o.from === "CHINA")).toBe(true);
    expect(groups[0].orders.length + groups[1].orders.length).toBe(retaliations.length);
    expect(groupRetaliations(collectRetaliations(dead).retaliations)).toEqual(groups);
  });
});
