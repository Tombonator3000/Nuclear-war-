export const ASSETS = {
  avatars: {
    p1: '/assets/avatars/ronnie.png',
    p2: '/assets/avatars/khadaffy.png',
    p3: '/assets/avatars/mao.png',
    p4: '/assets/avatars/jimi.png',
    p5: '/assets/avatars/castro.png',
  },
  icons: {
    missile: '/assets/icons/missile.png',
    bomber: '/assets/icons/bomber.png',
    warhead: '/assets/icons/warhead.png',
    defense: '/assets/icons/defense.png',
  },
  bg: '/assets/bg/world_map.png',
};

export const PLAYER_POSITIONS = {
  'p1': { x: 20, y: 20, label: 'top-left' },      // Ronnie (AI)
  'p2': { x: 80, y: 20, label: 'top-right' },     // Khadaffy (AI)
  'p3': { x: 20, y: 60, label: 'bottom-left' },   // Mao (AI)
  'p4': { x: 80, y: 60, label: 'bottom-right' },  // Jimi (AI)
  'human': { x: 50, y: 90, label: 'bottom-center' } // Human
} as const;

export const getPositionForPlayer = (index: number, isHuman: boolean) => {
  if (isHuman) return PLAYER_POSITIONS['human'];
  // Map index 0-3 to p1-p4
  const keys = ['p1', 'p2', 'p3', 'p4'] as const;
  return PLAYER_POSITIONS[keys[index]];
};
