import { ACTION_BUDGET, livingNations, population } from "./engine";
import { hashSeed, hashString, makeRng, pick } from "./rng";
import type { GameState, NationId, Order, WeaponCard } from "./types";

export function aiRng(state: GameState, nid: NationId): () => number {
  return makeRng(hashSeed(state.seed, state.turn, hashString(nid)));
}

export function aiOrders(
  state: GameState,
  nid: NationId,
  rng: () => number = aiRng(state, nid),
): Order[] {
  const nation = state.nations[nid];
  const enemies = livingNations(state).filter((n) => n !== nid);
  if (enemies.length === 0) return [{ kind: "pass", from: nid }];

  const orders: Order[] = [];
  for (const card of nation.hand.filter((c) => c.kind === "pop")) {
    orders.push({ kind: "playPop", from: nid, cardId: card.id });
  }

  const secrets = nation.hand.filter((c) => c.kind === "secret");
  if (secrets.length > 0 && rng() < 0.55) {
    const s = pick(secrets, rng)!;
    const enemyTarget = pick(enemies, rng)!;
    orders.push({ kind: "playSecret", from: nid, cardId: s.id, target: enemyTarget });
  }

  const weapons = nation.hand.filter((c): c is WeaponCard => c.kind === "weapon");
  if (weapons.length === 0 || rng() < 0.3) {
    const target = enemies.reduce((best, n) =>
      population(state, n) > population(state, best) ? n : best,
    );
    orders.push({ kind: "propaganda", from: nid, target });
  }

  const sortedHand = [...weapons].sort((a, b) => b.yield - a.yield);
  const usedCards = new Set<string>();
  const cityHits = new Map<string, number>();
  const maxLaunches = Math.min(ACTION_BUDGET.launch, sortedHand.length);

  for (let i = 0; i < maxLaunches; i++) {
    if (state.defcon > 3 && rng() > 0.6) break;
    const card = sortedHand.find((c) => !usedCards.has(c.id));
    if (!card) break;
    const enemyCities = state.cities
      .filter((c) => enemies.includes(c.nation) && c.population > 0)
      .sort(
        (a, b) =>
          b.population - (cityHits.get(b.id) ?? 0) * 10 -
          (a.population - (cityHits.get(a.id) ?? 0) * 10),
      );
    if (enemyCities.length === 0) break;
    const target = enemyCities[0];
    usedCards.add(card.id);
    cityHits.set(target.id, (cityHits.get(target.id) ?? 0) + 1);
    orders.push({ kind: "launch", from: nid, cardId: card.id, targetCityId: target.id });
  }

  if (orders.length === 0) orders.push({ kind: "pass", from: nid });
  return orders;
}