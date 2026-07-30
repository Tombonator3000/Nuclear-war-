export type NationId = "USA" | "USSR" | "CHINA" | "EURO";

export interface City {
  id: string;
  name: string;
  nation: NationId;
  x: number;
  y: number;
  population: number;
  fallout: number;
}

export type CardKind = "pop" | "weapon" | "secret";

export interface PopulationCard {
  kind: "pop";
  id: string;
  name: string;
  amount: number;
  flavor?: string;
}

export interface WeaponCard {
  kind: "weapon";
  id: string;
  name: string;
  yield: number;
  vehicle: "ICBM" | "SLBM" | "BOMBER";
  flavor?: string;
}

export type SecretKind =
  | "PROPAGANDA_COUP"
  | "DEFECTOR"
  | "TOP_SECRET"
  | "ABM_SHIELD"
  | "SUPER_GERM"
  | "WORLD_OPINION"
  | "ACCIDENT"
  | "DETERRENT_POLICY";

export interface SecretCard {
  kind: "secret";
  id: string;
  secret: SecretKind;
  name: string;
  flavor: string;
}

export type Card = PopulationCard | WeaponCard | SecretCard;

export interface Nation {
  id: NationId;
  name: string;
  color: string;
  isAI: boolean;
  hand: Card[];
  eliminated: boolean;
  retaliating: boolean;
  abmShields: number;
}

export type Phase = "orders" | "resolve" | "fallout" | "gameover";

export interface LaunchOrder {
  kind: "launch";
  from: NationId;
  cardId: string;
  targetCityId: string;
}
export interface PropagandaOrder {
  kind: "propaganda";
  from: NationId;
  target: NationId;
}
export interface PlayPopOrder {
  kind: "playPop";
  from: NationId;
  cardId: string;
}
export interface PlaySecretOrder {
  kind: "playSecret";
  from: NationId;
  cardId: string;
  target?: NationId;
}
export interface PassOrder {
  kind: "pass";
  from: NationId;
}
export type Order = LaunchOrder | PropagandaOrder | PlayPopOrder | PlaySecretOrder | PassOrder;

export interface LogEntry {
  turn: number;
  text: string;
  tone: "info" | "warn" | "alert";
}

export interface LaunchResult {
  outcome: "hit" | "intercept" | "aborted" | "wasted";
  from: NationId;
  requestedCityId: string;
  impactCityId: string | null;
  weaponName: string;
  damage: number;
  reason:
    | "direct"
    | "guidance-fault"
    | "sam"
    | "abm"
    | "friendly-airspace"
    | "invalid-target"
    | "rubble"
    | "no-card";
}

export interface GameState {
  turn: number;
  phase: Phase;
  defcon: 1 | 2 | 3 | 4 | 5;
  nations: Record<NationId, Nation>;
  cities: City[];
  deck: Card[];
  discard: Card[];
  orders: Order[];
  log: LogEntry[];
  winner: NationId | "NONE" | null;
  humanId: NationId;
  lastSecretBanner: { from: NationId; name: string; flavor: string } | null;
  seed: number;
  rngState: number;
}