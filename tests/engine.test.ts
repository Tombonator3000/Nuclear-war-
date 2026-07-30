import { describe, expect, it } from "vitest";
import {
  applyDefconDrop,
  applyFallout,
  applyOrder,
  collectRetaliations,
  finalizeTurn,
  finishRound,
  initialState,
  population,
} from "../src/game/engine";
import { aiOrders } from "../src/game/ai";
import type { GameState, NationId, Order, WeaponCard } from "../src/game/types";

const SEED = 424242;

function weaponOf(s: GameState, nid: NationId): WeaponCard | undefined {
  return s.nations[nid].hand.find((c): c is WeaponCard => c.kind === "weapon");
}

function giveWeapon(s: GameState, nid: NationId, yieldMt = 50): WeaponCard {
  const card: WeaponCard = {
    kind: "weapon",
    id: `test-w-${nid}-${yieldMt}-${s.nations[nid].hand.length}`,
    name: `TEST NUKE + ${yieldMt}MT`,
    yield: yieldMt,
    vehicle: "ICBM",
  };
  s.nations[nid].hand.push(card);
  return card;
}

describe("seeded determinism", () => {
  it("produces identical initial states for the same seed", () => {
    expect(initialState(SEED)).toEqual(initialState(SEED));
  });

  it("produces different initial states for different seeds", () => {
    expect(initialState(SEED)).not.toEqual(initialState(SEED + 1));
  });

  it("replays an identical order sequence to an identical state", () => {
    const build = () => {
      let s = initialState(SEED);
      const w = giveWeapon(s, "USA", 30);
      const orders: Order[] = [
        { kind: "propaganda", from: "USA", target: "USSR" },
        { kind: "launch", from: "USA", cardId: w.id, targetCityId: "USSR-MOSCOW" },
        { kind: "launch", from: "CHINA", cardId: giveWeapon(s, "CHINA", 40).id, targetCityId: "USA-NEW YORK" },
      ];
      for (const o of orders) s = applyOrder(s, o);
      return finalizeTurn(s, 2);
    };
    expect(build()).toEqual(build());
  });

  it("never falls back to unseeded randomness in the AI", () => {
    const s = initialState(SEED);
    expect(aiOrders(s, "USSR")).toEqual(aiOrders(s, "USSR"));
    const later = { ...s, turn: 5 };
    expect(JSON.stringify(aiOrders(later, "USSR"))).not.toBe(JSON.stringify(aiOrders(s, "CHINA")));
  });

  it("advances the rng cursor when a roll happens", () => {
    const s = initialState(SEED);
    const after = applyOrder(s, { kind: "propaganda", from: "USA", target: "USSR" });
    expect(after.rngState).not.toBe(s.rngState);
  });
});

describe("launch resolution", () => {
  it("aborts friendly fire and keeps the target intact", () => {
    const s = initialState(SEED);
    const w = giveWeapon(s, "USA", 40);
    const before = population(s, "USA");
    const after = applyOrder(s, { kind: "launch", from: "USA", cardId: w.id, targetCityId: "USA-CHICAGO" });
    expect(population(after, "USA")).toBe(before);
    expect(after.log.at(-1)!.text).toContain("friendly airspace");
  });

  it("consumes an ABM shield instead of taking damage", () => {
    const s = initialState(SEED);
    s.nations.USSR.abmShields = 1;
    const w = giveWeapon(s, "USA", 100);
    const before = population(s, "USSR");
    const after = applyOrder(s, { kind: "launch", from: "USA", cardId: w.id, targetCityId: "USSR-MOSCOW" });
    expect(after.nations.USSR.abmShields).toBe(0);
    expect(population(after, "USSR")).toBe(before);
    expect(after.log.at(-1)!.text).toContain("ABM SHIELD");
  });

  it("kills population and spreads fallout on a direct hit", () => {
    let hit: GameState | null = null;
    for (let seed = 1; seed < 60 && !hit; seed++) {
      const s = initialState(seed);
      const w = giveWeapon(s, "USA", 100);
      const after = applyOrder(s, { kind: "launch", from: "USA", cardId: w.id, targetCityId: "USSR-MOSCOW" });
      if (population(after, "USSR") < population(s, "USSR")) hit = after;
    }
    expect(hit).not.toBeNull();
    const moscow = hit!.cities.find((c) => c.id === "USSR-MOSCOW")!;
    expect(moscow.population).toBe(0);
    expect(moscow.fallout).toBeGreaterThan(0);
  });

  it("discards the weapon card exactly once", () => {
    const s = initialState(SEED);
    const w = weaponOf(s, "USA") ?? giveWeapon(s, "USA", 20);
    const after = applyOrder(s, { kind: "launch", from: "USA", cardId: w.id, targetCityId: "USSR-MOSCOW" });
    expect(after.nations.USA.hand.find((c) => c.id === w.id)).toBeUndefined();
    expect(after.discard.filter((c) => c.id === w.id)).toHaveLength(1);
  });
});

describe("propaganda and secrets", () => {
  it("steals population from the target nation", () => {
    const s = initialState(SEED);
    const before = population(s, "CHINA");
    const after = applyOrder(s, { kind: "propaganda", from: "USA", target: "CHINA" });
    expect(population(after, "CHINA")).toBeLessThan(before);
  });

  it("raises an ABM shield from the ABM_SHIELD secret", () => {
    const s = initialState(SEED);
    s.nations.USA.hand.push({ kind: "secret", id: "sec-abm", secret: "ABM_SHIELD", name: "ANTI-BALLISTIC MISSILE", flavor: "test" });
    const after = applyOrder(s, { kind: "playSecret", from: "USA", cardId: "sec-abm" });
    expect(after.nations.USA.abmShields).toBe(1);
    expect(after.lastSecretBanner?.name).toBe("ANTI-BALLISTIC MISSILE");
  });
});

describe("fallout, elimination and Final Retaliation", () => {
  it("drains irradiated cities and decays the fallout counter", () => {
    const s = initialState(SEED);
    const city = s.cities.find((c) => c.id === "USA-CHICAGO")!;
    city.fallout = 2;
    const before = city.population;
    const after = applyFallout(s);
    const post = after.cities.find((c) => c.id === "USA-CHICAGO")!;
    expect(post.population).toBe(before - 3);
    expect(post.fallout).toBe(1);
  });

  it("flags a wiped nation and returns its retaliation launches", () => {
    const s = initialState(SEED);
    for (const c of s.cities) if (c.nation === "EURO") c.population = 0;
    s.nations.EURO.hand = [
      { kind: "weapon", id: "rw1", name: "LAST RESORT + 50MT", yield: 50, vehicle: "ICBM" },
      { kind: "weapon", id: "rw2", name: "SPITE + 20MT", yield: 20, vehicle: "SLBM" },
      { kind: "pop", id: "rp1", name: "1M TAX INSPECTORS", amount: 1 },
    ];
    const { state, retaliations } = collectRetaliations(s);
    expect(state.nations.EURO.eliminated).toBe(true);
    expect(state.nations.EURO.retaliating).toBe(true);
    expect(retaliations).toHaveLength(2);
    expect(retaliations.every((r) => r.from === "EURO")).toBe(true);
    const resolved = applyOrder(state, retaliations[0]);
    expect(resolved.discard.some((c) => c.id === retaliations[0].cardId)).toBe(true);
  });

  it("finalizeTurn matches the step-by-step pipeline the UI drives", () => {
    const build = () => {
      const s = initialState(SEED);
      for (const c of s.cities) if (c.nation === "EURO") c.population = 0;
      s.nations.EURO.hand = [{ kind: "weapon", id: "rw1", name: "LAST RESORT + 50MT", yield: 50, vehicle: "ICBM" }];
      return s;
    };
    const headless = finalizeTurn(build(), 1);
    let s = applyFallout(applyDefconDrop(build(), 1));
    for (let i = 0; i < 4; i++) {
      const { state, retaliations } = collectRetaliations(s);
      s = state;
      if (retaliations.length === 0) break;
      for (const r of retaliations) s = applyOrder(s, r);
    }
    expect(finishRound(s)).toEqual(headless);
  });

  it("declares a single survivor the winner", () => {
    const s = initialState(SEED);
    for (const nid of ["USSR", "CHINA", "EURO"] as NationId[]) {
      s.nations[nid].eliminated = true;
      s.nations[nid].hand = [];
      for (const c of s.cities) if (c.nation === nid) c.population = 0;
    }
    const done = finishRound(s);
    expect(done.winner).toBe("USA");
    expect(done.phase).toBe("gameover");
  });

  it("declares mutual destruction when nobody is left", () => {
    const s = initialState(SEED);
    for (const nid of Object.keys(s.nations) as NationId[]) {
      s.nations[nid].eliminated = true;
      s.nations[nid].hand = [];
    }
    for (const c of s.cities) c.population = 0;
    const done = finishRound(s);
    expect(done.winner).toBe("NONE");
    expect(done.phase).toBe("gameover");
  });

  it("refills hands to six cards for survivors only", () => {
    const s = initialState(SEED);
    s.nations.USA.hand = [];
    s.nations.EURO.eliminated = true;
    s.nations.EURO.hand = [];
    const done = finishRound(s);
    expect(done.nations.USA.hand).toHaveLength(6);
    expect(done.nations.EURO.hand).toHaveLength(0);
    expect(done.turn).toBe(2);
  });
});

describe("DEFCON", () => {
  it("escalates by at most two steps per round and floors at 1", () => {
    const s = initialState(SEED);
    expect(applyDefconDrop(s, 0).defcon).toBe(4);
    expect(applyDefconDrop(s, 1).defcon).toBe(3);
    expect(applyDefconDrop(s, 5).defcon).toBe(2);
    const low = { ...s, defcon: 1 as const };
    expect(applyDefconDrop(low, 3).defcon).toBe(1);
  });
});

describe("full seeded playthrough", () => {
  it("always terminates and reaches a valid outcome", () => {
    let s = initialState(9001);
    let turns = 0;
    while (!s.winner && turns < 60) {
      let launches = 0;
      for (const nid of Object.keys(s.nations) as NationId[]) {
        if (s.nations[nid].eliminated) continue;
        for (const o of aiOrders(s, nid)) {
          if (o.kind === "pass") continue;
          if (o.kind === "launch") launches++;
          s = applyOrder(s, o);
        }
      }
      s = finalizeTurn(s, launches);
      turns++;
    }
    expect(s.winner).not.toBeNull();
    expect(["gameover"]).toContain(s.phase);
  });
});

describe("save / resume continuation", () => {
  it("resumes from a serialized save and produces the identical next outcome", () => {
    const base = initialState(SEED);
    const card = giveWeapon(base, "USA", 40);
    const revived: GameState = JSON.parse(JSON.stringify(base));
    const order: Order = { kind: "launch", from: "USA", cardId: card.id, targetCityId: "USSR-MOSCOW" };
    const a = applyOrder(base, order);
    const b = applyOrder(revived, order);
    expect(b.rngState).toBe(a.rngState);
    expect(JSON.stringify(b.cities)).toBe(JSON.stringify(a.cities));
    expect(b.log.at(-1)?.text).toBe(a.log.at(-1)?.text);
  });

  it("keeps AI decisions identical across a save round-trip", () => {
    const s = initialState(SEED);
    const revived: GameState = JSON.parse(JSON.stringify(s));
    expect(aiOrders(revived, "USSR")).toEqual(aiOrders(s, "USSR"));
  });
});

describe("retaliation queue → finalization", () => {
  function wipedState() {
    const s = initialState(SEED);
    for (const c of s.cities) if (c.nation === "EURO") c.population = 0;
    s.nations.EURO.hand = [];
    giveWeapon(s, "EURO", 30);
    giveWeapon(s, "EURO", 30);
    return s;
  }

  it("queues one launch per remaining weapon and does not resolve them itself", () => {
    const s = wipedState();
    const before = JSON.stringify(s.cities);
    const { state, retaliations } = collectRetaliations(s);
    expect(retaliations).toHaveLength(2);
    expect(state.nations.EURO.eliminated).toBe(true);
    expect(state.nations.EURO.retaliating).toBe(true);
    expect(JSON.stringify(state.cities)).toBe(before);
  });

  it("only finalizes after the queued launches are applied", () => {
    const s = wipedState();
    const { state, retaliations } = collectRetaliations(s);
    let cur = state;
    expect(cur.phase).not.toBe("gameover");
    for (const r of retaliations) cur = applyOrder(cur, r);
    expect(cur.nations.EURO.hand.filter((c) => c.kind === "weapon")).toHaveLength(0);
    const done = finishRound(cur);
    expect(done.nations.EURO.retaliating).toBe(false);
    expect(collectRetaliations(done).retaliations).toHaveLength(0);
  });

  it("reaches mutual destruction when the last two nations glass each other", () => {
    let s = initialState(SEED);
    for (const c of s.cities) {
      if (c.nation === "CHINA" || c.nation === "EURO") c.population = 0;
    }
    s.nations.CHINA.eliminated = true;
    s.nations.EURO.eliminated = true;
    for (const c of s.cities) if (c.nation === "USA" || c.nation === "USSR") c.population = 0;
    s = finalizeTurn(s, 2);
    expect(s.phase).toBe("gameover");
    expect(s.winner).toBe("NONE");
  });
});
