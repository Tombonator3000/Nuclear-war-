import type { Card, PopulationCard, SecretCard, SecretKind, WeaponCard } from "./types";

const POP_NAMES: [number, string][] = [
  [1, "1M NUCLEAR PHYSICISTS (IRONIC)"], [1, "1M TAX INSPECTORS"],
  [2, "2M UNION PLUMBERS"], [2, "2M MIDDLE MANAGERS"],
  [3, "3M RETIRED CIRCUS CLOWNS"], [3, "3M CONSPIRACY THEORISTS"],
  [4, "4M SUBURBAN GOLFERS"], [4, "4M CROSSFIT ENTHUSIASTS"],
  [5, "5M FUNDAMENTALIST HOMESTEADERS"], [5, "5M CRUISE-SHIP PASSENGERS"],
  [6, "6M UNPAID INTERNS"], [7, "7M TIKTOK INFLUENCERS"],
  [8, "8M SUNDAY DRIVERS"], [9, "9M FAST-FOOD LOYALISTS"],
  [10, "10M PATRIOTIC ACCOUNTANTS"], [12, "12M REALITY-TV FANATICS"],
  [15, "15M SUBURBAN COMMUTERS"], [20, "20M FLAG-WAVING RETIREES"],
  [25, "25M ANXIOUS URBANITES"],
];

const WEAPON_NAMES: Record<WeaponCard["vehicle"], string[]> = {
  ICBM: ["MINUTEMAN III", "MX PEACEKEEPER", "SS-18 SATAN", "DF-5 EAST WIND", "BIG BERTHA", "MIRV-Y CHRISTMAS", "DR. STRANGELOVE MK IV"],
  SLBM: ["POLARIS A-3", "TRIDENT II", "R-29 VYSOTA", "POSEIDON'S REGRET", "LEVIATHAN-C"],
  BOMBER: ["B-52 STRATO", "B-1 LANCER", "TU-95 BEAR", "SPIRIT OF ATLANTA", "OL' RUSTY"],
};

const YIELDS = [1, 5, 10, 20, 20, 50, 100];
const VEHICLES: WeaponCard["vehicle"][] = ["ICBM", "SLBM", "BOMBER"];

const SECRETS: { secret: SecretKind; name: string; flavor: string }[] = [
  { secret: "PROPAGANDA_COUP", name: "PROPAGANDA COUP", flavor: "Prime-time broadcast defects 15M viewers to your side." },
  { secret: "DEFECTOR", name: "DEFECTOR", flavor: "A colonel walks across the border with a stolen card." },
  { secret: "TOP_SECRET", name: "TOP SECRET LEAK", flavor: "The enemy's biggest warhead is featured on the evening news. Scrapped." },
  { secret: "ABM_SHIELD", name: "ANTI-BALLISTIC MISSILE", flavor: "STAR-WARS-ADJACENT shield: intercepts the next incoming strike." },
  { secret: "SUPER_GERM", name: "SUPER-GERM WARFARE", flavor: "Weaponized flu drifts across a random enemy city." },
  { secret: "WORLD_OPINION", name: "WORLD OPINION", flavor: "Everyone loses 5M in the general condemnation. Including you." },
  { secret: "ACCIDENT", name: "ACCIDENT", flavor: "A silo tech drops a wrench. Your own turf takes 8M." },
  { secret: "DETERRENT_POLICY", name: "DETERRENT POLICY", flavor: "Diplomatic hotline earns +1 ABM shield token." },
];

const nid = (rng: () => number) =>
  `c${Math.floor(rng() * 0xffffffff).toString(36)}${Math.floor(rng() * 0xffffffff).toString(36)}`;

export function makePopCard(rng: () => number): PopulationCard {
  const [amount, name] = POP_NAMES[Math.floor(rng() * POP_NAMES.length)];
  return { kind: "pop", id: nid(rng), name, amount };
}

export function makeWeaponCard(rng: () => number): WeaponCard {
  const vehicle = VEHICLES[Math.floor(rng() * VEHICLES.length)];
  const pool = WEAPON_NAMES[vehicle];
  const base = pool[Math.floor(rng() * pool.length)];
  const y = YIELDS[Math.floor(rng() * YIELDS.length)];
  return { kind: "weapon", id: nid(rng), vehicle, yield: y, name: `${base} + ${y}MT` };
}

export function makeSecretCard(rng: () => number): SecretCard {
  const s = SECRETS[Math.floor(rng() * SECRETS.length)];
  return { kind: "secret", id: nid(rng), ...s };
}

export function makeCard(rng: () => number): Card {
  const r = rng();
  if (r < 0.4) return makePopCard(rng);
  if (r < 0.85) return makeWeaponCard(rng);
  return makeSecretCard(rng);
}

export function buildDeck(size: number, rng: () => number): Card[] {
  return Array.from({ length: size }, () => makeCard(rng));
}

export const TABLOID_HIT = [
  "FILM AT 11.",
  "PRESIDENT UNAVAILABLE FOR COMMENT (DECEASED).",
  "STOCK MARKET DIPS SLIGHTLY.",
  "LOCAL WEATHER: BRIGHT, WITH A CHANCE OF GLASS.",
  "TOURISM BOARD SILENT.",
  "SPORTS SCORES ON PAGE 4.",
];

export function pickTabloid(rng: () => number): string {
  return TABLOID_HIT[Math.floor(rng() * TABLOID_HIT.length)];
}