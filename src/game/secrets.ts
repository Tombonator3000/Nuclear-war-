import type { GameState, NationId, SecretCard } from "./types";
import { livingNations } from "./engine-utils";
import { pick, rngOf } from "./rng";

export function applySecret(
  state: GameState,
  from: NationId,
  card: SecretCard,
  target?: NationId,
): string {
  const rng = rngOf(state);
  const enemies = livingNations(state).filter((n) => n !== from);

  switch (card.secret) {
    case "PROPAGANDA_COUP": {
      const t = target ?? pick(enemies, rng);
      if (!t) return `${from} PROPAGANDA COUP fizzles — no audience.`;
      const cities = state.cities.filter((c) => c.nation === t && c.population > 0);
      const city = pick(cities, rng);
      if (!city) return `${from} PROPAGANDA COUP wasted — ${t} is rubble.`;
      const stolen = Math.min(city.population, 15);
      city.population -= stolen;
      return `${from} PROPAGANDA COUP: ${stolen}M defect from ${city.name}.`;
    }
    case "DEFECTOR": {
      const t = target ?? pick(enemies, rng);
      if (!t) return `${from} DEFECTOR gets lost — no border.`;
      const victim = state.nations[t];
      if (victim.hand.length === 0) return `${from} DEFECTOR arrives — ${t} has empty pockets.`;
      const idx = Math.floor(rng() * victim.hand.length);
      const stolen = victim.hand.splice(idx, 1)[0];
      state.nations[from].hand.push(stolen);
      return `${from} DEFECTOR steals "${stolen.name}" from ${t}.`;
    }
    case "TOP_SECRET": {
      const t = target ?? pick(enemies, rng);
      if (!t) return `${from} TOP SECRET LEAK — no one is listening.`;
      const victim = state.nations[t];
      const weapons = victim.hand.filter((c) => c.kind === "weapon");
      if (weapons.length === 0) return `${from} TOP SECRET vs ${t}: no warheads to leak.`;
      const biggest = weapons.reduce((a, b) =>
        b.kind === "weapon" && a.kind === "weapon" && b.yield > a.yield ? b : a,
      );
      victim.hand = victim.hand.filter((c) => c.id !== biggest.id);
      state.discard.push(biggest);
      return `${from} TOP SECRET declassifies ${t}'s "${biggest.name}". Scrapped.`;
    }
    case "ABM_SHIELD": {
      state.nations[from].abmShields += 1;
      return `${from} deploys ABM SHIELD. Interceptors on standby.`;
    }
    case "SUPER_GERM": {
      const t = target ?? pick(enemies, rng);
      if (!t) return `${from} SUPER-GERM — nowhere to sneeze.`;
      const cities = state.cities.filter((c) => c.nation === t && c.population > 0);
      const city = pick(cities, rng);
      if (!city) return `${from} SUPER-GERM lands in an empty city.`;
      city.fallout = Math.min(3, city.fallout + 3);
      const lost = Math.min(city.population, 6);
      city.population -= lost;
      return `${from} SUPER-GERM in ${city.name}: -${lost}M, fallout maxed.`;
    }
    case "WORLD_OPINION": {
      let total = 0;
      for (const nid of Object.keys(state.nations) as NationId[]) {
        const cities = state.cities.filter((c) => c.nation === nid && c.population > 0);
        if (cities.length === 0) continue;
        const c = pick(cities, rng)!;
        const loss = Math.min(c.population, 5);
        c.population -= loss;
        total += loss;
      }
      return `WORLD OPINION condemns ${from}. Everyone loses (${total}M total).`;
    }
    case "ACCIDENT": {
      const own = state.cities.filter((c) => c.nation === from && c.population > 0);
      const c = pick(own, rng);
      if (!c) return `${from} ACCIDENT — nothing left to break.`;
      const loss = Math.min(c.population, 8);
      c.population -= loss;
      c.fallout = Math.min(3, c.fallout + 1);
      return `${from} ACCIDENT: silo tech drops a wrench in ${c.name}. -${loss}M.`;
    }
    case "DETERRENT_POLICY": {
      state.nations[from].abmShields += 1;
      if (state.defcon < 5) state.defcon = (state.defcon + 1) as GameState["defcon"];
      return `${from} DETERRENT POLICY: hotline warms up. +1 shield, DEFCON eases.`;
    }
  }
  return `${from} SECRET ${(card as SecretCard).name} misfires.`;
}