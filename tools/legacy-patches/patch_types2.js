const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const targetTypes = `export interface Recipe {
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

const newTypes = `export interface Recipe {
  id: string;
  name: string;
  ingredients?: RecipeIngredient[]; // Optional for legacy
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LoggedMeal {
  id: string;
  name: string;
  time: string;
  ingredients?: RecipeIngredient[]; // Optional for legacy
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}`;

code = code.replace(targetTypes, newTypes);
fs.writeFileSync('src/store/store.ts', code);
