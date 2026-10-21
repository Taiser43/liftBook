import { useAppStore } from '../../store/store';
import { PRELOADED_EXERCISES, resolveExerciseMuscleInfo } from '../../data/exercises';
import { getExerciseCategory, MuscleCategory } from '../../store/useAutoChessStore';
import { getResolvedUri } from '../../utils/uriResolver';

export interface DailyShopOffer {
  id: string; // exercise name or normalized id
  name: string;
  category: MuscleCategory | string;
  targetMuscle: string;
  equipmentType: string;
  imageUri?: string;
  fragments: number;
  costEisen: number;
  purchased: boolean;
  source: 'custom' | 'active_tp' | 'standard';
}

export interface CandidateShopExercise {
  id: string;
  name: string;
  category: MuscleCategory | string;
  targetMuscle: string;
  equipmentType: string;
  imageUri?: string;
  source: 'custom' | 'active_tp' | 'standard';
}

/**
 * Returns today's local date key YYYY-MM-DD.
 */
export const getLocalDateKey = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates remaining time until 24:00 (midnight local time).
 */
export const getTimeUntilMidnight = (): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  formatted: string;
} => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const totalMs = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  const formatted = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return { hours, minutes, seconds, totalMs, formatted };
};

/**
 * Collects eligible exercises strictly according to user rules:
 * 1. All user-created custom exercises ('custom').
 * 2. Exercises contained in the active workout program(s) or active plan ('active_tp').
 * 3. Fallback: If total < 4, backfill from standard PRELOADED_EXERCISES ('standard').
 */
export const getEligibleShopExercises = (): CandidateShopExercise[] => {
  const appState = useAppStore.getState();
  const customExercises = appState.customExercises || [];
  const workoutPrograms = appState.workoutPrograms || [];
  const globalActivePlan = appState.globalActivePlan;
  const collectibleImages = appState.collectibleImages || {};

  const resolveImage = (name: string, rawFallback?: string): string | undefined => {
    const norm = name.toLowerCase().trim();
    const raw = collectibleImages[`exercise_${name}`] || 
                collectibleImages[`exercise_${norm}`] ||
                rawFallback;
    return getResolvedUri(raw);
  };

  const map = new Map<string, CandidateShopExercise>();

  // 1. User's custom exercises
  customExercises.forEach(c => {
    if (c.name && c.name.trim().length > 0) {
      const norm = c.name.toLowerCase().trim();
      const muscleInfo = resolveExerciseMuscleInfo(c.name, customExercises);
      map.set(norm, {
        id: c.name.trim(),
        name: c.name.trim(),
        category: muscleInfo.majorGroup,
        targetMuscle: muscleInfo.targetMuscle,
        equipmentType: c.equipmentType || 'Freie Übung',
        imageUri: resolveImage(c.name, (c as any).imageUri),
        source: 'custom',
      });
    }
  });

  // 2. Exercises from active workout programs
  const activePrograms = workoutPrograms.filter(p => p.isActive);
  const primaryPrograms = activePrograms.length > 0 ? activePrograms : workoutPrograms.slice(0, 1);

  primaryPrograms.forEach(prog => {
    (prog.workouts || []).forEach(w => {
      (w.exercises || []).forEach(e => {
        if (e.name && e.name.trim().length > 0) {
          const norm = e.name.toLowerCase().trim();
          if (!map.has(norm)) {
            const muscleInfo = resolveExerciseMuscleInfo(e.name, customExercises);
            map.set(norm, {
              id: e.name.trim(),
              name: e.name.trim(),
              category: muscleInfo.majorGroup,
              targetMuscle: muscleInfo.targetMuscle,
              equipmentType: (e as any).equipmentType || 'Maschine',
              imageUri: resolveImage(e.name, (e as any).imageUri),
              source: 'active_tp',
            });
          }
        }
      });
    });
  });

  // Also include globalActivePlan exercises if present
  if (globalActivePlan && globalActivePlan.exercises) {
    globalActivePlan.exercises.forEach(e => {
      if (e.name && e.name.trim().length > 0) {
        const norm = e.name.toLowerCase().trim();
        if (!map.has(norm)) {
          const muscleInfo = resolveExerciseMuscleInfo(e.name, customExercises);
          map.set(norm, {
            id: e.name.trim(),
            name: e.name.trim(),
            category: muscleInfo.majorGroup,
            targetMuscle: muscleInfo.targetMuscle,
            equipmentType: (e as any).equipmentType || 'Freie Übung',
            imageUri: resolveImage(e.name, (e as any).imageUri),
            source: 'active_tp',
          });
        }
      }
    });
  }

  const primaryCandidates = Array.from(map.values());

  // If user has >= 4 exercises from custom + active TP, strictly use only those!
  if (primaryCandidates.length >= 4) {
    return primaryCandidates;
  }

  // 3. Fallback: If fewer than 4 exercises, backfill with PRELOADED_EXERCISES
  for (const p of PRELOADED_EXERCISES) {
    const norm = p.name.toLowerCase().trim();
    if (!map.has(norm)) {
      map.set(norm, {
        id: p.name,
        name: p.name,
        category: p.category,
        targetMuscle: p.targetMuscle,
        equipmentType: p.equipmentType || 'Freie Übung',
        imageUri: resolveImage(p.name, (p as any).imageUri),
        source: 'standard',
      });
    }
    if (map.size >= 12) break;
  }

  return Array.from(map.values());
};

/**
 * Deterministic pseudo-random number generator seeded with a daily date string.
 * This guarantees the exact same 4 offers throughout the day, and completely new offers at 24:00.
 */
function createDailyPRNG(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function nextRandom(): number {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates 4 distinct Daily Shop Offers for the given dateKey.
 */
export const generateDailyShopOffers = (dateKey: string = getLocalDateKey()): DailyShopOffer[] => {
  const candidates = getEligibleShopExercises();
  const rng = createDailyPRNG(`daily_shop_iron_tactics_${dateKey}`);

  // Fisher-Yates shuffle with seeded RNG
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Select top 4 distinct items
  const selected = shuffled.slice(0, 4);

  // If still fewer than 4 (extreme edge case with empty db), pad with basic defaults
  while (selected.length < 4) {
    const dummyIdx = selected.length + 1;
    selected.push({
      id: `fallback_${dummyIdx}`,
      name: dummyIdx === 1 ? 'Bankdrücken' : dummyIdx === 2 ? 'Klimmzüge' : dummyIdx === 3 ? 'Kniebeugen' : 'Schulterdrücken',
      category: dummyIdx === 1 ? 'Chest' : dummyIdx === 2 ? 'Back' : dummyIdx === 3 ? 'Legs' : 'Shoulders',
      targetMuscle: 'Standard',
      equipmentType: 'Freie Übung',
      source: 'standard',
    });
  }

  // Define fragment counts and Eisen costs (e.g. 10, 15, 20, 25 fragments)
  const fragmentTiers = [12, 15, 20, 25];

  return selected.map((cand, idx) => {
    // Variety in fragment count: use tier based on index or pseudo-random
    const fragIdx = Math.floor(rng() * fragmentTiers.length);
    const frags = fragmentTiers[(idx + fragIdx) % fragmentTiers.length];
    
    // Fair Eisen cost formula: ~6 Eisen per fragment (e.g. 12 frags = 72 Eisen, 15 frags = 90, 20 frags = 120, 25 frags = 150)
    const costEisen = frags * 6;

    return {
      id: cand.id,
      name: cand.name,
      category: cand.category,
      targetMuscle: cand.targetMuscle,
      equipmentType: cand.equipmentType,
      imageUri: cand.imageUri,
      fragments: frags,
      costEisen,
      purchased: false,
      source: cand.source,
    };
  });
};
