import type { GameState, NationId } from "./types";

export function population(state: GameState, nid: NationId): number {
  return state.cities
    .filter((c) => c.nation === nid)
    .reduce((s, c) => s + c.population, 0);
}

export function livingNations(state: GameState): NationId[] {
  return (Object.keys(state.nations) as NationId[]).filter(
    (n) => !state.nations[n].eliminated,
  );
}