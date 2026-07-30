import type { GameState, NationId } from "@/game/types";

const SAVE_KEY = "nw-save";
const NEW_FLAG_KEY = "nw-new-game";
const HIGH_KEY = "nw-highscores";
const OPTS_KEY = "nw-options";

export interface Highscore {
  date: number;
  nation: NationId | "NONE";
  human: NationId;
  survivedTurns: number;
  survivorPop: number;
  outcome: "VICTORY" | "SURVIVED" | "MUTUAL_DESTRUCTION" | "ELIMINATED";
}

export interface Options {
  animSpeed: 1 | 0.5 | 0.25;
  soundOn: boolean;
  showHelp: boolean;
}

export const DEFAULT_OPTIONS: Options = { animSpeed: 1, soundOn: false, showHelp: true };

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export function saveGame(state: GameState): void {
  if (typeof window === "undefined") return;
  safe(() => localStorage.setItem(SAVE_KEY, JSON.stringify(state)), undefined);
}
export function loadGame(): GameState | null {
  if (typeof window === "undefined") return null;
  return safe(() => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.nations || !Array.isArray(parsed.cities)) return null;
    if (typeof parsed.seed !== "number") parsed.seed = 20260702;
    if (typeof parsed.rngState !== "number") parsed.rngState = (parsed.seed ^ 0x5eed) >>> 0;
    return parsed;
  }, null);
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  safe(() => localStorage.removeItem(SAVE_KEY), undefined);
}
export function hasSave(): boolean { return !!loadGame(); }

export function requestNewGame(): void {
  if (typeof window === "undefined") return;
  safe(() => {
    sessionStorage.setItem(NEW_FLAG_KEY, "1");
    localStorage.removeItem(SAVE_KEY);
  }, undefined);
}
export function consumeNewGameFlag(): boolean {
  if (typeof window === "undefined") return false;
  return safe(() => {
    const v = sessionStorage.getItem(NEW_FLAG_KEY);
    if (v) sessionStorage.removeItem(NEW_FLAG_KEY);
    return !!v;
  }, false);
}

export function loadOptions(): Options {
  if (typeof window === "undefined") return DEFAULT_OPTIONS;
  return safe(() => {
    const raw = localStorage.getItem(OPTS_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    return { ...DEFAULT_OPTIONS, ...(JSON.parse(raw) as Partial<Options>) };
  }, DEFAULT_OPTIONS);
}
export function saveOptions(opts: Options): void {
  if (typeof window === "undefined") return;
  safe(() => localStorage.setItem(OPTS_KEY, JSON.stringify(opts)), undefined);
}

export function loadHighscores(): Highscore[] {
  if (typeof window === "undefined") return [];
  return safe(() => {
    const raw = localStorage.getItem(HIGH_KEY);
    return raw ? (JSON.parse(raw) as Highscore[]) : [];
  }, []);
}
export function recordHighscore(entry: Highscore): Highscore[] {
  const all = [...loadHighscores(), entry]
    .sort((a, b) => b.survivorPop - a.survivorPop || b.survivedTurns - a.survivedTurns)
    .slice(0, 10);
  safe(() => localStorage.setItem(HIGH_KEY, JSON.stringify(all)), undefined);
  return all;
}
export function clearHighscores(): void {
  safe(() => localStorage.removeItem(HIGH_KEY), undefined);
}