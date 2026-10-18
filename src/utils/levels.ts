export type LevelTier = 'Bronze' | 'Silver' | 'Gold' | 'Emerald' | 'Challenger';

export interface LevelInfo {
  tier: LevelTier;
  color: string;
}

export const getLevelTierInfo = (level: number): LevelInfo => {
  if (level < 10) {
    return { tier: 'Bronze', color: '#CD7F32' };
  } else if (level < 20) {
    return { tier: 'Silver', color: '#C0C0C0' };
  } else if (level < 30) {
    return { tier: 'Gold', color: '#FFD700' };
  } else if (level < 40) {
    return { tier: 'Emerald', color: '#50C878' }; // Green, not purple!
  } else {
    return { tier: 'Challenger', color: '#E51400' }; // Red/Gold
  }
};
