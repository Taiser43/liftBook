const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const target = `  nutritionHistory: [],`;
const replacement = `  totalXP: 0,
  unlockedAchievements: [],
  lastDailyResetDate: new Date().toISOString().split('T')[0],
  triggerMacroConfetti: false,
  setTriggerMacroConfetti: (val: boolean) => set({ triggerMacroConfetti: val }),
  triggerStreakConfetti: false,
  setTriggerStreakConfetti: (val: boolean) => set({ triggerStreakConfetti: val }),
  addXP: (amount: number) => set((state: AppState) => ({ totalXP: (state.totalXP || 0) + amount })),
  unlockAchievement: (id: string, xpReward: number) => set((state: AppState) => {
    if ((state.unlockedAchievements || []).includes(id)) return state;
    return { 
      unlockedAchievements: [...(state.unlockedAchievements || []), id],
      totalXP: (state.totalXP || 0) + xpReward
    };
  }),

  nutritionHistory: [],`;

code = code.replace(target, replacement);

fs.writeFileSync('src/store/store.ts', code);
