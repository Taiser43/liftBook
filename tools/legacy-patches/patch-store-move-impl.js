const fs = require('fs');
const file = 'src/store/store.ts';
let code = fs.readFileSync(file, 'utf8');

const moveImpl = `
      moveMealToYesterday: (id) => set((state) => {
        const mealIndex = (state.loggedMealsToday || []).findIndex(m => m.id === id);
        if (mealIndex === -1) return state;

        const meals = [...state.loggedMealsToday];
        const meal = meals[mealIndex];
        meals.splice(mealIndex, 1);

        const cal = meal.calories || 0;
        const pro = meal.protein || 0;
        const car = meal.carbs || 0;
        const fat = meal.fat || 0;

        const history = [...(state.nutritionHistory || [])];
        if (history.length === 0) return state; // Nowhere to move

        const lastEntryIndex = history.length - 1;
        const lastEntry = { ...history[lastEntryIndex] };

        lastEntry.meals = [...(lastEntry.meals || []), meal];
        lastEntry.calories += cal;
        lastEntry.protein += pro;
        lastEntry.carbs += car;
        lastEntry.fat += fat;

        const baseTargets = state.activeDietPlan ? {
            calories: state.activeDietPlan.targetCalories || 0,
            protein: state.activeDietPlan.targetProtein || 0,
            carbs: state.activeDietPlan.targetCarbs || 0,
            fat: state.activeDietPlan.targetFat || 0
        } : (state.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 });

        const calDiff = Math.abs(lastEntry.calories - baseTargets.calories) / baseTargets.calories;
        const proRatio = baseTargets.protein > 0 ? (lastEntry.protein / baseTargets.protein) : 1;
        const hitGoal = (calDiff <= 0.25) && (proRatio >= 0.75);

        let newTotalXP = state.totalXP || 0;
        let newLevelUpData = state.levelUpData;

        if (!lastEntry.hitGoal && hitGoal) {
          lastEntry.hitGoal = true;
          const currentXP = state.totalXP || 0;
          newTotalXP = currentXP + 250;
          const oldLevel = getLevelData(currentXP).level;
          const newLevel = getLevelData(newTotalXP).level;
          if (newLevel > oldLevel) {
            newLevelUpData = { newLevel, totalXP: newTotalXP };
          }
        }

        history[lastEntryIndex] = lastEntry;

        return {
          loggedMealsToday: meals,
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - cal),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - pro),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - car),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - fat),
          },
          nutritionHistory: history,
          totalXP: newTotalXP,
          levelUpData: newLevelUpData
        };
      }),
`;

code = code.replace('      deleteLoggedMeal: (id) => set((state) => {', moveImpl + '      deleteLoggedMeal: (id) => set((state) => {');
fs.writeFileSync(file, code);
