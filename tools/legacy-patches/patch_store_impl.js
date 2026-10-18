const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const targetImpl = `      consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      loggedMealsToday: [],
      
      addLoggedMeal: (meal) => set((state) => {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newEntry: LoggedMeal = {
          id: Date.now().toString(),
          name: meal.name.trim() || 'Quick Log',
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          time,
        };

        return {
          loggedMealsToday: [newEntry, ...(state.loggedMealsToday || [])],
          consumedToday: {
            calories: (state.consumedToday?.calories || 0) + newEntry.calories,
            protein: (state.consumedToday?.protein || 0) + newEntry.protein,
            carbs: (state.consumedToday?.carbs || 0) + newEntry.carbs,
            fat: (state.consumedToday?.fat || 0) + newEntry.fat,
          }
        };
      }),

      deleteLoggedMeal: (id) => set((state) => {
        const targetMeal = (state.loggedMealsToday || []).find(m => m.id === id);
        if (!targetMeal) return state;

        return {
          loggedMealsToday: state.loggedMealsToday.filter(m => m.id !== id),
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - targetMeal.calories),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - targetMeal.protein),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - targetMeal.carbs),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - targetMeal.fat),
          }
        };
      }),

      resetConsumed: () => set({ 
        consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        loggedMealsToday: [] 
      }),

      savedMeals: [],
      addSavedMeal: (meal) => set((state) => ({ savedMeals: [...(state.savedMeals || []), meal] })),
      deleteSavedMeal: (id) => set((state) => ({
        savedMeals: (state.savedMeals || []).filter(m => m.id !== id)
      })),`;

const helperFuncs = `      // Helper to compute macros for a meal
      _computeMacros: (ingredients, legacyData) => {
        if (!ingredients || ingredients.length === 0) {
          return {
            calories: legacyData?.calories || 0,
            protein: legacyData?.protein || 0,
            carbs: legacyData?.carbs || 0,
            fat: legacyData?.fat || 0,
          };
        }
        let cal = 0, pro = 0, car = 0, fat = 0;
        ingredients.forEach(req => {
          const ratio = req.amount / req.ingredient.baseAmount;
          cal += req.ingredient.calories * ratio;
          pro += req.ingredient.protein * ratio;
          car += req.ingredient.carbs * ratio;
          fat += req.ingredient.fat * ratio;
        });
        return { calories: Math.round(cal), protein: Math.round(pro), carbs: Math.round(car), fat: Math.round(fat) };
      },`;

const replacementImpl = `      ingredients: [],
      addIngredient: (ingredient) => set((state) => ({ ingredients: [...(state.ingredients || []), ingredient] })),
      updateIngredient: (ingredient) => set((state) => ({ ingredients: (state.ingredients || []).map(i => i.id === ingredient.id ? ingredient : i) })),
      deleteIngredient: (id) => set((state) => ({ ingredients: (state.ingredients || []).filter(i => i.id !== id) })),

      consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      loggedMealsToday: [],
      
      addLoggedMeal: (meal) => set((state) => {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Calculate macros
        let computedCal = 0, computedPro = 0, computedCar = 0, computedFat = 0;
        if (meal.ingredients && meal.ingredients.length > 0) {
          meal.ingredients.forEach(req => {
            const ratio = req.amount / req.ingredient.baseAmount;
            computedCal += req.ingredient.calories * ratio;
            computedPro += req.ingredient.protein * ratio;
            computedCar += req.ingredient.carbs * ratio;
            computedFat += req.ingredient.fat * ratio;
          });
        } else {
          computedCal = meal.calories || 0;
          computedPro = meal.protein || 0;
          computedCar = meal.carbs || 0;
          computedFat = meal.fat || 0;
        }

        const newEntry: LoggedMeal = {
          id: Date.now().toString(),
          name: meal.name.trim() || 'Quick Log',
          time,
          ingredients: meal.ingredients || [],
          calories: Math.round(computedCal),
          protein: Math.round(computedPro),
          carbs: Math.round(computedCar),
          fat: Math.round(computedFat),
        };

        return {
          loggedMealsToday: [newEntry, ...(state.loggedMealsToday || [])],
          consumedToday: {
            calories: (state.consumedToday?.calories || 0) + newEntry.calories,
            protein: (state.consumedToday?.protein || 0) + newEntry.protein,
            carbs: (state.consumedToday?.carbs || 0) + newEntry.carbs,
            fat: (state.consumedToday?.fat || 0) + newEntry.fat,
          }
        };
      }),

      updateLoggedMealIngredientAmount: (mealId, ingredientId, newAmount) => set((state) => {
        const mealIndex = (state.loggedMealsToday || []).findIndex(m => m.id === mealId);
        if (mealIndex === -1) return state;

        const meals = [...state.loggedMealsToday];
        const meal = { ...meals[mealIndex] };
        
        // Save old macros to subtract
        const oldCal = meal.calories || 0;
        const oldPro = meal.protein || 0;
        const oldCar = meal.carbs || 0;
        const oldFat = meal.fat || 0;

        // Update ingredient amount
        meal.ingredients = meal.ingredients.map(req => 
          req.ingredient.id === ingredientId ? { ...req, amount: newAmount } : req
        );

        // Recalculate macros for the meal
        let computedCal = 0, computedPro = 0, computedCar = 0, computedFat = 0;
        meal.ingredients.forEach(req => {
          const ratio = req.amount / req.ingredient.baseAmount;
          computedCal += req.ingredient.calories * ratio;
          computedPro += req.ingredient.protein * ratio;
          computedCar += req.ingredient.carbs * ratio;
          computedFat += req.ingredient.fat * ratio;
        });

        meal.calories = Math.round(computedCal);
        meal.protein = Math.round(computedPro);
        meal.carbs = Math.round(computedCar);
        meal.fat = Math.round(computedFat);

        meals[mealIndex] = meal;

        return {
          loggedMealsToday: meals,
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - oldCal + meal.calories),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - oldPro + meal.protein),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - oldCar + meal.carbs),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - oldFat + meal.fat),
          }
        };
      }),

      deleteLoggedMeal: (id) => set((state) => {
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
      }),

      savedMeals: [],
      addSavedMeal: (recipe) => set((state) => ({ savedMeals: [...(state.savedMeals || []), recipe] })),
      updateSavedMeal: (recipe) => set((state) => ({ savedMeals: (state.savedMeals || []).map(r => r.id === recipe.id ? recipe : r) })),
      deleteSavedMeal: (id) => set((state) => ({
        savedMeals: (state.savedMeals || []).filter(m => m.id !== id)
      })),`;

code = code.replace(targetImpl, replacementImpl);
fs.writeFileSync('src/store/store.ts', code);
