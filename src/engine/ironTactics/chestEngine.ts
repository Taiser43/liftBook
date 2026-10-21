import { CHEST_DEFINITIONS, ChestType } from '../../constants/ironTacticsChests';
import { AUTO_CHESS_ITEMS, AutoChessItem } from '../../constants/autoChessItems';

export interface ChestSlot {
  id: string;
  type: ChestType;
  state: 'locked' | 'unlocking' | 'ready';
  unlocksAt?: number; // epoch ms
  startedAt?: number;
}

export interface ChestOpenReward {
  type: ChestType;
  eisen: number;
  fragments: Record<string, number>; // cardId -> count
  blueprintItem?: AutoChessItem;
  cosmeticFrameId?: string;
}

/**
 * Checks if a chest in state 'unlocking' has finished its countdown.
 */
export const updateChestSlotState = (slot: ChestSlot, now: number = Date.now()): ChestSlot => {
  if (slot.state === 'unlocking' && slot.unlocksAt && now >= slot.unlocksAt) {
    return {
      ...slot,
      state: 'ready',
    };
  }
  return slot;
};

/**
 * Returns remaining seconds for an unlocking chest.
 */
export const getChestRemainingSeconds = (slot: ChestSlot, now: number = Date.now()): number => {
  if (slot.state !== 'unlocking' || !slot.unlocksAt) return 0;
  return Math.max(0, Math.ceil((slot.unlocksAt - now) / 1000));
};

/**
 * Speeds up a chest using 1 protein shake (-1 hour / 3600 seconds).
 */
export const speedUpChestWithShake = (slot: ChestSlot, now: number = Date.now()): { updatedSlot: ChestSlot; instantFinish: boolean } => {
  if (slot.state !== 'unlocking' || !slot.unlocksAt) {
    return { updatedSlot: slot, instantFinish: false };
  }
  const oneHourMs = 3600 * 1000;
  const newUnlocksAt = slot.unlocksAt - oneHourMs;
  const instantFinish = now >= newUnlocksAt;

  return {
    updatedSlot: {
      ...slot,
      unlocksAt: newUnlocksAt,
      state: instantFinish ? 'ready' : 'unlocking',
    },
    instantFinish,
  };
};

/**
 * Rolls loot when a chest is opened.
 */
export const rollChestRewards = (
  type: ChestType,
  availableCardIds: string[],
  unlockedBlueprintIds: string[]
): ChestOpenReward => {
  const def = CHEST_DEFINITIONS[type];
  const eisen = Math.floor(def.minEisen + Math.random() * (def.maxEisen - def.minEisen + 1));

  // Distribute fragments among 1 to 3 owned cards
  const fragments: Record<string, number> = {};
  const totalFragments = Math.floor(def.minFragments + Math.random() * (def.maxFragments - def.minFragments + 1));
  const pool = availableCardIds.length > 0 ? availableCardIds : ['push_up', 'bench_press', 'squat'];

  // Pick up to 3 cards
  const pickedCardCount = Math.min(3, pool.length);
  const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, pickedCardCount);

  let remainingFrags = totalFragments;
  shuffled.forEach((cardId, idx) => {
    if (idx === shuffled.length - 1) {
      fragments[cardId] = remainingFrags;
    } else {
      const share = Math.max(1, Math.floor(remainingFrags / (shuffled.length - idx)));
      fragments[cardId] = share;
      remainingFrags -= share;
    }
  });

  // Blueprint roll
  let blueprintItem: AutoChessItem | undefined = undefined;
  const rollBp = Math.random() * 100;
  if (rollBp < def.blueprintChancePct) {
    const lockedItems = AUTO_CHESS_ITEMS.filter(it => !unlockedBlueprintIds.includes(it.id));
    if (lockedItems.length > 0) {
      blueprintItem = lockedItems[Math.floor(Math.random() * lockedItems.length)];
    }
  }

  // Cosmetic frame roll
  let cosmeticFrameId: string | undefined = undefined;
  const rollCosmetic = Math.random() * 100;
  if (rollCosmetic < def.cosmeticChancePct) {
    const framePool = ['frame_neon_cyan', 'frame_flame_gold', 'frame_emerald'];
    cosmeticFrameId = framePool[Math.floor(Math.random() * framePool.length)];
  }

  return {
    type,
    eisen,
    fragments,
    blueprintItem,
    cosmeticFrameId,
  };
};
