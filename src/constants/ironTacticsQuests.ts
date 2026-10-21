export interface QuestDef {
  id: string;
  title: string;
  description: string;
  goal: number;
  eisenReward: number;
  seasonXpReward: number;
  isDaily: boolean;
  type: 'waves' | 'mini' | 'boss' | 'merges' | 'items' | 'workout' | 'nutrition' | 'cardio';
}

export const DAILY_QUEST_POOL: QuestDef[] = [
  {
    id: 'd_waves_4',
    title: 'Wellen-Dominanz',
    description: 'Gewinne 4 Wellen in der Arena.',
    goal: 4,
    eisenReward: 40,
    seasonXpReward: 40,
    isDaily: true,
    type: 'waves',
  },
  {
    id: 'd_mini_1',
    title: 'Zwischenprüfung',
    description: 'Besiege 1 Mini-Boss in Stage 4.',
    goal: 1,
    eisenReward: 50,
    seasonXpReward: 50,
    isDaily: true,
    type: 'mini',
  },
  {
    id: 'd_items_2',
    title: 'Equipment-Check',
    description: 'Rüste in einem Run 2 Items an deinen Einheiten aus.',
    goal: 2,
    eisenReward: 40,
    seasonXpReward: 40,
    isDaily: true,
    type: 'items',
  },
  {
    id: 'd_merges_3',
    title: 'Doppelsatz',
    description: 'Führe 3 Einheiten-Merges (★) im Shop durch.',
    goal: 3,
    eisenReward: 45,
    seasonXpReward: 45,
    isDaily: true,
    type: 'merges',
  },
  {
    id: 'd_workout_1',
    title: 'Eiserner Einsatz',
    description: 'Schließe heute ein echtes Workout im Studio ab.',
    goal: 1,
    eisenReward: 80,
    seasonXpReward: 80,
    isDaily: true,
    type: 'workout',
  },
  {
    id: 'd_nutrition_1',
    title: 'Saubere Makros',
    description: 'Erreiche heute dein tägliches Kcal-/Protein-Ziel.',
    goal: 1,
    eisenReward: 60,
    seasonXpReward: 60,
    isDaily: true,
    type: 'nutrition',
  },
];

export const WEEKLY_QUEST_POOL: QuestDef[] = [
  {
    id: 'w_waves_25',
    title: 'Titanen-Kampagne',
    description: 'Gewinne diese Woche insgesamt 25 Wellen in Iron Tactics.',
    goal: 25,
    eisenReward: 220,
    seasonXpReward: 180,
    isDaily: false,
    type: 'waves',
  },
  {
    id: 'w_boss_3',
    title: 'Schatten-Bändiger',
    description: 'Besiege 3 Schatten-Titanen (Stage 5 Boss).',
    goal: 3,
    eisenReward: 280,
    seasonXpReward: 220,
    isDaily: false,
    type: 'boss',
  },
  {
    id: 'w_workouts_3',
    title: 'Eiserne Disziplin',
    description: 'Absolviere diese Woche mindestens 3 echte Workouts.',
    goal: 3,
    eisenReward: 300,
    seasonXpReward: 250,
    isDaily: false,
    type: 'workout',
  },
  {
    id: 'w_merges_15',
    title: 'Hypertrophie-Schmiede',
    description: 'Führe 15 Einheiten-Merges (★) im Shop durch.',
    goal: 15,
    eisenReward: 180,
    seasonXpReward: 150,
    isDaily: false,
    type: 'merges',
  },
];
