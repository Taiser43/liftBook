import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';
import { PRELOADED_EXERCISES } from '../data/exercises';
import { CompletedWorkout, WorkoutProgram, WorkoutPlan } from './store';
import { getLevelData } from '../utils/gamification';
import { getResolvedUri } from '../utils/uriResolver';
import { useAppStore } from './store';
import {
  AutoChessItem,
  AUTO_CHESS_ITEMS,
  rollMiniBossLoot,
  rollShopItem,
  MINI_BOSS_ARCHETYPES
} from '../constants/autoChessItems';

export type MuscleCategory = 'Chest' | 'Back' | 'Arms' | 'Shoulders' | 'Legs' | 'Core';

export interface AutoChessCardData {
  id: string; // unique card definition id (e.g. exercise name normalized)
  exerciseName: string;
  category: MuscleCategory;
  equipmentType: string;
  imageUri?: string;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Emerald' | 'Challenger';
  cost: number; // 1 to 5 (equals powerScore)
  powerScore: number; // 1 to 5
  baseAtk: number;
  baseHp: number;
  maxWeight: number;
  totalSets: number;
  traitName: string;
  traitDesc: string;
  isBossUnit?: boolean;
}

export interface AutoChessUnit {
  instanceId: string; // unique on-board instance id
  cardId: string;
  exerciseName: string;
  category: MuscleCategory;
  equipmentType: string;
  imageUri?: string;
  stars: 1 | 2 | 3;
  atk: number;
  hp: number;
  maxHp: number;
  cost: number;
  powerScore: number;
  maxWeight: number;
  totalSets: number;
  traitName: string;
  traitDesc: string;
  isBossUnit?: boolean;
  items?: AutoChessItem[]; // Max 2 equipped items
}

export interface EnemySquad {
  name: string;
  avatar: string;
  round: number;
  wave: number;
  units: AutoChessUnit[];
  isBoss?: boolean;
  bossSubtitle?: string;
  isMiniBoss?: boolean;
}

export interface ActiveSynergy {
  category: MuscleCategory;
  count: number;
  level: 0 | 1 | 2; // 0: inactive, 1: 2 units (+25%), 2: 3 units (+60% + special trait)
  atkBonusPct: number;
  hpBonusPct: number;
  specialTraitName: string;
  specialTraitDesc: string;
}

export interface AutoChessState {
  // Persistent meta-progression (AsyncStorage)
  trophies: number;
  trophyMilestonesClaimed: string[];

  // Session state (ephemeral to current workout)
  coins: number;
  round: number; // Current workout gym set count
  currentWaveInPause: number; // Wave 1, 2, 3... in current rest interval
  pendingWaveBonusStacks: number; // Waves won in current pause (activates next set)
  activeWaveBonusStacks: number; // Active bonus from previous pause (+10% stats & +1 coin per stack)
  currentExerciseIndex: number;
  maxBoardSlots: number;
  isShopLocked: boolean;
  shop: AutoChessCardData[];
  board: (AutoChessUnit | null)[];
  bench: (AutoChessUnit | null)[];
  pool: AutoChessCardData[];
  enemySquad: EnemySquad | null;
  combatState: 'idle' | 'fighting' | 'victory' | 'defeat';
  combatLog: string[];
  sessionStats: { wins: number; losses: number; totalCoinsEarned: number };
  isBossAvailable: boolean;
  isBossDefeated: boolean;
  activeWorkoutExercises: Array<{ name: string; equipmentType?: string; imageUri?: string }>;

  // Items & Equipment
  itemInventory: AutoChessItem[]; // Gym-Tasche (max 4 items)
  shopItem: AutoChessItem | null; // 6th slot in shop (30% spawn chance)
  currentLootDrop: AutoChessItem | null; // Triggered upon Mini-Boss defeat

  // Actions
  initSession: (
    workoutPrograms: WorkoutProgram[], 
    workoutPlans: WorkoutPlan[], 
    customExercises: any[], 
    history: CompletedWorkout[],
    activeWorkoutExercises?: any[]
  ) => void;
  updateActiveExerciseIndex: (index: number) => void;
  awardSetCoins: (reps?: number, isLastSetOfWorkout?: boolean) => void;
  setBossAvailable: (isBossAvailable: boolean) => void;
  rerollShop: (isFree?: boolean) => void;
  toggleShopLock: () => void;
  buyShopCard: (shopIndex: number) => boolean;
  buyShopItem: () => boolean;
  equipItem: (unitInstanceId: string, itemId: string) => boolean;
  unequipItem: (unitInstanceId: string, itemIndex: number) => void;
  claimLootDrop: () => void;
  setLootDrop: (item: AutoChessItem | null) => void;
  sellUnit: (instanceId: string, from: 'board' | 'bench') => void;
  moveUnit: (instanceId: string, to: 'board' | 'bench', targetSlotIndex?: number) => void;
  swapBoardUnits: (fromIndex: number, toIndex: number) => void;
  saveBoardUnitHps: (hps: Record<string, number>) => void;
  recordWaveVictory: (isBoss?: boolean, isMiniBoss?: boolean) => { trophiesGained: number; coinsGained: number; droppedItem: AutoChessItem | null };
  spawnNextWave: () => void;
  triggerBossEncounter: () => void;
  claimTrophyMilestone: (milestoneId: string) => void;
  resetCombat: () => void;
  getActiveSynergies: () => ActiveSynergy[];
  calculatePlayerCombatPower: () => number;
  addExerciseToLivePool: (exercise: { name: string; equipmentType?: string; imageUri?: string }) => void;
}

// Map exercise name to muscle category
export const getExerciseCategory = (exerciseName: string): MuscleCategory => {
  const name = exerciseName.toLowerCase();
  const preloaded = PRELOADED_EXERCISES.find(p => p.name.toLowerCase() === name);
  if (preloaded) {
    if (preloaded.category === 'Chest') return 'Chest';
    if (preloaded.category === 'Back') return 'Back';
    if (preloaded.category === 'Shoulders') return 'Shoulders';
    if (preloaded.category === 'Arms') return 'Arms';
    if (preloaded.category === 'Legs') return 'Legs';
    return 'Core';
  }

  if (name.includes('chest') || name.includes('bench') || name.includes('pec') || name.includes('push-up') || name.includes('pushup') || name.includes('fly') || name.includes('dip')) {
    return 'Chest';
  }
  if (name.includes('back') || name.includes('row') || name.includes('lat') || name.includes('pull-up') || name.includes('pullup') || name.includes('chin-up') || name.includes('pulldown') || name.includes('deadlift')) {
    return 'Back';
  }
  if (name.includes('shoulder') || name.includes('overhead') || name.includes('ohp') || name.includes('lateral') || name.includes('delt') || name.includes('shrug') || name.includes('arnold')) {
    return 'Shoulders';
  }
  if (name.includes('curl') || name.includes('bicep') || name.includes('tricep') || name.includes('extension') || name.includes('skull') || name.includes('hammer')) {
    return 'Arms';
  }
  if (name.includes('leg') || name.includes('squat') || name.includes('lunge') || name.includes('calf') || name.includes('hamstring') || name.includes('quad') || name.includes('press') || name.includes('rdl')) {
    return 'Legs';
  }
  return 'Core';
};

// Trait descriptions for 3-unit MAX synergies
const CATEGORY_TRAITS: Record<MuscleCategory, { name: string; desc: string }> = {
  Chest: { name: 'Heavy Slam', desc: 'Erster Treffer ist garantiert kritisch (1.5x Schaden).' },
  Back: { name: 'Counter Hook', desc: 'Heilt 25% Ausdauer und schlägt mit 30% Gegenschaden zurück.' },
  Arms: { name: 'Double Strike', desc: '35% Chance auf einen sofortigen Doppelschlag in derselben Runde.' },
  Shoulders: { name: 'Overhead Smite', desc: 'Gewährt 30% Ausweichchance & ignoriert Schilde.' },
  Legs: { name: 'Unshakeable', desc: 'Blockt 30% Schaden und reflektiert 25% als Thorns-Effekt.' },
  Core: { name: 'Iron Core', desc: 'Verstärkt alle benachbarten Einheiten um +15% Stats.' },
};

// Calculate card stats from workout history
const buildCardData = (
  exerciseName: string, 
  category: MuscleCategory, 
  equipmentType: string, 
  history: CompletedWorkout[],
  imageUri?: string
): AutoChessCardData => {
  let totalSets = 0;
  let maxWeight = 0;

  history.forEach(w => {
    const ex = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (ex && ex.sets) {
      ex.sets.forEach(s => {
        totalSets += 1;
        if ((s.weight || 0) > maxWeight) maxWeight = s.weight || 0;
      });
    }
  });

  const xp = totalSets * 10;
  const levelData = getLevelData(xp);
  const rank = levelData.rank as 'Bronze' | 'Silver' | 'Gold' | 'Emerald' | 'Challenger';

  const effectiveMaxWeight = maxWeight > 0 ? maxWeight : 20 + (rank === 'Silver' ? 15 : rank === 'Gold' ? 30 : rank === 'Emerald' ? 45 : rank === 'Challenger' ? 60 : 0);
  const baseAtk = Math.max(20, Math.round(effectiveMaxWeight * 0.8 + totalSets * 2));
  const baseHp = Math.max(50, Math.round(effectiveMaxWeight * 1.6 + totalSets * 4 + 40));

  // Power rating: 1 to 5 (determines cost directly)
  // Light (sum ~70-110) = 1, Mid-light (~111-170) = 2, Mid (~171-240) = 3, Heavy (~241-320) = 4, Elite (>320) = 5
  const rawSum = baseAtk + baseHp;
  let powerScore = 1;
  if (rawSum >= 320) powerScore = 5;
  else if (rawSum >= 240) powerScore = 4;
  else if (rawSum >= 170) powerScore = 3;
  else if (rawSum >= 110) powerScore = 2;
  else powerScore = 1;

  const cost = powerScore;
  const trait = CATEGORY_TRAITS[category] || { name: 'Focus', desc: '+15% Kampfkraft.' };

  return {
    id: exerciseName.trim(),
    exerciseName: exerciseName.trim(),
    category,
    equipmentType: equipmentType || 'Freie Übung',
    imageUri,
    rank,
    cost,
    powerScore,
    baseAtk,
    baseHp,
    maxWeight: effectiveMaxWeight,
    totalSets,
    traitName: trait.name,
    traitDesc: trait.desc
  };
};

// Calculate Star multiplier
const getMultiplierForStars = (stars: 1 | 2 | 3) => {
  if (stars === 1) return 1;
  if (stars === 2) return 1.8;
  return 3.0; // 3-star titan
};

// Roll cards from pool weighted by rank chances
const rollShopCards = (pool: AutoChessCardData[], count: number = 3): AutoChessCardData[] => {
  if (pool.length === 0) return [];
  const selected: AutoChessCardData[] = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * 100;
    let targetRank: 'Bronze' | 'Silver' | 'Gold' | 'Emerald' | 'Challenger' = 'Bronze';
    if (roll < 45) targetRank = 'Bronze';
    else if (roll < 75) targetRank = 'Silver';
    else if (roll < 90) targetRank = 'Gold';
    else if (roll < 97) targetRank = 'Emerald';
    else targetRank = 'Challenger';

    let candidates = pool.filter(c => c.rank === targetRank);
    if (candidates.length === 0) candidates = pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push(picked);
  }
  return selected;
};

// Generate intelligent enemy squad using Hybrid Rubber-Band Balancing
const generateEnemySquad = (
  round: number,
  wave: number,
  pool: AutoChessCardData[],
  playerUnits: AutoChessUnit[],
  activeWaveBonusStacks: number,
  isBoss: boolean = false,
  workoutExercises: Array<{ name: string; equipmentType?: string; imageUri?: string }> = [],
  isMiniBoss: boolean = false
): EnemySquad => {
  // 1. Calculate player combat power (CP)
  let playerCp = 0;
  playerUnits.forEach(u => {
    playerCp += (u.atk * 1.5) + u.hp;
  });
  if (activeWaveBonusStacks > 0) {
    playerCp *= (1 + activeWaveBonusStacks * 0.1);
  }
  const minBaselineCp = 180 + round * 30;
  if (playerCp < minBaselineCp) {
    playerCp = minBaselineCp;
  }

  // 2. Determine target CP
  let targetCp = Math.round(playerCp * 0.85); // Wave 1 default
  if (isBoss) {
    targetCp = Math.round(playerCp * 1.15);
  } else if (isMiniBoss || wave === 4) {
    targetCp = Math.round(playerCp * 1.25);
  } else if (wave === 2) {
    targetCp = Math.round(playerCp * 1.02);
  } else if (wave >= 3) {
    targetCp = Math.round(playerCp * (1.12 + (wave - 3) * 0.08));
  }

  // 3. Option A: Shadow Titan Boss
  if (isBoss) {
    const bossExercisePool = workoutExercises.length > 0 ? workoutExercises : [
      { name: 'Bankdrücken', equipmentType: 'Langhantel' },
      { name: 'Kniebeugen', equipmentType: 'Langhantel' },
      { name: 'Klimmzüge', equipmentType: 'Körpergewicht' },
    ];

    const bossUnitCount = Math.min(4, Math.max(2, Math.min(playerUnits.length || 2, bossExercisePool.length)));
    const targetCpPerUnit = Math.round(targetCp / bossUnitCount);
    const bossUnits: AutoChessUnit[] = [];

    // Signature Boss Items
    const bossBelt = AUTO_CHESS_ITEMS.find(it => it.id === 'lifting_belt');
    const bossCleave = AUTO_CHESS_ITEMS.find(it => it.id === 'pump_booster');
    const bossRage = AUTO_CHESS_ITEMS.find(it => it.id === 'smelling_salts');

    for (let i = 0; i < bossUnitCount; i++) {
      const ex = bossExercisePool[i % bossExercisePool.length];
      const category = getExerciseCategory(ex.name);
      const trait = CATEGORY_TRAITS[category] || { name: 'Schatten-Hieb', desc: '+25% Schattenkraft.' };

      // Boss units: +30% HP tankiness, steady ATK
      const unitHp = Math.round((targetCpPerUnit * 0.6) * 1.3);
      const unitAtk = Math.round((targetCpPerUnit * 0.4) / 1.5 * 0.85);

      const itemsForUnit: AutoChessItem[] = [];
      if (i === 0 && bossBelt) itemsForUnit.push(bossBelt);
      if (i === 1 && bossCleave) itemsForUnit.push(bossCleave);
      else if (i === 0 && bossRage) itemsForUnit.push(bossRage);

      bossUnits.push({
        instanceId: `boss_${Date.now()}_${i}`,
        cardId: `shadow_${ex.name}`,
        exerciseName: `Schatten-${ex.name}`,
        category,
        equipmentType: ex.equipmentType || 'Schatten-Titan',
        imageUri: ex.imageUri,
        stars: 2,
        atk: Math.max(25, unitAtk),
        hp: Math.max(70, unitHp),
        maxHp: Math.max(70, unitHp),
        cost: 5,
        powerScore: 5,
        maxWeight: 100,
        totalSets: 20,
        traitName: trait.name,
        traitDesc: trait.desc,
        isBossUnit: true,
        items: itemsForUnit.length > 0 ? itemsForUnit : undefined
      });
    }

    return {
      name: '👑 Der Schatten-Titan',
      avatar: 'skull',
      round,
      wave,
      units: bossUnits,
      isBoss: true,
      bossSubtitle: 'Schatten-Spiegel deines heutigen Workouts'
    };
  }

  // 4. Option B: Satz-Mini-Boss (Triggered at Wave 4)
  if (isMiniBoss || (wave === 4 && !isBoss)) {
    const archetype = MINI_BOSS_ARCHETYPES[(round - 1) % MINI_BOSS_ARCHETYPES.length] || MINI_BOSS_ARCHETYPES[0];
    const miniBossItem = AUTO_CHESS_ITEMS.find(it => it.id === archetype.itemId) || AUTO_CHESS_ITEMS[2];

    const targetCpPerUnit = Math.round(targetCp / 2);
    const miniBossUnit: AutoChessUnit = {
      instanceId: `miniboss_${Date.now()}_0`,
      cardId: `mb_${archetype.name}`,
      exerciseName: archetype.name,
      category: archetype.category,
      equipmentType: archetype.equipmentType,
      stars: 2,
      atk: Math.max(28, Math.round((targetCpPerUnit * 0.45) / 1.5 * archetype.bonusAtkMult)),
      hp: Math.max(75, Math.round((targetCpPerUnit * 0.55) * archetype.bonusHpMult)),
      maxHp: Math.max(75, Math.round((targetCpPerUnit * 0.55) * archetype.bonusHpMult)),
      cost: 4,
      powerScore: 4,
      maxWeight: 120,
      totalSets: 15,
      traitName: 'Mini-Boss Aura',
      traitDesc: archetype.subtitle,
      isBossUnit: true,
      items: [miniBossItem]
    };

    const minionCard = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    const minionUnit: AutoChessUnit = {
      instanceId: `miniboss_add_${Date.now()}_1`,
      cardId: minionCard?.id || 'mb_add',
      exerciseName: minionCard?.exerciseName || 'Gym Schlägertyp',
      category: minionCard?.category || 'Chest',
      equipmentType: minionCard?.equipmentType || 'Hantel',
      imageUri: minionCard?.imageUri,
      stars: 1,
      atk: Math.max(20, Math.round((targetCpPerUnit * 0.35) / 1.5)),
      hp: Math.max(50, Math.round(targetCpPerUnit * 0.45)),
      maxHp: Math.max(50, Math.round(targetCpPerUnit * 0.45)),
      cost: 2,
      powerScore: 2,
      maxWeight: 40,
      totalSets: 5,
      traitName: 'Handlanger',
      traitDesc: 'Unterstützt den Satz-Mini-Boss'
    };

    return {
      name: `💀 ${archetype.name}`,
      avatar: archetype.avatar,
      round,
      wave,
      units: [miniBossUnit, minionUnit],
      isBoss: false,
      isMiniBoss: true,
      bossSubtitle: archetype.subtitle
    };
  }

  // 5. Regular Squad with Archetypes & Scaling Items
  const enemyNamesWave1 = ['Gym Rookie Kevin', 'Warming-Up Carl', 'Kabelzug-Krieger', 'Pre-Workout Bro'];
  const enemyNamesWave2 = ['Plate Stacker Boris', 'Super-Set Steve', 'The Form Police', 'Iron Bro'];
  const enemyNamesWave3 = ['The Iron Golem', 'Apex Shadow Lifter', 'Colossus of the Rack', 'Master of Iron'];

  const namePool = wave === 1 ? enemyNamesWave1 : wave === 2 ? enemyNamesWave2 : enemyNamesWave3;
  const name = namePool[Math.floor(Math.random() * namePool.length)];

  const unitCount = Math.max(1, Math.min(4, Math.max(playerUnits.length || 2, Math.floor(round / 2) + 1)));
  const targetCpPerUnit = Math.round(targetCp / unitCount);
  const units: AutoChessUnit[] = [];

  for (let i = 0; i < unitCount; i++) {
    const card = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : {
      id: `bot_ex_${i}`,
      exerciseName: 'Kurzhantel-Drücken',
      category: 'Chest' as MuscleCategory,
      equipmentType: 'Kurzhanteln',
      rank: 'Bronze' as const,
      cost: 1,
      powerScore: 1,
      baseAtk: 35,
      baseHp: 90,
      maxWeight: 25,
      totalSets: 8,
      traitName: 'Power',
      traitDesc: 'Standard'
    };

    const enemyStars: 1 | 2 | 3 = (wave >= 3 || (round >= 6 && i === 0)) ? 2 : 1;
    const mult = getMultiplierForStars(enemyStars);

    const unitHp = Math.round((targetCpPerUnit * 0.55));
    const unitAtk = Math.round((targetCpPerUnit * 0.45) / 1.5);

    // Dynamic Enemy Item Assignment:
    // Wave 3+: 1st unit has 1 Common/Rare item
    // Wave 5+: 2nd unit has 1 item
    let unitItems: AutoChessItem[] | undefined = undefined;
    if (wave >= 3 && i === 0) {
      unitItems = [AUTO_CHESS_ITEMS[Math.floor(Math.random() * 6)]];
    } else if (wave >= 5 && i === 1) {
      unitItems = [AUTO_CHESS_ITEMS[Math.floor(Math.random() * AUTO_CHESS_ITEMS.length)]];
    }

    units.push({
      instanceId: `enemy_${Date.now()}_${i}`,
      cardId: card.id,
      exerciseName: card.exerciseName,
      category: card.category,
      equipmentType: card.equipmentType,
      imageUri: card.imageUri,
      stars: enemyStars,
      atk: Math.max(20, Math.round(unitAtk * mult * 0.95)),
      hp: Math.max(50, Math.round(unitHp * mult * 0.95)),
      maxHp: Math.max(50, Math.round(unitHp * mult * 0.95)),
      cost: card.cost,
      powerScore: card.powerScore || card.cost,
      maxWeight: card.maxWeight,
      totalSets: card.totalSets || 0,
      traitName: card.traitName,
      traitDesc: card.traitDesc,
      items: unitItems
    });
  }

  return {
    name,
    avatar: 'dumbbell',
    round,
    wave,
    units,
    isBoss: false,
    bossSubtitle: `Welle ${wave} • Satz ${round} • Gegner`
  };
};

export const useAutoChessStore = create<AutoChessState>()(
  persist(
    (set, get) => ({
      // Persistent states
      trophies: 0,
      trophyMilestonesClaimed: [],

      // Ephemeral session states
      coins: 0,
      round: 1,
      currentWaveInPause: 1,
      pendingWaveBonusStacks: 0,
      activeWaveBonusStacks: 0,
      currentExerciseIndex: 0,
      maxBoardSlots: 2, // Starts at 2, scales with each new exercise (up to 5)
      isShopLocked: false,
      shop: [],
      board: [null, null],
      bench: [null, null, null],
      pool: [],
      enemySquad: null,
      combatState: 'idle',
      combatLog: [],
      sessionStats: { wins: 0, losses: 0, totalCoinsEarned: 0 },
      isBossAvailable: false,
      isBossDefeated: false,
      activeWorkoutExercises: [],

      // Items & Equipment
      itemInventory: [],
      shopItem: null,
      currentLootDrop: null,

      calculatePlayerCombatPower: () => {
        const { board, activeWaveBonusStacks } = get();
        const activeUnits = board.filter((u): u is AutoChessUnit => u !== null && u.hp > 0);
        let cp = 0;
        activeUnits.forEach(u => {
          cp += (u.atk * 1.5) + u.hp;
        });
        if (activeWaveBonusStacks > 0) {
          cp *= (1 + activeWaveBonusStacks * 0.1);
        }
        return Math.round(cp);
      },

      initSession: (workoutPrograms, workoutPlans, customExercises, history, activeWorkoutExercises) => {
        const collectibleImages = useAppStore.getState().collectibleImages || {};

        const resolveImage = (name: string, fallbackUri?: string): string | undefined => {
          const norm = name.toLowerCase().trim();
          const raw = collectibleImages[`exercise_${name}`] || 
                      collectibleImages[`exercise_${norm}`] ||
                      customExercises?.find((c: any) => c.name?.toLowerCase().trim() === norm)?.imageUri ||
                      fallbackUri;
          return getResolvedUri(raw);
        };

        // 1. Gather all exercises:
        // Rule: ALWAYS include ALL user-created customExercises
        // Standard exercises ONLY from active workout or active programs/plans
        const exerciseMap = new Map<string, { name: string; equipmentType: string; imageUri?: string }>();

        // Store active workout exercises for Option A Shadow Titan
        const activeList: Array<{ name: string; equipmentType?: string; imageUri?: string }> = [];

        // A. ALL user-created custom exercises
        (customExercises || []).forEach((c: any) => {
          if (c && c.name) {
            const key = c.name.toLowerCase().trim();
            if (!exerciseMap.has(key)) {
              exerciseMap.set(key, {
                name: c.name.trim(),
                equipmentType: c.equipmentType || 'Freie Übung',
                imageUri: resolveImage(c.name, c.imageUri)
              });
            }
          }
        });

        // B. Active workout exercises (live workout / freestyle)
        (activeWorkoutExercises || []).forEach(ex => {
          if (ex && ex.name) {
            const img = resolveImage(ex.name, ex.imageUri);
            activeList.push({ name: ex.name, equipmentType: ex.equipmentType, imageUri: img });
            const key = ex.name.toLowerCase().trim();
            if (!exerciseMap.has(key)) {
              exerciseMap.set(key, {
                name: ex.name.trim(),
                equipmentType: ex.equipmentType || 'Freie Übung',
                imageUri: img
              });
            }
          }
        });

        // C. From active programs
        (workoutPrograms || [])
          .filter(p => p.isActive)
          .forEach(prog => {
            (prog.workouts || []).forEach(plan => {
              (plan.exercises || []).forEach(ex => {
                if (ex && ex.name) {
                  const key = ex.name.toLowerCase().trim();
                  if (!exerciseMap.has(key)) {
                    exerciseMap.set(key, {
                      name: ex.name.trim(),
                      equipmentType: 'Freie Übung',
                      imageUri: resolveImage(ex.name, (ex as any).imageUri)
                    });
                  }
                }
              });
            });
          });

        // D. Active standalone workoutPlans if programs is empty
        if (exerciseMap.size === 0) {
          (workoutPlans || []).forEach(plan => {
            (plan.exercises || []).forEach(ex => {
              if (ex && ex.name) {
                const key = ex.name.toLowerCase().trim();
                if (!exerciseMap.has(key)) {
                  exerciseMap.set(key, {
                    name: ex.name.trim(),
                    equipmentType: 'Freie Übung',
                    imageUri: resolveImage(ex.name, (ex as any).imageUri)
                  });
                }
              }
            });
          });
        }

        // Absolute safety fallback ONLY if user has literally 0 exercises anywhere
        if (exerciseMap.size === 0) {
          PRELOADED_EXERCISES.slice(0, 3).forEach(p => {
            exerciseMap.set(p.name.toLowerCase().trim(), {
              name: p.name,
              equipmentType: p.equipmentType || 'Freie Übung',
              imageUri: resolveImage(p.name, (p as any).imageUri)
            });
          });
        }

        // Convert map to AutoChessCardData pool
        const pool: AutoChessCardData[] = [];
        exerciseMap.forEach(({ name, equipmentType, imageUri }) => {
          const category = getExerciseCategory(name);
          const card = buildCardData(name, category, equipmentType, history || [], imageUri);
          pool.push(card);
        });

        // Initial board size: 2 slots for exercise 0
        const maxBoardSlots = 2;
        const initialShop = rollShopCards(pool, 3);
        const initialEnemy = generateEnemySquad(1, 1, pool, [], 0, false, activeList);

        const startCoins = (get().trophies >= 250 ? 1 : 0);

        set({
          coins: startCoins,
          round: 1,
          currentWaveInPause: 1,
          pendingWaveBonusStacks: 0,
          activeWaveBonusStacks: 0,
          currentExerciseIndex: 0,
          maxBoardSlots,
          isShopLocked: false,
          shop: initialShop,
          board: new Array(maxBoardSlots).fill(null),
          bench: [null, null, null],
          pool,
          enemySquad: initialEnemy,
          combatState: 'idle',
          combatLog: [],
          sessionStats: { wins: 0, losses: 0, totalCoinsEarned: startCoins },
          isBossAvailable: false,
          isBossDefeated: false,
          activeWorkoutExercises: activeList,
          shopItem: rollShopItem(),
          currentLootDrop: null,
          itemInventory: get().itemInventory || []
        });
      },

      updateActiveExerciseIndex: (index: number) => {
        const { maxBoardSlots, board, activeWorkoutExercises } = get();
        const newMaxSlots = Math.min(5, Math.max(2, index + 2));

        if (newMaxSlots !== maxBoardSlots) {
          const newBoard = new Array(newMaxSlots).fill(null);
          for (let i = 0; i < board.length && i < newMaxSlots; i++) {
            newBoard[i] = board[i];
          }
          set({
            currentExerciseIndex: index,
            maxBoardSlots: newMaxSlots,
            board: newBoard,
          });
          Vibration.vibrate(80);
        } else {
          set({ currentExerciseIndex: index });
        }
      },

      setBossAvailable: (isBossAvailable: boolean) => {
        const { isBossDefeated } = get();
        set({ isBossAvailable: isBossAvailable && !isBossDefeated });
      },

      // Called when user logs a gym set: Reps = Coins, Heals units, Activates pending wave stacks!
      awardSetCoins: (reps = 10, isLastSetOfWorkout = false) => {
        const { 
          coins, 
          sessionStats, 
          isShopLocked, 
          pool, 
          round, 
          board, 
          bench, 
          pendingWaveBonusStacks,
          activeWorkoutExercises,
          isBossDefeated,
        } = get();

        // 1. Pending wave bonus stacks convert to active stacks!
        const activatedBonus = pendingWaveBonusStacks;
        const repsNum = typeof reps === 'number' && !isNaN(reps) && reps > 0 ? reps : 10;
        const coinsAwarded = repsNum + activatedBonus;
        const newCoins = coins + coinsAwarded;
        const newRound = round + 1;

        // 2. Full Recovery: Heal all units on board and bench to maxHp
        const healedBoard = board.map(u => u ? { ...u, hp: u.maxHp } : null);
        const healedBench = bench.map(u => u ? { ...u, hp: u.maxHp } : null);

        // 3. Roll new shop if not locked
        const nextShop = isShopLocked ? get().shop : rollShopCards(pool, 3);

        // 4. Wave 1 enemy squad for the new pause
        const activeUnits = healedBoard.filter((u): u is AutoChessUnit => u !== null && u.hp > 0);

        const nextEnemy = generateEnemySquad(
          newRound,
          1,
          pool,
          activeUnits,
          activatedBonus,
          false,
          activeWorkoutExercises
        );

        const nextShopItem = isShopLocked ? get().shopItem : rollShopItem();

        set({
          coins: newCoins,
          round: newRound,
          currentWaveInPause: 1,
          pendingWaveBonusStacks: 0,
          activeWaveBonusStacks: activatedBonus,
          shop: nextShop,
          shopItem: nextShopItem,
          isShopLocked: false,
          board: healedBoard,
          bench: healedBench,
          enemySquad: nextEnemy,
          combatState: 'idle',
          combatLog: [],
          isBossAvailable: isLastSetOfWorkout && !isBossDefeated,
          sessionStats: {
            ...sessionStats,
            totalCoinsEarned: sessionStats.totalCoinsEarned + coinsAwarded
          }
        });

        Vibration.vibrate([0, 50, 40, 50]);
      },

      rerollShop: (isFree = false) => {
        const { coins, pool } = get();
        if (!isFree && coins < 1) return;

        const newCoins = isFree ? coins : coins - 1;
        const newShop = rollShopCards(pool, 3);
        const newShopItem = rollShopItem();

        set({
          coins: newCoins,
          shop: newShop,
          shopItem: newShopItem,
          isShopLocked: false
        });
        Vibration.vibrate(40);
      },

      toggleShopLock: () => {
        set(state => ({ isShopLocked: !state.isShopLocked }));
        Vibration.vibrate(30);
      },

      buyShopCard: (shopIndex: number) => {
        const { shop, coins, board, bench, pool } = get();
        const card = shop[shopIndex];
        if (!card) return false;
        if (coins < card.cost) return false;

        // Check for 3-STAR & 2-STAR FUSION:
        const allInstances: { unit: AutoChessUnit; location: 'board' | 'bench'; index: number }[] = [];
        board.forEach((u, idx) => {
          if (u && u.cardId === card.id) allInstances.push({ unit: u, location: 'board', index: idx });
        });
        bench.forEach((u, idx) => {
          if (u && u.cardId === card.id) allInstances.push({ unit: u, location: 'bench', index: idx });
        });

        const oneStarInstances = allInstances.filter(x => x.unit.stars === 1);
        const twoStarInstances = allInstances.filter(x => x.unit.stars === 2);

        // Immediate Shop Shuffle after every purchase!
        const freshShop = rollShopCards(pool, 3);

        // Case A: Upgrade to 2-Star
        if (oneStarInstances.length >= 1) {
          const existing1Star = oneStarInstances[0];
          const newStars: 1 | 2 | 3 = 2;
          const mult = getMultiplierForStars(newStars);

          const upgradedUnit: AutoChessUnit = {
            ...existing1Star.unit,
            stars: newStars,
            atk: Math.round(card.baseAtk * mult),
            hp: Math.round(card.baseHp * mult),
            maxHp: Math.round(card.baseHp * mult)
          };

          // Check if 2★ + 2★ -> TITAN 3-STAR (★★★)!
          if (twoStarInstances.length >= 1) {
            const existing2Star = twoStarInstances[0];
            const titanStars: 1 | 2 | 3 = 3;
            const titanMult = getMultiplierForStars(titanStars);

            const titanUnit: AutoChessUnit = {
              ...existing2Star.unit,
              stars: titanStars,
              atk: Math.round(card.baseAtk * titanMult),
              hp: Math.round(card.baseHp * titanMult),
              maxHp: Math.round(card.baseHp * titanMult)
            };

            const updatedBoard = [...board];
            const updatedBench = [...bench];
            if (existing1Star.location === 'board') updatedBoard[existing1Star.index] = null;
            else updatedBench[existing1Star.index] = null;

            if (existing2Star.location === 'board') updatedBoard[existing2Star.index] = titanUnit;
            else updatedBench[existing2Star.index] = titanUnit;

            set({
              coins: coins - card.cost,
              board: updatedBoard,
              bench: updatedBench,
              shop: freshShop
            });

            Vibration.vibrate([0, 100, 80, 150]);
            return true;
          }

          const updatedBoard = [...board];
          const updatedBench = [...bench];
          if (existing1Star.location === 'board') updatedBoard[existing1Star.index] = upgradedUnit;
          else updatedBench[existing1Star.index] = upgradedUnit;

          set({
            coins: coins - card.cost,
            board: updatedBoard,
            bench: updatedBench,
            shop: freshShop
          });

          Vibration.vibrate([0, 60, 40, 80]);
          return true;
        }

        // Case B: No duplicate -> place on free board or bench slot
        const newUnit: AutoChessUnit = {
          instanceId: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          cardId: card.id,
          exerciseName: card.exerciseName,
          category: card.category,
          equipmentType: card.equipmentType,
          imageUri: card.imageUri,
          stars: 1,
          atk: card.baseAtk,
          hp: card.baseHp,
          maxHp: card.baseHp,
          cost: card.cost,
          powerScore: card.powerScore,
          maxWeight: card.maxWeight,
          totalSets: card.totalSets || 0,
          traitName: card.traitName,
          traitDesc: card.traitDesc
        };

        const freeBoardIdx = board.findIndex(slot => slot === null);
        if (freeBoardIdx !== -1) {
          const nextBoard = [...board];
          nextBoard[freeBoardIdx] = newUnit;

          set({
            coins: coins - card.cost,
            board: nextBoard,
            shop: freshShop
          });
          Vibration.vibrate(40);
          return true;
        }

        const freeBenchIdx = bench.findIndex(slot => slot === null);
        if (freeBenchIdx !== -1) {
          const nextBench = [...bench];
          nextBench[freeBenchIdx] = newUnit;

          set({
            coins: coins - card.cost,
            bench: nextBench,
            shop: freshShop
          });
          Vibration.vibrate(40);
          return true;
        }

        // Board and bench are full
        return false;
      },

      buyShopItem: () => {
        const { shopItem, coins, itemInventory } = get();
        if (!shopItem || coins < shopItem.cost) return false;
        if (itemInventory.length >= 4) return false;

        set({
          coins: coins - shopItem.cost,
          itemInventory: [...itemInventory, shopItem],
          shopItem: null
        });
        Vibration.vibrate([0, 60, 40, 80]);
        return true;
      },

      equipItem: (unitInstanceId: string, itemId: string) => {
        const { board, bench, itemInventory } = get();
        const itemIdx = itemInventory.findIndex(it => it.id === itemId);
        if (itemIdx === -1) return false;
        const itemToEquip = itemInventory[itemIdx];

        let equipped = false;
        const nextBoard = board.map(u => {
          if (u && u.instanceId === unitInstanceId) {
            const currentItems = u.items || [];
            if (currentItems.length >= 2) return u;
            equipped = true;
            return { ...u, items: [...currentItems, itemToEquip] };
          }
          return u;
        });

        const nextBench = bench.map(u => {
          if (u && u.instanceId === unitInstanceId) {
            const currentItems = u.items || [];
            if (currentItems.length >= 2) return u;
            equipped = true;
            return { ...u, items: [...currentItems, itemToEquip] };
          }
          return u;
        });

        if (equipped) {
          const nextInventory = [...itemInventory];
          nextInventory.splice(itemIdx, 1);
          set({ board: nextBoard, bench: nextBench, itemInventory: nextInventory });
          Vibration.vibrate(50);
          return true;
        }
        return false;
      },

      unequipItem: (unitInstanceId: string, itemIndex: number) => {
        const { board, bench, itemInventory } = get();
        if (itemInventory.length >= 4) return;

        let unequippedItem: AutoChessItem | null = null;
        const nextBoard = board.map(u => {
          if (u && u.instanceId === unitInstanceId && u.items && u.items[itemIndex]) {
            unequippedItem = u.items[itemIndex];
            const newItems = [...u.items];
            newItems.splice(itemIndex, 1);
            return { ...u, items: newItems };
          }
          return u;
        });

        const nextBench = bench.map(u => {
          if (u && u.instanceId === unitInstanceId && u.items && u.items[itemIndex]) {
            unequippedItem = u.items[itemIndex];
            const newItems = [...u.items];
            newItems.splice(itemIndex, 1);
            return { ...u, items: newItems };
          }
          return u;
        });

        if (unequippedItem) {
          set({
            board: nextBoard,
            bench: nextBench,
            itemInventory: [...itemInventory, unequippedItem]
          });
          Vibration.vibrate(40);
        }
      },

      claimLootDrop: () => {
        const { currentLootDrop, itemInventory } = get();
        if (!currentLootDrop) return;
        const nextInventory = itemInventory.length < 4 
          ? [...itemInventory, currentLootDrop] 
          : [...itemInventory.slice(1), currentLootDrop];
        set({
          itemInventory: nextInventory,
          currentLootDrop: null
        });
        Vibration.vibrate([0, 80, 50, 100]);
      },

      setLootDrop: (item: AutoChessItem | null) => {
        set({ currentLootDrop: item });
      },

      sellUnit: (instanceId: string, from: 'board' | 'bench') => {
        const { board, bench, coins, itemInventory } = get();
        let refundedCoins = 1;
        let returnedItems: AutoChessItem[] = [];

        if (from === 'board') {
          const idx = board.findIndex(u => u?.instanceId === instanceId);
          if (idx !== -1 && board[idx]) {
            refundedCoins = board[idx]!.cost * (board[idx]!.stars === 1 ? 1 : board[idx]!.stars === 2 ? 2 : 4);
            returnedItems = board[idx]!.items || [];
            const nextBoard = [...board];
            nextBoard[idx] = null;
            set({
              board: nextBoard,
              coins: coins + refundedCoins,
              itemInventory: [...itemInventory, ...returnedItems].slice(0, 4)
            });
          }
        } else {
          const idx = bench.findIndex(u => u?.instanceId === instanceId);
          if (idx !== -1 && bench[idx]) {
            refundedCoins = bench[idx]!.cost * (bench[idx]!.stars === 1 ? 1 : bench[idx]!.stars === 2 ? 2 : 4);
            returnedItems = bench[idx]!.items || [];
            const nextBench = [...bench];
            nextBench[idx] = null;
            set({
              bench: nextBench,
              coins: coins + refundedCoins,
              itemInventory: [...itemInventory, ...returnedItems].slice(0, 4)
            });
          }
        }
        Vibration.vibrate(40);
      },

      moveUnit: (instanceId: string, to: 'board' | 'bench', targetSlotIndex?: number) => {
        const { board, bench } = get();

        let unit: AutoChessUnit | null = null;
        let fromLocation: 'board' | 'bench' = 'board';
        let fromIndex = -1;

        const bIdx = board.findIndex(u => u?.instanceId === instanceId);
        if (bIdx !== -1) {
          unit = board[bIdx];
          fromLocation = 'board';
          fromIndex = bIdx;
        } else {
          const benchIdx = bench.findIndex(u => u?.instanceId === instanceId);
          if (benchIdx !== -1) {
            unit = bench[benchIdx];
            fromLocation = 'bench';
            fromIndex = benchIdx;
          }
        }

        if (!unit) return;

        if (to === 'board') {
          const destIndex = targetSlotIndex !== undefined ? targetSlotIndex : board.findIndex(s => s === null);
          if (destIndex === -1) return;

          const nextBoard = [...board];
          const nextBench = [...bench];
          const swappedUnit = nextBoard[destIndex];

          if (fromLocation === 'bench') {
            nextBench[fromIndex] = swappedUnit;
            nextBoard[destIndex] = unit;
          } else {
            nextBoard[fromIndex] = swappedUnit;
            nextBoard[destIndex] = unit;
          }
          set({ board: nextBoard, bench: nextBench });
        } else {
          const destIndex = targetSlotIndex !== undefined ? targetSlotIndex : bench.findIndex(s => s === null);
          if (destIndex === -1) return;

          const nextBoard = [...board];
          const nextBench = [...bench];
          const swappedUnit = nextBench[destIndex];

          if (fromLocation === 'board') {
            nextBoard[fromIndex] = swappedUnit;
            nextBench[destIndex] = unit;
          } else {
            nextBench[fromIndex] = swappedUnit;
            nextBench[destIndex] = unit;
          }
          set({ board: nextBoard, bench: nextBench });
        }
        Vibration.vibrate(30);
      },

      swapBoardUnits: (fromIndex: number, toIndex: number) => {
        const { board } = get();
        if (fromIndex < 0 || fromIndex >= board.length || toIndex < 0 || toIndex >= board.length) return;
        const nextBoard = [...board];
        const temp = nextBoard[fromIndex];
        nextBoard[fromIndex] = nextBoard[toIndex];
        nextBoard[toIndex] = temp;
        set({ board: nextBoard });
      },

      // Saves reduced HP across waves during the same pause
      saveBoardUnitHps: (hps: Record<string, number>) => {
        set(state => ({
          board: state.board.map(slot => {
            if (!slot) return null;
            const remainingHp = hps[slot.instanceId];
            if (remainingHp !== undefined) {
              return {
                ...slot,
                hp: Math.max(0, remainingHp)
              };
            }
            return slot;
          })
        }));
      },

      // Awards trophies (0 regular, +25 boss) and win bounty (+3 coins, +5 miniboss), increments pending stacks
      recordWaveVictory: (isBoss = false, isMiniBoss = false) => {
        const trophiesGained = isBoss ? 25 : 0;
        const coinsGained = isMiniBoss ? 5 : 3;
        let droppedItem: AutoChessItem | null = null;
        if (isMiniBoss) {
          droppedItem = rollMiniBossLoot(get().round);
        }
        set(state => ({
          coins: state.coins + coinsGained,
          trophies: state.trophies + trophiesGained,
          pendingWaveBonusStacks: state.pendingWaveBonusStacks + 1,
          isBossDefeated: isBoss ? true : state.isBossDefeated,
          currentLootDrop: droppedItem,
          sessionStats: {
            ...state.sessionStats,
            wins: state.sessionStats.wins + 1,
            totalCoinsEarned: state.sessionStats.totalCoinsEarned + coinsGained
          }
        }));
        return { trophiesGained, coinsGained, droppedItem };
      },

      // Spawns the next wave in the current rest pause with surviving HP
      spawnNextWave: () => {
        const { 
          currentWaveInPause, 
          round, 
          pool, 
          board, 
          activeWaveBonusStacks, 
          activeWorkoutExercises 
        } = get();
        const nextWave = currentWaveInPause + 1;
        const activeUnits = board.filter((u): u is AutoChessUnit => u !== null && u.hp > 0);
        const isMiniBoss = nextWave === 4;

        const nextEnemy = generateEnemySquad(
          round,
          nextWave,
          pool,
          activeUnits,
          activeWaveBonusStacks,
          false,
          activeWorkoutExercises,
          isMiniBoss
        );

        set({
          currentWaveInPause: nextWave,
          enemySquad: nextEnemy,
          combatState: 'idle',
          combatLog: []
        });
      },

      // Option A: Trigger Shadow Titan Boss
      triggerBossEncounter: () => {
        const { 
          round, 
          currentWaveInPause, 
          pool, 
          board, 
          activeWaveBonusStacks, 
          activeWorkoutExercises 
        } = get();
        const activeUnits = board.filter((u): u is AutoChessUnit => u !== null && u.hp > 0);

        const bossSquad = generateEnemySquad(
          round,
          currentWaveInPause,
          pool,
          activeUnits,
          activeWaveBonusStacks,
          true, // isBoss
          activeWorkoutExercises
        );

        set({
          enemySquad: bossSquad,
          combatState: 'idle',
          combatLog: []
        });
      },

      getActiveSynergies: () => {
        const { board } = get();
        const activeUnits = board.filter((u): u is AutoChessUnit => u !== null && u.hp > 0);

        const counts: Record<MuscleCategory, number> = {
          Chest: 0,
          Back: 0,
          Arms: 0,
          Shoulders: 0,
          Legs: 0,
          Core: 0
        };

        activeUnits.forEach(u => {
          counts[u.category] = (counts[u.category] || 0) + 1;
        });

        const synergies: ActiveSynergy[] = [];
        (Object.keys(counts) as MuscleCategory[]).forEach(cat => {
          const count = counts[cat];
          if (count >= 2) {
            const isMax = count >= 3;
            const level: 1 | 2 = isMax ? 2 : 1;
            const atkBonusPct = isMax ? 60 : 25;
            const hpBonusPct = isMax ? 60 : 25;
            const trait = CATEGORY_TRAITS[cat];

            synergies.push({
              category: cat,
              count,
              level,
              atkBonusPct,
              hpBonusPct,
              specialTraitName: trait.name,
              specialTraitDesc: isMax ? trait.desc : '+25% Kraft & Vitalität'
            });
          }
        });

        return synergies;
      },

      addExerciseToLivePool: (exercise) => {
        if (!exercise || !exercise.name) return;
        const { pool, activeWorkoutExercises } = get();
        const norm = exercise.name.toLowerCase().trim();
        const existsInPool = pool.some(c => c.exerciseName.toLowerCase().trim() === norm);
        let nextPool = pool;
        if (!existsInPool) {
          const category = getExerciseCategory(exercise.name);
          const history = useAppStore.getState().workoutHistory || [];
          const newCard = buildCardData(
            exercise.name,
            category,
            exercise.equipmentType || 'Freie Übung',
            history,
            exercise.imageUri
          );
          nextPool = [...pool, newCard];
        }

        const nextActive = [
          ...activeWorkoutExercises.filter(a => a.name.toLowerCase().trim() !== norm),
          {
            name: exercise.name.trim(),
            equipmentType: exercise.equipmentType,
            imageUri: exercise.imageUri
          }
        ];

        set({
          pool: nextPool,
          activeWorkoutExercises: nextActive
        });
      },

      claimTrophyMilestone: (milestoneId: string) => {
        const { trophyMilestonesClaimed } = get();
        if (trophyMilestonesClaimed.includes(milestoneId)) return;
        set({
          trophyMilestonesClaimed: [...trophyMilestonesClaimed, milestoneId]
        });
        Vibration.vibrate([0, 80, 50, 100]);
      },

      resetCombat: () => {
        set({ combatState: 'idle', combatLog: [] });
      }
    }),
    {
      name: 'pt-autochess-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        trophies: state.trophies,
        trophyMilestonesClaimed: state.trophyMilestonesClaimed,
        itemInventory: state.itemInventory || []
      })
    }
  )
);
