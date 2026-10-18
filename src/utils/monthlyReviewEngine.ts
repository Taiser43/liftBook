import { CompletedWorkout, WorkoutProgram, DailyNutritionLog } from '../store/store';

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface ExerciseImprovement {
  exerciseName: string;
  firstWeight: number;
  lastWeight: number;
  diffKg: number;
  diffPct: number;
  firstDate: string;
  lastDate: string;
}

export interface ExerciseStagnation {
  exerciseName: string;
  avgWeight: number;
  diffPct: number;
  reason: string;
  sessionsCount: number;
}

export interface MonthlyReviewData {
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // 'Oktober 2026'
  year: number;
  monthIndex: number; // 1-12
  isCurrentMonth: boolean;
  totalDaysInMonth: number;
  daysWithGoalsHit: number;
  consistencyPct: number;
  isFlawless: boolean; // 100% strict

  // Bodyweight
  weightStart: number | null;
  weightEnd: number | null;
  weightDeltaKg: number | null;
  weightDeltaPct: number | null;
  weightHistoryPoints: Array<{ date: string; weight: number }>;

  // Exercise Progress & Stagnation
  topImprovements: ExerciseImprovement[];
  stagnations: ExerciseStagnation[];

  // Favorite / Most Performed Exercise
  favoriteExercise: {
    name: string;
    totalSets: number;
    totalReps: number;
    totalVolumeKg: number;
    workoutsCount: number;
  } | null;

  // Global Volume & Extra Metrics
  totalWorkouts: number;
  totalIronMovedKg: number;
  tonnageComparison: string;
  monthlyTitle: string;
  monthlyTitleReason: string;
}

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/**
 * Helper to get number of days in a given year and month (1-based)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns available 'YYYY-MM' month keys present in workout/nutrition history,
 * plus current month, sorted descending (latest first).
 */
export function getAvailableMonths(
  workoutHistory: CompletedWorkout[] = [],
  nutritionHistory: DailyNutritionLog[] = [],
  weightHistory: WeightEntry[] = []
): string[] {
  const monthsSet = new Set<string>();

  // Always include current month
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthsSet.add(currentKey);

  workoutHistory.forEach(w => {
    if (w.date) {
      const key = w.date.substring(0, 7);
      if (key.match(/^\d{4}-\d{2}$/)) monthsSet.add(key);
    }
  });

  nutritionHistory.forEach(n => {
    if (n.date) {
      const key = n.date.substring(0, 7);
      if (key.match(/^\d{4}-\d{2}$/)) monthsSet.add(key);
    }
  });

  weightHistory.forEach(we => {
    if (we.date) {
      const key = we.date.substring(0, 7);
      if (key.match(/^\d{4}-\d{2}$/)) monthsSet.add(key);
    }
  });

  return Array.from(monthsSet).sort().reverse();
}

/**
 * Formats a 'YYYY-MM' key into German label, e.g. "Oktober 2026"
 */
export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month || month < 1 || month > 12) return monthKey;
  return `${MONTH_NAMES_DE[month - 1]} ${year}`;
}

/**
 * Computes the complete Monthly Review data for a specific 'YYYY-MM' month.
 */
export function calculateMonthlyReview(
  monthKey: string,
  workoutHistory: CompletedWorkout[],
  nutritionHistory: DailyNutritionLog[],
  weightHistory: WeightEntry[],
  programs: WorkoutProgram[] = []
): MonthlyReviewData {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDays = getDaysInMonth(year, month);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = year === currentYear && month === currentMonth;
  const daysEvaluated = isCurrentMonth ? Math.min(totalDays, now.getDate()) : totalDays;

  // ── 1. GOAL CONSISTENCY CALCULATION (100% Strict) ─────────────────────
  const activeProgram = programs.find(p => p.isActive);
  const currentWorkouts = activeProgram ? activeProgram.workouts : [];

  const isDayScheduled = (dayOfWeekName: string) => {
    return currentWorkouts.some(plan =>
      Array.isArray(plan.daysOfWeek) && plan.daysOfWeek.some(d => d.toLowerCase() === dayOfWeekName.toLowerCase())
    );
  };

  const workoutDaysSet = new Set(
    workoutHistory
      .filter(w => w.date.startsWith(monthKey))
      .map(w => w.date.substring(0, 10))
  );

  const nutritionDaysMap = new Map(
    nutritionHistory
      .filter(n => n.date.startsWith(monthKey))
      .map(n => [n.date, n.hitGoal])
  );

  let daysWithGoalsHit = 0;

  for (let day = 1; day <= daysEvaluated; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${monthKey}-${dayStr}`;
    const dateObj = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const scheduled = isDayScheduled(dayOfWeek);
    const workedOut = workoutDaysSet.has(dateStr);
    const hitNutr = nutritionDaysMap.get(dateStr) ?? false;

    // A day is satisfied if:
    // (workedOut OR rest day) AND nutrition goal hit
    const workoutSatisfied = scheduled ? workedOut : true;
    if (workoutSatisfied && hitNutr) {
      daysWithGoalsHit++;
    }
  }

  const consistencyPct = daysEvaluated > 0
    ? Math.round((daysWithGoalsHit / daysEvaluated) * 100)
    : 0;

  // Flawless Month rule: ONLY past completed months can be flawless, with 100% strictly hit
  const isFlawless = !isCurrentMonth && daysWithGoalsHit === totalDays && totalDays > 0;

  // ── 2. BODYWEIGHT DEVELOPMENT ─────────────────────────────────────────
  const monthWeights = (weightHistory || [])
    .filter(we => we.date && we.date.startsWith(monthKey) && we.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let weightStart: number | null = null;
  let weightEnd: number | null = null;
  let weightDeltaKg: number | null = null;
  let weightDeltaPct: number | null = null;

  if (monthWeights.length > 0) {
    weightStart = monthWeights[0].weight;
    weightEnd = monthWeights[monthWeights.length - 1].weight;
    weightDeltaKg = Math.round((weightEnd - weightStart) * 10) / 10;
    if (weightStart > 0) {
      weightDeltaPct = Math.round(((weightEnd - weightStart) / weightStart) * 1000) / 10;
    }
  }

  // ── 3. WORKOUTS, TONNAGE & EXERCISE PROGRESS ──────────────────────────
  const monthWorkouts = (workoutHistory || [])
    .filter(w => w.date && w.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalIronMovedKg = 0;

  // Track each exercise session: exerciseName -> Array<{ date: string; maxWeight: number; totalVolume: number; totalSets: number; totalReps: number }>
  const exerciseSessionsMap = new Map<string, Array<{
    date: string;
    maxWeight: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
  }>>();

  monthWorkouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      const name = ex.name.trim();
      let maxWeightInSession = 0;
      let sessionVolume = 0;
      let sessionSets = 0;
      let sessionReps = 0;

      (ex.sets || []).forEach(s => {
        const setWeight = s.weight || 0;
        const setReps = s.reps || 0;
        if (setWeight > maxWeightInSession) {
          maxWeightInSession = setWeight;
        }
        const setVol = setWeight * setReps;
        sessionVolume += setVol;
        totalIronMovedKg += setVol;
        sessionSets++;
        sessionReps += setReps;
      });

      if (!exerciseSessionsMap.has(name)) {
        exerciseSessionsMap.set(name, []);
      }
      exerciseSessionsMap.get(name)!.push({
        date: w.date.substring(0, 10),
        maxWeight: maxWeightInSession,
        totalVolume: sessionVolume,
        totalSets: sessionSets,
        totalReps: sessionReps
      });
    });
  });

  // Calculate Progression & Stagnation for exercises trained >= 2 times
  const improvements: ExerciseImprovement[] = [];
  const stagnations: ExerciseStagnation[] = [];

  exerciseSessionsMap.forEach((sessions, exName) => {
    if (sessions.length < 2) return;

    const first = sessions[0];
    const last = sessions[sessions.length - 1];

    if (first.maxWeight > 0) {
      const diffKg = Math.round((last.maxWeight - first.maxWeight) * 10) / 10;
      const diffPct = Math.round(((last.maxWeight - first.maxWeight) / first.maxWeight) * 1000) / 10;

      if (diffKg > 0) {
        improvements.push({
          exerciseName: exName,
          firstWeight: first.maxWeight,
          lastWeight: last.maxWeight,
          diffKg,
          diffPct,
          firstDate: first.date,
          lastDate: last.date
        });
      } else {
        stagnations.push({
          exerciseName: exName,
          avgWeight: last.maxWeight,
          diffPct,
          reason: diffKg === 0 ? 'Gewicht konstant gehalten' : 'Leichte Gewichts-Reduktion',
          sessionsCount: sessions.length
        });
      }
    } else {
      // Bodyweight exercises (track reps increase)
      const firstReps = first.totalReps / (first.totalSets || 1);
      const lastReps = last.totalReps / (last.totalSets || 1);
      const diffReps = Math.round((lastReps - firstReps) * 10) / 10;
      if (firstReps > 0) {
        const diffPct = Math.round(((lastReps - firstReps) / firstReps) * 1000) / 10;
        if (diffReps > 0) {
          improvements.push({
            exerciseName: exName,
            firstWeight: Math.round(firstReps),
            lastWeight: Math.round(lastReps),
            diffKg: diffReps,
            diffPct,
            firstDate: first.date,
            lastDate: last.date
          });
        } else {
          stagnations.push({
            exerciseName: exName,
            avgWeight: Math.round(lastReps),
            diffPct,
            reason: 'Wiederholungen stagniert',
            sessionsCount: sessions.length
          });
        }
      }
    }
  });

  // Sort Top 3 Improvements (highest % first)
  improvements.sort((a, b) => b.diffPct - a.diffPct);
  const topImprovements = improvements.slice(0, 3);

  // Sort Top 3 Stagnations (lowest % / 0% first with most sessions)
  stagnations.sort((a, b) => {
    if (a.diffPct !== b.diffPct) return a.diffPct - b.diffPct;
    return b.sessionsCount - a.sessionsCount;
  });
  const topStagnations = stagnations.slice(0, 3);

  // ── 4. FAVORITE EXERCISE („KÖNIG DES MONATS“) ─────────────────────────
  let favoriteExercise: MonthlyReviewData['favoriteExercise'] = null;
  let maxSets = 0;

  exerciseSessionsMap.forEach((sessions, exName) => {
    const totalSets = sessions.reduce((acc, s) => acc + s.totalSets, 0);
    const totalReps = sessions.reduce((acc, s) => acc + s.totalReps, 0);
    const totalVolumeKg = sessions.reduce((acc, s) => acc + s.totalVolume, 0);

    if (totalSets > maxSets) {
      maxSets = totalSets;
      favoriteExercise = {
        name: exName,
        totalSets,
        totalReps,
        totalVolumeKg,
        workoutsCount: sessions.length
      };
    }
  });

  // ── 5. TONNAGE REAL-WORLD COMPARISON ──────────────────────────────────
  const tonnageTons = totalIronMovedKg / 1000;
  let tonnageComparison = '';
  if (tonnageTons >= 120) {
    const whales = (tonnageTons / 130).toFixed(1);
    tonnageComparison = `≈ ${whales} ausgewachsene Blauwale 🐋`;
  } else if (tonnageTons >= 40) {
    const cars = Math.round(tonnageTons / 1.5);
    tonnageComparison = `≈ ${cars} VW Golf Kleinwagen 🚗`;
  } else if (tonnageTons >= 10) {
    const elephants = (tonnageTons / 5).toFixed(1);
    tonnageComparison = `≈ ${elephants} afrikanische Elefanten 🐘`;
  } else {
    tonnageComparison = `≈ ${(tonnageTons * 1000).toLocaleString('de-CH')} kg reines Eisen`;
  }

  // ── 6. MONTHLY TITLE & ARCHETYPE ──────────────────────────────────────
  let monthlyTitle = '« Der Eiserne Athlet »';
  let monthlyTitleReason = 'Solide Beständigkeit und kontinuierliche Progression.';

  if (isFlawless) {
    monthlyTitle = '« Der Unbeugsame Titan »';
    monthlyTitleReason = '100% makelloser Monat ohne einen einzigen Fehltritt!';
  } else if (consistencyPct >= 90) {
    monthlyTitle = '« Die Disziplin-Maschine »';
    monthlyTitleReason = `Über ${consistencyPct}% Konsistenz in Training und Ernährung.`;
  } else if (tonnageTons >= 150) {
    monthlyTitle = '« Der Koloss von Iron Tactics »';
    monthlyTitleReason = `Unglaubliche ${tonnageTons.toFixed(1)} Tonnen bewegt!`;
  } else if (topImprovements.length > 0 && topImprovements[0].diffPct >= 20) {
    monthlyTitle = '« Der Kraft-Explosivling »';
    monthlyTitleReason = `Extremer Kraftzuwachs (+${topImprovements[0].diffPct}%) bei ${topImprovements[0].exerciseName}.`;
  }

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    year,
    monthIndex: month,
    isCurrentMonth,
    totalDaysInMonth: totalDays,
    daysWithGoalsHit,
    consistencyPct,
    isFlawless,
    weightStart,
    weightEnd,
    weightDeltaKg,
    weightDeltaPct,
    weightHistoryPoints: monthWeights,
    topImprovements,
    stagnations: topStagnations,
    favoriteExercise,
    totalWorkouts: monthWorkouts.length,
    totalIronMovedKg,
    tonnageComparison,
    monthlyTitle,
    monthlyTitleReason
  };
}
