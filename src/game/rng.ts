/**
 * Deterministic, reproducible randomness for the whole game.
 *
 * Every rule that rolls dice — intercepts, guidance faults, propaganda,
 * secrets, AI decisions, card draws — pulls from a seed stored *inside*
 * GameState (`rngState`). Because the state is cloned on every order, a
 * given (seed, order sequence) always produces the same outcome, which
 * makes bugs and balance issues reproducible.
 */

export interface RngHolder {
  rngState: number;
}

/** Advance the holder's stream and return a float in [0, 1). */
export function nextRand(holder: RngHolder): number {
  const a = (holder.rngState + 0x6d2b79f5) >>> 0;
  holder.rngState = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Bind a holder to a plain `() => number` generator. */
export function rngOf(holder: RngHolder): () => number {
  return () => nextRand(holder);
}

/** Standalone generator from a numeric seed (no shared holder). */
export function makeRng(seed: number): () => number {
  const holder: RngHolder = { rngState: seed >>> 0 };
  return () => nextRand(holder);
}

/** Stable integer hash of several numbers — used to derive sub-streams. */
export function hashSeed(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    let v = Math.floor(p) >>> 0;
    for (let i = 0; i < 4; i++) {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
      v >>>= 8;
    }
  }
  return h >>> 0;
}

/** Stable integer hash of a string — used to derive per-nation sub-streams. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Pick a random element (undefined when the list is empty). */
export function pick<T>(list: T[], rng: () => number): T | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}