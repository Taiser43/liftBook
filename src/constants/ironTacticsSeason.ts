import { ChestType } from './ironTacticsChests';

export type SeasonRewardKind = 'eisen' | 'shake' | 'chest' | 'frame';

export interface SeasonTierReward {
  tier: number;
  kind: SeasonRewardKind;
  amount?: number;
  chestType?: ChestType;
  frameId?: string;
  name: string;
  icon: string;
}

export const SEASON_XP_PER_TIER = 100;
export const SEASON_MAX_TIER = 30;

export const generateSeasonRewards = (): SeasonTierReward[] => {
  const rewards: SeasonTierReward[] = [];
  for (let t = 1; t <= SEASON_MAX_TIER; t++) {
    if (t === 30) {
      rewards.push({
        tier: t,
        kind: 'frame',
        frameId: 'season_apex',
        name: 'Apex-Saison-Rahmen',
        icon: 'trophy',
      });
    } else if (t === 10 || t === 20) {
      rewards.push({
        tier: t,
        kind: 'frame',
        frameId: t === 10 ? 'season_silver' : 'season_gold',
        name: t === 10 ? 'Silber-Glanz-Rahmen' : 'Gold-Flammen-Rahmen',
        icon: 'card-bulleted-outline',
      });
    } else if (t % 7 === 0) {
      rewards.push({
        tier: t,
        kind: 'shake',
        amount: 2,
        name: '2× Protein-Shake',
        icon: 'cup-water',
      });
    } else if (t % 5 === 0) {
      rewards.push({
        tier: t,
        kind: 'chest',
        chestType: t === 25 ? 'vault' : 'locker',
        name: t === 25 ? 'Eisen-Tresor' : 'Gym-Spind',
        icon: t === 25 ? 'safe' : 'locker',
      });
    } else {
      const eis = 40 + t * 4;
      rewards.push({
        tier: t,
        kind: 'eisen',
        amount: eis,
        name: `${eis} Eisen`,
        icon: 'nut',
      });
    }
  }
  return rewards;
};

export const SEASON_REWARDS: SeasonTierReward[] = generateSeasonRewards();
