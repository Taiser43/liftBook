const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const oldMealTypes = `export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LoggedMeal extends Meal {
  time: string;
}`;

const newMealTypes = `export interface Ingredient {
  id: string;
  name: string;
  barcode?: string;
  baseAmount: number; // e.g., 100 for 100g
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeIngredient {
  ingredient: Ingredient;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  // Legacy fields
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface LoggedMeal {
  id: string;
  name: string;
  time: string;
  ingredients: RecipeIngredient[];
  // Legacy fields
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}`;

code = code.replace(oldMealTypes, newMealTypes);

const oldStoreInterfaces = `  // Consumed Today
  consumedToday: { calories: number; protein: number; carbs: number; fat: number };
  loggedMealsToday: LoggedMeal[];
  addLoggedMeal: (meal: Omit<LoggedMeal, 'id' | 'time'>) => void;
  deleteLoggedMeal: (id: string) => void;
  resetConsumed: () => void;

  // Saved Meals
  savedMeals: Meal[];
  addSavedMeal: (meal: Meal) => void;
  deleteSavedMeal: (id: string) => void;`;

const newStoreInterfaces = `  // Ingredients Base
  ingredients: Ingredient[];
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (ingredient: Ingredient) => void;
  deleteIngredient: (id: string) => void;

  // Consumed Today
  consumedToday: { calories: number; protein: number; carbs: number; fat: number };
  loggedMealsToday: LoggedMeal[];
  addLoggedMeal: (meal: Omit<LoggedMeal, 'id' | 'time'>) => void;
  deleteLoggedMeal: (id: string) => void;
  updateLoggedMealIngredientAmount: (mealId: string, ingredientId: string, newAmount: number) => void;
  resetConsumed: () => void;

  // Saved Recipes
  savedMeals: Recipe[];
  addSavedMeal: (recipe: Recipe) => void;
  updateSavedMeal: (recipe: Recipe) => void;
  deleteSavedMeal: (id: string) => void;`;

code = code.replace(oldStoreInterfaces, newStoreInterfaces);

fs.writeFileSync('src/store/store.ts', code);
