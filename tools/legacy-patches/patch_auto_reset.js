const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const interfaceTarget = `  resetConsumed: () => void;`;
const interfaceReplacement = `  resetConsumed: () => void;
  checkDailyReset: () => void;`;
code = code.replace(interfaceTarget, interfaceReplacement);

const implTarget = `      resetConsumed: () => set((state) => {`;
const implReplacement = `      checkDailyReset: () => set((state) => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (state.lastDailyResetDate && state.lastDailyResetDate !== todayStr) {
          // It's a new day! We should auto-trigger the reset logic.
          const consumed = state.consumedToday || { calories: 0, protein: 0, carbs: 0, fat: 0 };
          const targets = state.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 };
          const meals = state.loggedMealsToday || [];
          
          const calDiff = Math.abs(consumed.calories - targets.calories) / targets.calories;
          const proRatio = targets.protein > 0 ? (consumed.protein / targets.protein) : 1;
          const hitGoal = (calDiff <= 0.1) && (proRatio >= 0.9);

          const historyEntry = {
            date: state.lastDailyResetDate,
            calories: consumed.calories,
            protein: consumed.protein,
            carbs: consumed.carbs,
            fat: consumed.fat,
            hitGoal,
            meals
          };

          const newHistory = (state.nutritionHistory || []).filter(h => h.date !== state.lastDailyResetDate);
          if (meals.length > 0) {
            newHistory.push(historyEntry);
          }

          return {
            nutritionHistory: newHistory,
            consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            loggedMealsToday: [],
            lastDailyResetDate: todayStr
          };
        }
        return state;
      }),

      resetConsumed: () => set((state) => {`;
code = code.replace(implTarget, implReplacement);

fs.writeFileSync('src/store/store.ts', code);
