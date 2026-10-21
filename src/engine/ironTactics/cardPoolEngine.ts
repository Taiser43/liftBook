import { PRELOADED_EXERCISES, resolveExerciseMuscleInfo, normalizeMuscleCategory } from '../../data/exercises';
import {
  AutoChessCardData,
  MuscleCategory,
  getExerciseCategory,
  buildCardData,
  useAutoChessStore,
} from '../../store/useAutoChessStore';
import { useAppStore } from '../../store/store';
import { getResolvedUri } from '../../utils/uriResolver';

/**
 * Checks whether a card matches a stored card ID (supporting exact IDs, case-insensitive, or legacy slugs).
 */
export const matchesCardId = (pattern: string, card: AutoChessCardData): boolean => {
  if (!pattern || !card) return false;
  if (card.id === pattern || card.exerciseName === pattern) return true;

  const target = pattern.toLowerCase().replace(/[\s\-_()]/g, '');
  const idNorm = (card.id || '').toLowerCase().replace(/[\s\-_()]/g, '');
  const nameNorm = (card.exerciseName || '').toLowerCase().replace(/[\s\-_()]/g, '');

  if (idNorm === target || nameNorm === target) return true;

  // Legacy mappings from initial decks to real exercise names
  if (target === 'bankdruecken' && (nameNorm.includes('benchpress') || nameNorm.includes('bankdruecken') || nameNorm.includes('chestpress'))) return true;
  if (target === 'fliegende' && (nameNorm.includes('fly') || nameNorm.includes('fliegende') || nameNorm.includes('pecdeck'))) return true;
  if (target === 'latzug' && (nameNorm.includes('pulldown') || nameNorm.includes('latzug') || nameNorm.includes('pullup'))) return true;
  if (target === 'rudern' && (nameNorm.includes('row') || nameNorm.includes('rudern'))) return true;
  if (target === 'bizeps_curls' && (nameNorm.includes('curl') || nameNorm.includes('bicep') || nameNorm.includes('bizeps'))) return true;
  if (target === 'trizeps_druecken' && (nameNorm.includes('tricep') || nameNorm.includes('trizeps') || nameNorm.includes('extension') || nameNorm.includes('dip'))) return true;
  if (target === 'schulterdruecken' && (nameNorm.includes('shoulder') || nameNorm.includes('overhead') || nameNorm.includes('ohp') || nameNorm.includes('schulter'))) return true;
  if (target === 'kniebeugen' && (nameNorm.includes('squat') || nameNorm.includes('kniebeuge') || nameNorm.includes('legpress'))) return true;

  return false;
};

/**
 * Resolves the master Iron Tactics card pool following the exact game rules:
 * 1. ALL user-created custom exercises are included.
 * 2. Standard exercises ONLY if saved in an active workout program or spontaneous/freestyle workout.
 * 3. Fallback: If total exercises < 8, backfill from PRELOADED_EXERCISES so the player can always play.
 */
export const resolveIronTacticsCardPool = (): AutoChessCardData[] => {
  const appState = useAppStore.getState();
  const customExercises = appState.customExercises || [];
  const workoutPrograms = appState.workoutPrograms || [];
  const spontaneousWorkouts = appState.spontaneousWorkouts || [];
  const history = appState.workoutHistory || [];
  const collectibleImages = appState.collectibleImages || {};

  const resolveImage = (name: string, fallbackUri?: string): string | undefined => {
    const norm = name.toLowerCase().trim();
    const raw = collectibleImages[`exercise_${name}`] || 
                collectibleImages[`exercise_${norm}`] ||
                (customExercises?.find(c => c.name?.toLowerCase().trim() === norm) as any)?.imageUri ||
                fallbackUri;
    return getResolvedUri(raw);
  };

  const exerciseMap = new Map<
    string,
    { name: string; category?: string; targetMuscle?: string; equipmentType?: string; imageUri?: string }
  >();

  // 1. All user-created custom exercises from the library
  customExercises.forEach(c => {
    if (c.name && c.name.trim().length > 0) {
      exerciseMap.set(c.name.toLowerCase().trim(), {
        name: c.name.trim(),
        category: c.category,
        targetMuscle: c.targetMuscle,
        equipmentType: c.equipmentType || 'Freie Übung',
        imageUri: resolveImage(c.name, (c as any).imageUri),
      });
    }
  });

  // 2. Standard exercises in active workout programs
  const activeProgram = workoutPrograms.find(p => p.isActive) || workoutPrograms[0];
  if (activeProgram && activeProgram.workouts) {
    activeProgram.workouts.forEach(w => {
      if (w.exercises) {
        w.exercises.forEach(e => {
          if (e.name && e.name.trim().length > 0) {
            const key = e.name.toLowerCase().trim();
            if (!exerciseMap.has(key)) {
              exerciseMap.set(key, {
                name: e.name.trim(),
                category: (e as any).category,
                targetMuscle: (e as any).targetMuscle,
                equipmentType: (e as any).equipmentType || 'Maschine',
                imageUri: resolveImage(e.name, (e as any).imageUri),
              });
            }
          }
        });
      }
    });
  }

  // 3. Standard exercises in spontaneous/freestyle workouts
  spontaneousWorkouts.forEach(w => {
    if (w.exercises) {
      w.exercises.forEach(e => {
        if (e.name && e.name.trim().length > 0) {
          const key = e.name.toLowerCase().trim();
          if (!exerciseMap.has(key)) {
            exerciseMap.set(key, {
              name: e.name.trim(),
              category: (e as any).category,
              targetMuscle: (e as any).targetMuscle,
              equipmentType: (e as any).equipmentType || 'Freie Übung',
              imageUri: resolveImage(e.name, (e as any).imageUri),
            });
          }
        }
      });
    }
  });

  // 4. Backfill from PRELOADED_EXERCISES if fewer than 8 cards
  if (exerciseMap.size < 8) {
    for (const p of PRELOADED_EXERCISES) {
      const key = p.name.toLowerCase().trim();
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          name: p.name,
          category: p.category,
          targetMuscle: p.targetMuscle,
          equipmentType: p.equipmentType || 'Freie Übung',
          imageUri: resolveImage(p.name, (p as any).imageUri),
        });
      }
      if (exerciseMap.size >= 12) break;
    }
  }

  // Convert map to AutoChessCardData with real workout history stats & library category
  const pool: AutoChessCardData[] = [];
  exerciseMap.forEach(({ name, category: explicitCat, targetMuscle, equipmentType, imageUri }) => {
    const muscleInfo = resolveExerciseMuscleInfo(name, customExercises);
    const category = (explicitCat && normalizeMuscleCategory(explicitCat)) || muscleInfo.majorGroup;
    const finalTarget = targetMuscle || muscleInfo.targetMuscle;
    const card = buildCardData(name, category, equipmentType || 'Freie Übung', history, imageUri, finalTarget);
    pool.push(card);
  });

  // Keep useAutoChessStore in sync
  if (pool.length > 0) {
    try {
      useAutoChessStore.setState({ pool });
    } catch {
      // ignore
    }
  }

  return pool;
};

/**
 * Explicit helper to force immediate card pool recalculation
 */
export const refreshIronTacticsCardPool = (): AutoChessCardData[] => {
  return resolveIronTacticsCardPool();
};

/**
 * Returns matching cards for a deck from the provided pool.
 * Fallbacks safely to pool slice so it NEVER returns an empty array if pool has cards.
 */
export const getDeckCardsFromPool = (
  deckCardIds: string[],
  pool: AutoChessCardData[]
): AutoChessCardData[] => {
  if (!pool || pool.length === 0) return [];

  const matched: AutoChessCardData[] = [];
  const addedIds = new Set<string>();

  // 1. Try exact or fuzzy matching for each deck ID
  for (const id of deckCardIds) {
    const found = pool.find(c => matchesCardId(id, c) && !addedIds.has(c.id));
    if (found) {
      matched.push(found);
      addedIds.add(found.id);
    }
  }

  // 2. If fewer than 4 cards matched (e.g. fresh installation or old slugs), fill with remaining pool
  if (matched.length < 4) {
    for (const card of pool) {
      if (!addedIds.has(card.id)) {
        matched.push(card);
        addedIds.add(card.id);
      }
      if (matched.length >= 8) break;
    }
  }

  return matched;
};
