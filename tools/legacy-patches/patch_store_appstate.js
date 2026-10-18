const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const interfaceTarget = `  nutritionHistory: DailyNutritionLog[];
  
  // Consumed Today`;
const interfaceReplacement = `  nutritionHistory: DailyNutritionLog[];

  // Gamification & XP
  totalXP: number;
  unlockedAchievements: string[];
  lastDailyResetDate: string;
  triggerMacroConfetti: boolean;
  setTriggerMacroConfetti: (val: boolean) => void;
  triggerStreakConfetti: boolean;
  setTriggerStreakConfetti: (val: boolean) => void;
  addXP: (amount: number) => void;
  unlockAchievement: (id: string, xpReward: number) => void;

  // Consumed Today`;

code = code.replace(interfaceTarget, interfaceReplacement);
fs.writeFileSync('src/store/store.ts', code);
