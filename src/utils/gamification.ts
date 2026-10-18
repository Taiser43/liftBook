import { CompletedWorkout, DailyNutritionLog } from '../store/store';

const LEVEL_BASE = 1000;

export const getLevelData = (xp: number) => {
  if (xp < 0) xp = 0;
  
  const level = Math.floor(Math.pow(xp / LEVEL_BASE, 1 / 1.5)) + 1;
  const currentLevelXP = Math.round(Math.floor(LEVEL_BASE * Math.pow(level - 1, 1.5)) / 100) * 100;
  const nextLevelXP = Math.round(Math.floor(LEVEL_BASE * Math.pow(level, 1.5)) / 100) * 100;
  
  let rank = "Bronze";
  let rankColor = "#CD7F32";
  if (level >= 41) { rank = "Challenger"; rankColor = "#E51400"; }
  else if (level >= 31) { rank = "Emerald"; rankColor = "#50C878"; }
  else if (level >= 21) { rank = "Gold"; rankColor = "#FFD700"; }
  else if (level >= 11) { rank = "Silver"; rankColor = "#C0C0C0"; }

  const getTitle = (l: number) => {
    if (l >= 41) return "Apex Titan";
    if (l >= 31) return "Diamond Colossus";
    if (l >= 21) return "Golden Gladiator";
    if (l >= 11) return "Steel Spartan";
    return "Iron Novice";
  };

  return {
    level,
    progressXP: xp - currentLevelXP,
    neededXP: nextLevelXP - currentLevelXP,
    totalXP: xp,
    rank,
    rankColor,
    title: getTitle(level)
  };
};

// Dedicated level system for recipe cards.
// 1 log = 1 XP. Rank thresholds (doubled requirements, Challenger minimum 150):
//   Bronze:     0 – 39 logs   (levels 1–10)
//   Silver:    40 – 79 logs   (levels 11–20)
//   Gold:      80 – 119 logs  (levels 21–30)
//   Emerald:  120 – 149 logs  (levels 31–40)
//   Challenger: 150+ logs     (levels 41+)
const RECIPE_RANK_THRESHOLDS = [0, 40, 80, 120, 150] as const;
const RECIPE_RANKS = ['Bronze', 'Silver', 'Gold', 'Emerald', 'Challenger'] as const;
const RECIPE_COLORS = ['#CD7F32', '#C0C0C0', '#FFD700', '#50C878', '#E51400'] as const;

export const getRecipeLevelData = (logs: number) => {
  if (logs < 0) logs = 0;

  // Determine rank index
  let rankIdx = 0;
  for (let i = RECIPE_RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (logs >= RECIPE_RANK_THRESHOLDS[i]) { rankIdx = i; break; }
  }

  const rank = RECIPE_RANKS[rankIdx];
  const rankColor = RECIPE_COLORS[rankIdx];

  // Level: 10 levels per rank tier, progressing within each 40-log band (except Challenger which is open-ended)
  const tierStart = RECIPE_RANK_THRESHOLDS[rankIdx];
  const tierEnd = rankIdx < RECIPE_RANK_THRESHOLDS.length - 1
    ? RECIPE_RANK_THRESHOLDS[rankIdx + 1]
    : tierStart + 40; // Challenger continues past 150

  const tierRange = tierEnd - tierStart;
  const withinTier = Math.min(logs - tierStart, tierRange);
  const levelInTier = Math.floor((withinTier / tierRange) * 10); // 0-9
  const level = rankIdx * 10 + levelInTier + 1;

  const currentLevelLogs = tierStart + Math.floor(levelInTier * (tierRange / 10));
  const nextLevelLogs = tierStart + Math.floor((levelInTier + 1) * (tierRange / 10));

  return {
    level,
    progressXP: logs - currentLevelLogs,
    neededXP: Math.max(1, nextLevelLogs - currentLevelLogs),
    totalXP: logs,
    rank,
    rankColor,
  };
};

const CARDIO_LEVEL_BASE = 500; // Slightly faster leveling for specific cardio activities

export const getCardioLevelData = (xp: number) => {
  if (xp < 0) xp = 0;
  
  const level = Math.floor(Math.pow(xp / CARDIO_LEVEL_BASE, 1 / 1.5)) + 1;
  const currentLevelXP = Math.round(Math.floor(CARDIO_LEVEL_BASE * Math.pow(level - 1, 1.5)) / 100) * 100;
  const nextLevelXP = Math.round(Math.floor(CARDIO_LEVEL_BASE * Math.pow(level, 1.5)) / 100) * 100;
  
  let rank = "Bronze";
  let rankColor = "#CD7F32";
  if (level >= 41) { rank = "Challenger"; rankColor = "#E51400"; }
  else if (level >= 31) { rank = "Emerald"; rankColor = "#50C878"; }
  else if (level >= 21) { rank = "Gold"; rankColor = "#FFD700"; }
  else if (level >= 11) { rank = "Silver"; rankColor = "#C0C0C0"; }

  return {
    level,
    progressXP: xp - currentLevelXP,
    neededXP: nextLevelXP - currentLevelXP,
    totalXP: xp,
    rank,
    rankColor,
  };
};

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  tier: 'Locked' | 'Bronze' | 'Silver' | 'Gold' | 'Emerald' | 'Challenger';
  tierColor: string;
  icon: string;
  progress: number;
  max: number;
}

export const calculateAchievements = (
  workoutHistory: CompletedWorkout[],
  nutritionHistory: DailyNutritionLog[],
  unlockedIDs: string[]
): AchievementBadge[] => {
  const getTierAndColor = (val: number, thresholds: number[]) => {
    if (val >= thresholds[4]) return { tier: 'Challenger' as const, color: '#E51400', next: thresholds[4] };
    if (val >= thresholds[3]) return { tier: 'Emerald' as const, color: '#50C878', next: thresholds[4] };
    if (val >= thresholds[2]) return { tier: 'Gold' as const, color: '#FFD700', next: thresholds[3] };
    if (val >= thresholds[1]) return { tier: 'Silver' as const, color: '#C0C0C0', next: thresholds[2] };
    if (val >= thresholds[0]) return { tier: 'Bronze' as const, color: '#CD7F32', next: thresholds[1] };
    return { tier: 'Locked' as const, color: '#333333', next: thresholds[0] };
  };

  // Basic Stats Calculation
  const workoutCount = workoutHistory.length;
  let maxWeight = 0;
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let benchPressMax = 0;
  let squatMax = 0;
  let deadliftMax = 0;
  let pullupMax = 0;
  let pushupMax = 0;
  let runDistance = 0;
  let cycleDistance = 0;
  let swimDistance = 0;
  const uniqueExercises = new Set<string>();
  
  workoutHistory.forEach(w => {
    w.exercises.forEach(e => {
      uniqueExercises.add(e.name);
      e.sets.forEach(s => {
        const wgt = s.weight || 0;
        const rep = s.reps || 0;
        
        if (wgt > maxWeight) maxWeight = wgt;
        totalVolume += (wgt * rep);
        totalSets += 1;
        totalReps += rep;
        
        // Specific Exercises Max
        const n = e.name.toLowerCase();
        if (n.includes('bench press') && wgt > benchPressMax) benchPressMax = wgt;
        if (n.includes('squat') && wgt > squatMax) squatMax = wgt;
        if (n.includes('deadlift') && wgt > deadliftMax) deadliftMax = wgt;
        if (n.includes('pull') && n.includes('up') && rep > pullupMax) pullupMax = rep;
        if (n.includes('push') && n.includes('up') && rep > pushupMax) pushupMax = rep;
        
        // Cardio Tracking (reps = distance)
        if (n.includes('run') || n.includes('jog') || n.includes('treadmill')) runDistance += rep;
        if (n.includes('cycle') || n.includes('bike') || n.includes('spin')) cycleDistance += rep;
        if (n.includes('swim')) swimDistance += rep;
      });
    });
  });

  const nutritionCount = nutritionHistory.filter(n => n.hitGoal).length;

  // Arrays of thresholds [Bronze, Silver, Gold, Diamond, Challenger]
  const achList = [
    { id: 'ach_workouts', title: 'The Iron Path', desc: 'Total Workouts Logged', val: workoutCount, th: [10, 50, 100, 250, 500], icon: 'dumbbell' },
    { id: 'ach_weight', title: 'Heavyweight', desc: 'Heaviest Weight Lifted (kg)', val: maxWeight, th: [50, 100, 140, 180, 220], icon: 'weight-lifter' },
    { id: 'ach_nutrition', title: 'Fuel the Machine', desc: 'Perfect Nutrition Days', val: nutritionCount, th: [5, 20, 50, 100, 365], icon: 'food-apple' },
    { id: 'ach_volume', title: 'Mountain Mover', desc: 'Total Volume Lifted (kg)', val: totalVolume, th: [10000, 50000, 250000, 1000000, 5000000], icon: 'arm-flex' },
    { id: 'ach_sets', title: 'Relentless', desc: 'Total Sets Completed', val: totalSets, th: [100, 500, 1500, 5000, 10000], icon: 'repeat' },
    { id: 'ach_reps', title: 'Endurance King', desc: 'Total Reps Completed', val: totalReps, th: [1000, 5000, 15000, 50000, 100000], icon: 'fire' },
    { id: 'ach_unique', title: 'The Scientist', desc: 'Unique Exercises Performed', val: uniqueExercises.size, th: [10, 25, 50, 100, 200], icon: 'test-tube' },
    { id: 'ach_bench', title: 'Chest of Steel', desc: 'Bench Press PR (kg)', val: benchPressMax, th: [60, 80, 100, 140, 180], icon: 'human-handsup' },
    { id: 'ach_squat', title: 'Trunk of the Tree', desc: 'Squat PR (kg)', val: squatMax, th: [80, 100, 140, 180, 220], icon: 'human-handsdown' },
    { id: 'ach_deadlift', title: 'Earth Puller', desc: 'Deadlift PR (kg)', val: deadliftMax, th: [100, 140, 180, 220, 260], icon: 'human-dolly' },
    { id: 'ach_pullups', title: 'Defy Gravity', desc: 'Max Pull-Ups in one set', val: pullupMax, th: [5, 10, 15, 20, 30], icon: 'human' },
    { id: 'ach_pushups', title: 'Ground Force', desc: 'Max Push-Ups in one set', val: pushupMax, th: [20, 40, 60, 80, 100], icon: 'human-handsdown' },
    { id: 'ach_run', title: 'Marathoner', desc: 'Total Running Distance (km)', val: runDistance, th: [10, 50, 100, 500, 1000], icon: 'run' },
    { id: 'ach_cycle', title: 'Tour de Force', desc: 'Total Cycling Distance (km)', val: cycleDistance, th: [50, 200, 500, 1000, 5000], icon: 'bike' },
    { id: 'ach_swim', title: 'Aquaman', desc: 'Total Swimming Distance (km)', val: swimDistance, th: [5, 15, 50, 100, 250], icon: 'swim' },
    { id: 'ach_consistency', title: 'Unbreakable', desc: 'Log Workouts in a month', val: workoutCount, th: [5, 10, 15, 20, 25], icon: 'calendar-check' },
  ];

  return achList.map(a => {
    const t = getTierAndColor(a.val, a.th);
    return {
      id: a.id,
      title: a.title,
      description: a.desc,
      tier: t.tier,
      tierColor: t.color,
      icon: a.icon,
      progress: a.val,
      max: t.next,
      thresholds: a.th
    };
  }).sort((a, b) => {
    const valA = a.tier === 'Locked' ? 0 : a.progress;
    const valB = b.tier === 'Locked' ? 0 : b.progress;
    return valB - valA;
  });
};
