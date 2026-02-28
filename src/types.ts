
export type WeaponType = 'missile' | 'bomber' | 'warhead' | 'defense';

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  cost?: number; // In population terms or just turns to build
  yield?: number; // Megatons
  capacity?: number; // For carriers
  range?: string;
  icon?: string;
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  population: number; // In millions
  avatar: string; // URL or color
  stockpile: {
    missiles: { [key: string]: number }; // count of each type
    bombers: number;
    warheads: { [key: string]: number }; // count of each size
    defenses: number;
  };
  isDead: boolean;
  lastAction?: string;
}

export interface ActiveAttack {
  id: string;
  attackerId: string;
  targetId: string;
  weaponId: string; // 'missile' or 'bomber'
}

export interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: string;
  phase: 'start' | 'planning' | 'targeting' | 'execution' | 'gameover';
  selectedAction: 'propaganda' | 'build' | 'attack' | null;
  selectedWeapon: {
    carrier: string | null;
    payload: string | null;
  };
  targetId: string | null;
  logs: string[];
  winnerId?: string | null;
  activeAttacks: ActiveAttack[];
}

import { ASSETS } from './constants';

export const LEADERS = [
  { 
    id: 'p1', 
    name: 'Ronnie Raygun', 
    avatar: ASSETS.avatars.p1,
    bio: "Former actor turned President. Believes space lasers are the future of peace. 'Mr. Gorbachev, tear down this wall!'"
  },
  { 
    id: 'p2', 
    name: 'Col. Khadaffy', 
    avatar: ASSETS.avatars.p2,
    bio: "The Mad Dog of the Desert. Loves tents, sunglasses, and long speeches. Unpredictable and dangerous."
  },
  { 
    id: 'p3', 
    name: 'Mao the Pun', 
    avatar: ASSETS.avatars.p3,
    bio: "The Great Helmsman. Famous for his Little Red Book of bad jokes. 'Political power grows out of the barrel of a pun.'"
  },
  { 
    id: 'p4', 
    name: 'Jimi Farmer', 
    avatar: ASSETS.avatars.p4,
    bio: "Peanut farmer and peace lover. Would rather build houses than nukes, but don't push him. That smile hides a lot of anxiety."
  },
  { 
    id: 'p5', 
    name: 'Infidel Castro', 
    avatar: ASSETS.avatars.p5,
    bio: "Revolutionary cigar aficionado. Has survived 638 assassination attempts. Will probably outlive the apocalypse."
  },
];

export const WEAPONS = {
  missiles: [
    { id: 'm10', name: '10MT Missile', capacity: 10, yield: 0, icon: ASSETS.icons.missile }, 
    { id: 'polaris', name: 'Polaris', capacity: 20, type: 'missile', icon: ASSETS.icons.missile },
    { id: 'atlas', name: 'Atlas', capacity: 50, type: 'missile', icon: ASSETS.icons.missile },
    { id: 'saturn', name: 'Saturn', capacity: 100, type: 'missile', icon: ASSETS.icons.missile },
  ],
  bombers: [
    { id: 'bomber', name: 'Bomber', capacity: 100, type: 'bomber', icon: ASSETS.icons.bomber },
  ],
  warheads: [
    { id: '10mt', name: '10 Megaton', yield: 10, type: 'warhead', icon: ASSETS.icons.warhead },
    { id: '20mt', name: '20 Megaton', yield: 20, type: 'warhead', icon: ASSETS.icons.warhead },
    { id: '50mt', name: '50 Megaton', yield: 50, type: 'warhead', icon: ASSETS.icons.warhead },
    { id: '100mt', name: '100 Megaton', yield: 100, type: 'warhead', icon: ASSETS.icons.warhead },
  ],
  defense: [
    { id: 'defense', name: 'Defense System', type: 'defense', icon: ASSETS.icons.defense },
  ]
};
