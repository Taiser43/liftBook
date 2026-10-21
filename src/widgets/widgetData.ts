import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { calculateStreaks } from '../utils/streakEngine';

export interface PlannedMealItem {
  scheduledMealId: string;
  recipeId: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
  servings: number;
}

export interface QuickMealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  imageUri?: string;
}

export interface WidgetNutritionData {
  calories: number;
  targetCalories: number;
  remainingCalories: number;
  consumedPct: number;
  protein: number;
  targetProtein: number;
  carbs: number;
  targetCarbs: number;
  fat: number;
  targetFat: number;
  streak: number;
  plannedMeals: PlannedMealItem[];
  hasActivePlan: boolean;
  allPlannedMealsEaten: boolean;
  totalPlannedTodayCount: number;
  eatenPlannedTodayCount: number;
  quickMeals: QuickMealItem[];
  accentColor: `#${string}`;
  cardBg: `#${string}`;
  subCardBg: `#${string}`;
  cardBorder: `#${string}`;
}

export function getFoodEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('shake') || n.includes('whey') || n.includes('protein')) return '🥤';
  if (n.includes('huhn') || n.includes('hähnchen') || n.includes('chicken') || n.includes('fleisch') || n.includes('steak') || n.includes('rind')) return '🍗';
  if (n.includes('hafer') || n.includes('oat') || n.includes('müsli') || n.includes('bowl') || n.includes('porridge')) return '🥣';
  if (n.includes('ei') || n.includes('egg') || n.includes('rührei') || n.includes('omelett')) return '🍳';
  if (n.includes('reis') || n.includes('rice')) return '🍚';
  if (n.includes('salat') || n.includes('salad') || n.includes('gemüse')) return '🥗';
  if (n.includes('fisch') || n.includes('thunfisch') || n.includes('lachs')) return '🐟';
  if (n.includes('quark') || n.includes('joghurt') || n.includes('skyr')) return '🥛';
  if (n.includes('banane') || n.includes('apfel') || n.includes('obst') || n.includes('beeren')) return '🍎';
  if (n.includes('brot') || n.includes('toast') || n.includes('sandwich')) return '🥪';
  if (n.includes('nudel') || n.includes('pasta')) return '🍝';
  if (n.includes('snack') || n.includes('riegel') || n.includes('bar')) return '🍫';
  return '🍽️';
}

export function getWidgetNutritionData(): WidgetNutritionData {
  const store = useAppStore.getState();
  const theme = getAppTheme(store.accentThemeId);

  const consumed = store.consumedToday || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const baseTargets = store.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 };
  const extra = store.dailyTargetExtra || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const targetCalories = Math.max(1, (baseTargets.calories || 2500) + (extra.calories || 0));
  const targetProtein = Math.max(1, (baseTargets.protein || 150) + (extra.protein || 0));
  const targetCarbs = Math.max(1, (baseTargets.carbs || 250) + (extra.carbs || 0));
  const targetFat = Math.max(1, (baseTargets.fat || 80) + (extra.fat || 0));

  const calories = Math.round(consumed.calories || 0);
  const remainingCalories = Math.max(0, targetCalories - calories);
  const consumedPct = Math.min(100, Math.round((calories / targetCalories) * 100));

  const protein = Math.round(consumed.protein || 0);
  const carbs = Math.round(consumed.carbs || 0);
  const fat = Math.round(consumed.fat || 0);

  // Calculate streak safely
  let streak = 0;
  try {
    const streaks = calculateStreaks(
      store.workoutHistory || [],
      store.workoutPrograms || [],
      store.nutritionHistory || [],
      consumed,
      baseTargets
    );
    streak = streaks.nutrition || streaks.overall || 0;
  } catch {
    streak = 0;
  }

  // 1. Resolve Active Diet Plan & Planned Meals for Today
  const activePlan = (store.dietPlans || []).find((p) => p.isActive);
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const scheduledMealsToday = (activePlan?.scheduledMeals || [])
    .filter((m) => m.dayOfWeek.includes('Everyday') || m.dayOfWeek.includes(todayDayName))
    .sort((a, b) => a.time.localeCompare(b.time));

  const loggedMeals = store.loggedMealsToday || [];
  const skippedMeals = store.skippedMealsToday || [];
  const claimedLoggedIds = new Set<string>();

  const pendingPlannedMeals: PlannedMealItem[] = [];
  let eatenPlannedTodayCount = 0;

  for (const sm of scheduledMealsToday) {
    if (skippedMeals.includes(sm.id)) continue;

    // Check if meal is logged
    let match = loggedMeals.find((l) => !claimedLoggedIds.has(l.id) && l.scheduledMealId === sm.id);

    if (!match) {
      const rec = (store.savedMeals || []).find((r) => r.id === sm.recipeId);
      match = loggedMeals.find((l) =>
        !claimedLoggedIds.has(l.id) && (
          (sm.recipeId && l.recipeId === sm.recipeId) ||
          (sm.customName && l.name && l.name.trim().toLowerCase() === sm.customName.trim().toLowerCase()) ||
          (rec?.name && l.name && l.name.trim().toLowerCase() === rec.name.trim().toLowerCase())
        )
      );
    }

    if (match) {
      claimedLoggedIds.add(match.id);
      eatenPlannedTodayCount++;
    } else {
      const rec = (store.savedMeals || []).find((r) => r.id === sm.recipeId);
      const s = rec?.totalServings || 1;
      const mealServings = sm.servings || 1;
      const cal = Math.round((rec ? rec.calories / s : 0) * mealServings);
      const pro = Math.round((rec ? rec.protein / s : 0) * mealServings);
      const car = Math.round((rec ? rec.carbs / s : 0) * mealServings);
      const fatVal = Math.round((rec ? rec.fat / s : 0) * mealServings);
      const displayName = sm.customName || rec?.name || 'Mahlzeit';

      pendingPlannedMeals.push({
        scheduledMealId: sm.id,
        recipeId: sm.recipeId,
        name: displayName,
        time: sm.time || '12:00',
        calories: cal,
        protein: pro,
        carbs: car,
        fat: fatVal,
        imageUri: rec?.imageUri,
        servings: mealServings,
      });
    }
  }

  const hasActivePlan = !!activePlan && scheduledMealsToday.length > 0;
  const allPlannedMealsEaten = hasActivePlan && pendingPlannedMeals.length === 0;

  // 2. Fallback / Quick meals resolution
  const savedMeals = store.savedMeals || [];
  const quickLogIds = store.quickLogRecipeIds || [];
  const selectedQuickMeals: QuickMealItem[] = [];

  for (const id of quickLogIds) {
    const found = savedMeals.find((m) => m.id === id);
    if (found) {
      selectedQuickMeals.push({
        id: found.id,
        name: found.name,
        calories: Math.round(found.calories || 0),
        protein: Math.round(found.protein || 0),
        imageUri: found.imageUri,
      });
    }
  }

  if (selectedQuickMeals.length < 4) {
    const sortedSaved = [...savedMeals]
      .filter((m) => !selectedQuickMeals.some((q) => q.id === m.id))
      .sort((a, b) => ((b.usageCount || 0) - (a.usageCount || 0)));

    for (const m of sortedSaved) {
      if (selectedQuickMeals.length >= 4) break;
      selectedQuickMeals.push({
        id: m.id,
        name: m.name,
        calories: Math.round(m.calories || 0),
        protein: Math.round(m.protein || 0),
        imageUri: m.imageUri,
      });
    }
  }

  if (selectedQuickMeals.length === 0) {
    selectedQuickMeals.push({ id: 'default_shake', name: 'Whey Shake', calories: 240, protein: 35 });
    selectedQuickMeals.push({ id: 'default_chicken', name: 'Reis & Huhn', calories: 520, protein: 45 });
    selectedQuickMeals.push({ id: 'default_oats', name: 'Hafer-Bowl', calories: 420, protein: 28 });
    selectedQuickMeals.push({ id: 'default_snack', name: 'Protein Snack', calories: 210, protein: 22 });
  }

  // Theme colors
  const accentColor = (theme.accent.startsWith('#') ? theme.accent : '#00D2FF') as `#${string}`;
  const cardBg = (theme.cardBg.startsWith('#') ? theme.cardBg : '#161C22') as `#${string}`;
  const subCardBg = (theme.subCardBg.startsWith('#') ? theme.subCardBg : '#12171D') as `#${string}`;
  const cardBorder = (theme.subtleBorder.startsWith('#') ? theme.subtleBorder : '#232E38') as `#${string}`;

  return {
    calories,
    targetCalories,
    remainingCalories,
    consumedPct,
    protein,
    targetProtein,
    carbs,
    targetCarbs,
    fat,
    targetFat,
    streak,
    plannedMeals: pendingPlannedMeals.slice(0, 4),
    hasActivePlan,
    allPlannedMealsEaten,
    totalPlannedTodayCount: scheduledMealsToday.length,
    eatenPlannedTodayCount,
    quickMeals: selectedQuickMeals.slice(0, 4),
    accentColor,
    cardBg,
    subCardBg,
    cardBorder,
  };
}
