export type ChestType = 'dumbbell' | 'locker' | 'vault' | 'titan_shrine';

export interface ChestDef {
  type: ChestType;
  name: string;
  icon: string; // MaterialCommunityIcons
  color: string;
  borderColor: string;
  bgGradient: [string, string];
  durationSeconds: number; // Unlock duration
  minEisen: number;
  maxEisen: number;
  minFragments: number;
  maxFragments: number;
  blueprintChancePct: number;
  cosmeticChancePct: number;
  overflowEisen: number; // Eisen granted if all 4 chest slots are full
}

export const CHEST_DEFINITIONS: Record<ChestType, ChestDef> = {
  dumbbell: {
    type: 'dumbbell',
    name: 'Hantel-Kiste',
    icon: 'dumbbell',
    color: '#CD7F32',
    borderColor: '#CD7F3290',
    bgGradient: ['#2A1A10', '#18100A'],
    durationSeconds: 30 * 60, // 30 min
    minEisen: 40,
    maxEisen: 60,
    minFragments: 6,
    maxFragments: 10,
    blueprintChancePct: 8,
    cosmeticChancePct: 2,
    overflowEisen: 35,
  },
  locker: {
    type: 'locker',
    name: 'Gym-Spind',
    icon: 'locker',
    color: '#0A84FF',
    borderColor: '#0A84FF90',
    bgGradient: ['#0E223D', '#071220'],
    durationSeconds: 3 * 3600, // 3 hours
    minEisen: 120,
    maxEisen: 180,
    minFragments: 15,
    maxFragments: 25,
    blueprintChancePct: 25,
    cosmeticChancePct: 5,
    overflowEisen: 85,
  },
  vault: {
    type: 'vault',
    name: 'Eisen-Tresor',
    icon: 'safe',
    color: '#BF5AF2',
    borderColor: '#BF5AF295',
    bgGradient: ['#28103A', '#13071C'],
    durationSeconds: 8 * 3600, // 8 hours
    minEisen: 300,
    maxEisen: 450,
    minFragments: 40,
    maxFragments: 60,
    blueprintChancePct: 100, // 1 guaranteed
    cosmeticChancePct: 15,
    overflowEisen: 200,
  },
  titan_shrine: {
    type: 'titan_shrine',
    name: 'Titan-Schrein',
    icon: 'crown',
    color: '#FFD700',
    borderColor: '#FFD70095',
    bgGradient: ['#35290A', '#1C1504'],
    durationSeconds: 24 * 3600, // 24 hours
    minEisen: 800,
    maxEisen: 1000,
    minFragments: 100,
    maxFragments: 140,
    blueprintChancePct: 100,
    cosmeticChancePct: 50,
    overflowEisen: 500,
  },
};
