const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

// 1. Add new state fields
const stateTarget = `  nutritionHistory: DailyNutritionLog[];`;
const stateReplacement = `  nutritionHistory: DailyNutritionLog[];

  // Gamification & XP
  totalXP: number;
  unlockedAchievements: string[];
  lastDailyResetDate: string;
  triggerMacroConfetti: boolean;
  setTriggerMacroConfetti: (val: boolean) => void;
  triggerStreakConfetti: boolean;
  setTriggerStreakConfetti: (val: boolean) => void;
  addXP: (amount: number) => void;
  unlockAchievement: (id: string, xpReward: number) => void;`;
code = code.replace(stateTarget, stateReplacement);

// 2. Add implementation
const implTarget = `      nutritionHistory: [],`;
const implReplacement = `      nutritionHistory: [],

      totalXP: 0,
      unlockedAchievements: [],
      lastDailyResetDate: new Date().toISOString().split('T')[0],
      triggerMacroConfetti: false,
      setTriggerMacroConfetti: (val) => set({ triggerMacroConfetti: val }),
      triggerStreakConfetti: false,
      setTriggerStreakConfetti: (val) => set({ triggerStreakConfetti: val }),
      
      addXP: (amount) => set((state) => ({ totalXP: (state.totalXP || 0) + amount })),
      unlockAchievement: (id, xpReward) => set((state) => {
        if ((state.unlockedAchievements || []).includes(id)) return state;
        return { 
          unlockedAchievements: [...(state.unlockedAchievements || []), id],
          totalXP: (state.totalXP || 0) + xpReward
        };
      }),`;
code = code.replace(implTarget, implReplacement);

// 3. Modify addLoggedMeal to check for macro confetti
const addMealTarget = `      addLoggedMeal: (meal) => set((state) => {
        return {
          loggedMealsToday: [...(state.loggedMealsToday || []), meal],
          consumedToday: {
            calories: (state.consumedToday?.calories || 0) + meal.calories,
            protein: (state.consumedToday?.protein || 0) + meal.protein,
            carbs: (state.consumedToday?.carbs || 0) + meal.carbs,
            fat: (state.consumedToday?.fat || 0) + meal.fat,
          }
        };
      }),`;

const addMealReplacement = `      addLoggedMeal: (meal) => set((state) => {
        const newCalories = (state.consumedToday?.calories || 0) + meal.calories;
        const newProtein = (state.consumedToday?.protein || 0) + meal.protein;
        
        // Check if previously hit goal
        const oldConsumed = state.consumedToday || { calories: 0, protein: 0 };
        const targets = state.targets || { calories: 2500, protein: 150 };
        
        const oldCalDiff = Math.abs(oldConsumed.calories - targets.calories) / targets.calories;
        const oldHit = (oldCalDiff <= 0.1) && (oldConsumed.protein / targets.protein >= 0.9);
        
        const newCalDiff = Math.abs(newCalories - targets.calories) / targets.calories;
        const newHit = (newCalDiff <= 0.1) && (newProtein / targets.protein >= 0.9);
        
        // Trigger confetti if we just crossed the threshold!
        let confetti = state.triggerMacroConfetti;
        let xpAdd = 0;
        if (!oldHit && newHit) {
          confetti = true;
          xpAdd = 250; // Award XP for hitting macros
        }

        return {
          loggedMealsToday: [...(state.loggedMealsToday || []), meal],
          consumedToday: {
            calories: newCalories,
            protein: newProtein,
            carbs: (state.consumedToday?.carbs || 0) + meal.carbs,
            fat: (state.consumedToday?.fat || 0) + meal.fat,
          },
          triggerMacroConfetti: confetti,
          totalXP: (state.totalXP || 0) + xpAdd
        };
      }),`;
code = code.replace(addMealTarget, addMealReplacement);

// 4. Modify updateLoggedMealIngredientAmount to also check
const updateMealTarget = `          consumedToday: {
            calories: Math.max(0, currentConsumed.calories + calDiff),
            protein: Math.max(0, currentConsumed.protein + proDiff),
            carbs: Math.max(0, currentConsumed.carbs + carDiff),
            fat: Math.max(0, currentConsumed.fat + fatDiff),
          }
        };
      }),`;
const updateMealReplacement = `          consumedToday: {
            calories: Math.max(0, currentConsumed.calories + calDiff),
            protein: Math.max(0, currentConsumed.protein + proDiff),
            carbs: Math.max(0, currentConsumed.carbs + carDiff),
            fat: Math.max(0, currentConsumed.fat + fatDiff),
          }
        };

        const newCal = state.consumedToday.calories;
        const newPro = state.consumedToday.protein;
        const targets = state.targets || { calories: 2500, protein: 150 };
        
        const cDiff = Math.abs(newCal - targets.calories) / targets.calories;
        const newHit = (cDiff <= 0.1) && (newPro / targets.protein >= 0.9);
        
        if (newHit) {
           // Simple trigger, no extra XP here to avoid exploit loop, just confetti if they tweak into it
           return { ...result, triggerMacroConfetti: true };
        }
        return result;
      }),`;
// Only matching part of it might be dangerous, let's just use string replace carefully
// Wait, the block ends with return { ... }; so I will rewrite it cleanly.
