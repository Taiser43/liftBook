import { DietPlan, ScheduledMeal, Recipe, RecipeIngredient } from '../store/store';

export interface ActiveNutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  planName?: string;
  isFromPlan: boolean;
  source: 'dietPlanExplicit' | 'dietPlanSum' | 'profile';
}

/**
 * Resolves active nutrition targets by prioritizing the active Diet Plan:
 * 1. Explicit targetCalories/macros set on the active Diet Plan
 * 2. Sum of scheduled meals for today in the active Diet Plan
 * 3. Fallback to profile targets
 * Always includes dailyTargetExtra (e.g. from cardio or adjustments).
 */
export function resolveActiveNutritionTargets(
  dietPlans: DietPlan[] | undefined,
  fallbackTargets: { calories: number; protein: number; carbs: number; fat: number },
  dailyTargetExtra?: { calories: number; protein: number; carbs: number; fat: number } | null,
  savedMeals?: Recipe[],
  dayName?: string
): ActiveNutritionTargets {
  const extra = dailyTargetExtra || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const activePlan = (dietPlans || []).find(p => p.isActive);

  if (activePlan) {
    // 1. Explicit targets on the Diet Plan
    if (activePlan.targetCalories && activePlan.targetCalories > 0) {
      return {
        calories: activePlan.targetCalories + extra.calories,
        protein: (activePlan.targetProtein || 0) + extra.protein,
        carbs: (activePlan.targetCarbs || 0) + extra.carbs,
        fat: (activePlan.targetFat || 0) + extra.fat,
        planName: activePlan.name,
        isFromPlan: true,
        source: 'dietPlanExplicit'
      };
    }

    // 2. Computed sum from scheduled meals for today in the Diet Plan
    if (activePlan.scheduledMeals && activePlan.scheduledMeals.length > 0 && savedMeals) {
      const today = dayName || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
      const todaysMeals = activePlan.scheduledMeals.filter(m =>
        m.dayOfWeek.includes('Everyday') || m.dayOfWeek.includes(today)
      );
      const mealsToCount = todaysMeals.length > 0 ? todaysMeals : activePlan.scheduledMeals;

      let planCal = 0;
      let planPro = 0;
      let planCar = 0;
      let planFat = 0;

      mealsToCount.forEach(m => {
        const recipe = savedMeals.find(r => r.id === m.recipeId);
        if (recipe) {
          const s = recipe.totalServings || 1;
          const servings = m.servings || 1;
          planCal += Math.round((recipe.calories / s) * servings);
          planPro += Math.round((recipe.protein / s) * servings);
          planCar += Math.round((recipe.carbs / s) * servings);
          planFat += Math.round((recipe.fat / s) * servings);
        }
      });

      if (planCal > 0) {
        return {
          calories: planCal + extra.calories,
          protein: planPro + extra.protein,
          carbs: planCar + extra.carbs,
          fat: planFat + extra.fat,
          planName: activePlan.name,
          isFromPlan: true,
          source: 'dietPlanSum'
        };
      }
    }
  }

  // 3. Fallback to profile targets
  const base = fallbackTargets || { calories: 2500, protein: 150, carbs: 250, fat: 80 };
  return {
    calories: base.calories + extra.calories,
    protein: base.protein + extra.protein,
    carbs: base.carbs + extra.carbs,
    fat: base.fat + extra.fat,
    planName: activePlan?.name,
    isFromPlan: !!activePlan,
    source: 'profile'
  };
}

export interface ScaledIngredientItem extends RecipeIngredient {
  originalAmount: number;
  scaledAmount: number;
}

export interface AusgleichsCalculation {
  origMealCal: number;
  origMealPro: number;
  origMealCar: number;
  origMealFat: number;
  remTotal: number;
  budget: number;
  idealRatio: number;
  effectiveRatio: number;
  pct: number;
  scaledCal: number;
  scaledPro: number;
  scaledCar: number;
  scaledFat: number;
  scaledIngredients: ScaledIngredientItem[];
  isSurplus: boolean;
  isDeficit: boolean;
  isOverBudget: boolean;
  isPendingExceedingBudget: boolean;
  resultingRemainingCal: number;
  statusMessage: string;
}

export interface CalculateAusgleichOptions {
  meal: ScheduledMeal;
  recipe: Recipe;
  activeTargets: { calories: number; protein: number; carbs: number; fat: number };
  consumedToday: { calories: number; protein: number; carbs: number; fat: number };
  otherPendingCal?: number;
  mode?: 'fullDay' | 'deductPending';
  customRatio?: number | null;
}

/**
 * Calculates the exact portion and ingredient amounts for an Ausgleichsmahlzeit.
 * - By default ('fullDay' mode), calculates portion to fill all currently open calories (remTotal)
 * - In 'deductPending' mode, reserves calories for other pending plan meals
 * - Supports custom ratio from the interactive slider
 */
export function calculateAusgleichsMeal(options: CalculateAusgleichOptions): AusgleichsCalculation {
  const {
    meal,
    recipe,
    activeTargets,
    consumedToday,
    otherPendingCal = 0,
    mode = 'fullDay',
    customRatio
  } = options;

  const s = recipe.totalServings || 1;
  const servings = meal.servings || 1;

  const origMealCal = Math.round((recipe.calories / s) * servings);
  const origMealPro = Math.round((recipe.protein / s) * servings);
  const origMealCar = Math.round((recipe.carbs / s) * servings);
  const origMealFat = Math.round((recipe.fat / s) * servings);

  // Total calories open for today until active target is reached
  const remTotal = activeTargets.calories - consumedToday.calories;

  let budget: number;
  let isPendingExceedingBudget = false;

  if (mode === 'deductPending') {
    const rawBudget = remTotal - otherPendingCal;
    if (rawBudget <= 0 && remTotal > 0) {
      budget = 0;
      isPendingExceedingBudget = true;
    } else {
      budget = Math.max(0, rawBudget);
    }
  } else {
    // Standard full day balance: fill remaining calories to hit 100% daily target
    budget = Math.max(0, remTotal);
  }

  // Ideal ratio to perfectly hit the budget
  const idealRatio = origMealCal > 0 ? budget / origMealCal : 1.0;

  // Effective ratio from slider (customRatio) or ideal ratio
  let effectiveRatio: number;
  if (customRatio !== undefined && customRatio !== null) {
    effectiveRatio = Math.max(0.1, customRatio);
  } else {
    effectiveRatio = origMealCal > 0 ? Math.max(0, budget / origMealCal) : 1.0;
  }

  const scaledCal = Math.round(origMealCal * effectiveRatio);
  const scaledPro = Math.round(origMealPro * effectiveRatio);
  const scaledCar = Math.round(origMealCar * effectiveRatio);
  const scaledFat = Math.round(origMealFat * effectiveRatio);

  const scaledIngredients: ScaledIngredientItem[] = (recipe.ingredients || []).map(ri => {
    const origAmount = (ri.amount / s) * servings;
    const scaledAmount = Math.max(1, Math.round(origAmount * effectiveRatio));
    return {
      ...ri,
      originalAmount: Math.round(origAmount),
      scaledAmount
    };
  });

  const isOverBudget = remTotal <= 0;
  const resultingConsumedCal = consumedToday.calories + scaledCal;
  const resultingRemainingCal = activeTargets.calories - resultingConsumedCal;

  let statusMessage = '';
  if (isOverBudget) {
    statusMessage = `Tagesziel bereits erreicht (${consumedToday.calories} / ${activeTargets.calories} kcal)`;
  } else if (Math.abs(resultingRemainingCal) <= 20) {
    statusMessage = '🎯 Exakter Tages-Ausgleich! Dein Kalorienziel wird auf den Punkt erreicht.';
  } else if (resultingRemainingCal > 0) {
    statusMessage = `💡 Nach dieser Portion bleiben noch ${resultingRemainingCal} kcal für heute offen.`;
  } else {
    statusMessage = `⚠️ Diese Portion überschreitet dein Tagesziel um ${Math.abs(resultingRemainingCal)} kcal.`;
  }

  return {
    origMealCal,
    origMealPro,
    origMealCar,
    origMealFat,
    remTotal,
    budget: Math.round(budget),
    idealRatio,
    effectiveRatio,
    pct: Math.round(effectiveRatio * 100),
    scaledCal,
    scaledPro,
    scaledCar,
    scaledFat,
    scaledIngredients,
    isSurplus: effectiveRatio > 1.0,
    isDeficit: effectiveRatio < 1.0,
    isOverBudget,
    isPendingExceedingBudget,
    resultingRemainingCal,
    statusMessage
  };
}
