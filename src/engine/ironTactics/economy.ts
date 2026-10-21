/**
 * Iron Tactics Economy & Progression Math
 */

export const calculateTrophyDelta = (
  wavesWon: number,
  arenaIndex: number, // 0 to 9
  bossKills: number = 0
): number => {
  // Par for the arena: e.g. Arena 0 = 6, Arena 1 = 8, Arena 2 = 10...
  const par = 6 + arenaIndex * 2;
  const rawDelta = Math.round((wavesWon - par) * 2.5);

  // Safety floor: Arena 0 & 1 have no negative trophies (beginner friendly)
  const minFloor = arenaIndex <= 1 ? 0 : -15;
  const clamped = Math.max(minFloor, Math.min(30, rawDelta));

  return clamped + bossKills * 10;
};

/**
 * Plates income given to the player at the start of each stage.
 */
export const calculateStagePlatesIncome = (
  currentPlates: number,
  winStreak: number
): { base: number; streakBonus: number; interest: number; total: number } => {
  const base = 5;
  const streakBonus = Math.min(3, Math.max(0, winStreak - 1));
  const interest = Math.min(3, Math.floor(currentPlates / 5));
  const total = base + streakBonus + interest;
  return { base, streakBonus, interest, total };
};

/**
 * Tactician XP needed to progress from `level` to `level + 1`.
 * XP(level) = round(80 * level^1.35)
 */
export const getXpRequiredForLevel = (level: number): number => {
  if (level < 1) return 80;
  return Math.round(80 * Math.pow(level, 1.35));
};

export const getTacticianLevelFromXp = (totalXp: number): { level: number; currentXp: number; nextLevelXp: number } => {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (true) {
    const cost = getXpRequiredForLevel(level);
    if (remaining < cost || level >= 50) {
      return { level, currentXp: remaining, nextLevelXp: cost };
    }
    remaining -= cost;
    level++;
  }
};

/**
 * Card Mastery Upgrades (Levels 1 to 10)
 * Grants +2% ATK & HP per mastery level (capped at +18% at level 10)
 */
export const MASTERY_FRAGMENT_COSTS = [0, 5, 10, 20, 35, 55, 80, 115, 155, 200];
export const MASTERY_EISEN_COSTS = [0, 50, 100, 200, 400, 700, 1100, 1600, 2200, 3000];

export const getMasteryUpgradeCost = (currentMasteryLevel: number): { fragments: number; eisen: number } | null => {
  if (currentMasteryLevel >= 10) return null;
  return {
    fragments: MASTERY_FRAGMENT_COSTS[currentMasteryLevel] || 200,
    eisen: MASTERY_EISEN_COSTS[currentMasteryLevel] || 3000,
  };
};

export const getMasteryStatBonusPct = (masteryLevel: number): number => {
  // Level 1 = 0%, Level 2 = +2%, Level 10 = +18%
  const lv = Math.max(1, Math.min(10, masteryLevel || 1));
  return (lv - 1) * 2;
};

/**
 * Calculate seasonal soft-reset trophies:
 * Resets players down to the threshold of their current arena minus 10%,
 * but never lower than the starting threshold of their unlocked arena.
 */
export const calculateSeasonalSoftReset = (
  trophies: number,
  arenaRequiredTrophies: number
): number => {
  if (trophies <= 1000) return trophies; // Below Gold Olymp: no reset
  const excess = trophies - arenaRequiredTrophies;
  const resetTrophies = arenaRequiredTrophies + Math.round(excess * 0.5);
  return Math.max(arenaRequiredTrophies, resetTrophies);
};
