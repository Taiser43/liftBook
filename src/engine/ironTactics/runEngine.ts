import { AutoChessItem, rollMiniBossLoot } from '../../constants/autoChessItems';
import { ArenaEffectId, IRON_TACTICS_ARENAS } from '../../constants/ironTacticsArenas';
import { CoachId } from '../../constants/ironTacticsCoaches';
import { MuscleCategory } from '../../store/useAutoChessStore';

export interface CampEventOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  type: 'shop_upgrade' | 'loot_item' | 'heal_heart' | 'gamble' | 'synergy_buff';
  categoryBuff?: MuscleCategory;
}

export interface RunState {
  id: string;
  mode: 'standard' | 'daily' | 'boss_rush' | 'practice';
  stage: number; // 1 to 5
  wave: number; // 1 to 4 (wave 4 is mini-boss / boss)
  maxStages: number;
  hearts: number; // 3 to start
  plates: number;
  winStreak: number;
  totalWavesWon: number;
  miniBossKills: number;
  bossKills: number;
  boardSlots: number;
  board: (RunUnit | null)[];
  bench: (RunUnit | null)[];
  shopCards: ShopCardOffer[];
  shopItem: AutoChessItem | null;
  shopItemSold: boolean;
  shopTier: number; // 0 to 3
  freeRerollAvailable: boolean;
  itemBag: AutoChessItem[]; // max 4
  categoryBuffs: Partial<Record<MuscleCategory, number>>;
  activeArenaIndex: number;
  coachId: CoachId | null;
  isPlanDeck: boolean;
}

export interface RunUnit {
  instanceId: string;
  cardId: string;
  name: string;
  category: MuscleCategory;
  stars: 1 | 2 | 3;
  baseAtk: number;
  baseHp: number;
  cost: number;
  items: AutoChessItem[];
}

export interface ShopCardOffer {
  id: string;
  unit: RunUnit;
  sold: boolean;
  cost: number;
}

/**
 * Calculates current allowed board slots based on stage and coach.
 */
export const calculateBoardSlots = (stage: number, coachId: CoachId | null): number => {
  let slots = 3;
  if (stage >= 2) slots++;
  if (stage >= 4) slots++;
  if (coachId === 'cal' && stage >= 3) {
    slots = Math.min(5, slots + 1);
  }
  return Math.min(5, slots);
};

/**
 * Generates 3 Camp Event choices presented to the player between stages.
 */
export const rollCampEvents = (stage: number): CampEventOption[] => {
  const categories: MuscleCategory[] = ['Chest', 'Back', 'Arms', 'Shoulders', 'Legs', 'Core'];
  const pickedCat = categories[Math.floor(Math.random() * categories.length)];

  const allEvents: CampEventOption[] = [
    {
      id: 'shop_upgrade',
      title: 'Shop-Tuning',
      description: 'Erhöht die Shop-Stufe (+1 Tier) für stärkere Einheiten-Ränge.',
      icon: 'storefront',
      color: '#00D2FF',
      type: 'shop_upgrade',
    },
    {
      id: 'gym_bag_loot',
      title: 'Vergessene Gym-Tasche',
      description: 'Finde 1 zufälliges Equipment-Item für deine Einheiten.',
      icon: 'bag-personal',
      color: '#BF5AF2',
      type: 'loot_item',
    },
    {
      id: 'heart_recovery',
      title: 'Elektrolyte & Erholung',
      description: 'Stelle +1 verlorenes Herz wieder her (max. 3 Herzen).',
      icon: 'heart-plus',
      color: '#30D158',
      type: 'heal_heart',
    },
    {
      id: 'synergy_pump',
      title: `${pickedCat}-Pump-Fokus`,
      description: `Verleiht allen ${pickedCat}-Einheiten dauerhaft +15% ATK für diesen Run.`,
      icon: 'arm-flex',
      color: '#FF9500',
      type: 'synergy_buff',
      categoryBuff: pickedCat,
    },
  ];

  // Pick 3 unique options
  return [...allEvents].sort(() => 0.5 - Math.random()).slice(0, 3);
};

/**
 * Checks for unit merging (cascading: 1★ + 1★ -> 2★, and 2★ + 2★ -> 3★ TITAN).
 */
export const checkAndPerformMerge = (
  board: (RunUnit | null)[],
  bench: (RunUnit | null)[]
): {
  merged: boolean;
  updatedBoard: (RunUnit | null)[];
  updatedBench: (RunUnit | null)[];
  highestStar: 1 | 2 | 3;
} => {
  let currentBoard = [...board];
  let currentBench = [...bench];
  let anyMerged = false;
  let highestStar: 1 | 2 | 3 = 1;

  let foundMerge = true;
  while (foundMerge) {
    foundMerge = false;
    const allUnits: { unit: RunUnit; loc: 'board' | 'bench'; idx: number }[] = [];

    currentBoard.forEach((u, i) => {
      if (u) allUnits.push({ unit: u, loc: 'board', idx: i });
    });
    currentBench.forEach((u, i) => {
      if (u) allUnits.push({ unit: u, loc: 'bench', idx: i });
    });

    for (let i = 0; i < allUnits.length; i++) {
      for (let j = i + 1; j < allUnits.length; j++) {
        const u1 = allUnits[i];
        const u2 = allUnits[j];

        if (u1.unit.cardId === u2.unit.cardId && u1.unit.stars === u2.unit.stars && u1.unit.stars < 3) {
          const newStars = (u1.unit.stars + 1) as 1 | 2 | 3;
          if (newStars > highestStar) highestStar = newStars;

          const starMult = newStars === 2 ? 1.8 : 3.2;
          const prevMult = u1.unit.stars === 2 ? 1.8 : 1.0;

          const mergedUnit: RunUnit = {
            ...u1.unit,
            stars: newStars,
            baseAtk: Math.round(u1.unit.baseAtk * (starMult / prevMult)),
            baseHp: Math.round(u1.unit.baseHp * (starMult / prevMult)),
            items: [...(u1.unit.items || []), ...(u2.unit.items || [])].slice(0, 2),
          };

          // Prioritize keeping the unit on the board
          if (u1.loc === 'board') {
            currentBoard[u1.idx] = mergedUnit;
            if (u2.loc === 'board') currentBoard[u2.idx] = null;
            else currentBench[u2.idx] = null;
          } else if (u2.loc === 'board') {
            currentBoard[u2.idx] = mergedUnit;
            currentBench[u1.idx] = null;
          } else {
            currentBench[u1.idx] = mergedUnit;
            currentBench[u2.idx] = null;
          }

          anyMerged = true;
          foundMerge = true;
          break;
        }
      }
      if (foundMerge) break;
    }
  }

  return {
    merged: anyMerged,
    updatedBoard: currentBoard,
    updatedBench: currentBench,
    highestStar,
  };
};
