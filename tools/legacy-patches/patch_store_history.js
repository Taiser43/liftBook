const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

// 1. Add DailyNutritionLog interface
const typesTarget = `export interface LoggedMeal {
  id: string;
  name: string;
  time: string;
  ingredients?: RecipeIngredient[]; // Optional for legacy
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}`;
const typesReplacement = `export interface LoggedMeal {
  id: string;
  name: string;
  time: string;
  ingredients?: RecipeIngredient[]; // Optional for legacy
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyNutritionLog {
  date: string; // ISO date YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hitGoal: boolean;
  meals: LoggedMeal[];
}`;
code = code.replace(typesTarget, typesReplacement);

// 2. Add nutritionHistory to AppState
const stateTarget = `  // Consumed Today
  consumedToday: { calories: number; protein: number; carbs: number; fat: number };
  loggedMealsToday: LoggedMeal[];`;
const stateReplacement = `  // Nutrition History
  nutritionHistory: DailyNutritionLog[];
  
  // Consumed Today
  consumedToday: { calories: number; protein: number; carbs: number; fat: number };
  loggedMealsToday: LoggedMeal[];`;
code = code.replace(stateTarget, stateReplacement);

// 3. Update resetConsumed to save history and add nutritionHistory initial state
const implTarget = `      deleteLoggedMeal: (id) => set((state) => {
        const targetMeal = (state.loggedMealsToday || []).find(m => m.id === id);
        if (!targetMeal) return state;

        const cal = targetMeal.calories || 0;
        const pro = targetMeal.protein || 0;
        const car = targetMeal.carbs || 0;
        const fat = targetMeal.fat || 0;

        return {
          loggedMealsToday: state.loggedMealsToday.filter(m => m.id !== id),
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - cal),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - pro),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - car),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - fat),
          }
        };
      }),

      resetConsumed: () => set({ 
        consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        loggedMealsToday: [] 
      }),`;

const implReplacement = `      deleteLoggedMeal: (id) => set((state) => {
        const targetMeal = (state.loggedMealsToday || []).find(m => m.id === id);
        if (!targetMeal) return state;

        const cal = targetMeal.calories || 0;
        const pro = targetMeal.protein || 0;
        const car = targetMeal.carbs || 0;
        const fat = targetMeal.fat || 0;

        return {
          loggedMealsToday: state.loggedMealsToday.filter(m => m.id !== id),
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - cal),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - pro),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - car),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - fat),
          }
        };
      }),

      nutritionHistory: [],
      
      resetConsumed: () => set((state) => {
        const consumed = state.consumedToday || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const targets = state.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 };
        const meals = state.loggedMealsToday || [];
        
        // Determine if goal was hit: Within 10% of calories, and >= 90% of protein
        const calDiff = Math.abs(consumed.calories - targets.calories) / targets.calories;
        const proRatio = consumed.protein / targets.protein;
        const hitGoal = (calDiff <= 0.1) && (proRatio >= 0.9);

        // Save to history using today's local date
        const todayStr = new Date().toISOString().split('T')[0];
        
        const historyEntry: DailyNutritionLog = {
          date: todayStr,
          calories: consumed.calories,
          protein: consumed.protein,
          carbs: consumed.carbs,
          fat: consumed.fat,
          hitGoal,
          meals
        };

        // If an entry for today already exists (user pressed reset twice in a day?), overwrite it
        const newHistory = (state.nutritionHistory || []).filter(h => h.date !== todayStr);
        // Only save if there was actually food eaten
        if (meals.length > 0) {
          newHistory.push(historyEntry);
        }

        return {
          nutritionHistory: newHistory,
          consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          loggedMealsToday: []
        };
      }),`;
code = code.replace(implTarget, implReplacement);

fs.writeFileSync('src/store/store.ts', code);
