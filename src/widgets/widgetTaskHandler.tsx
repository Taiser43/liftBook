import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { useAppStore } from '../store/store';
import { getWidgetNutritionData } from './widgetData';
import { NutritionDashboardWidget } from './NutritionDashboardWidget';
import { NutritionCompactWidget } from './NutritionCompactWidget';
import { updateAllNutritionWidgets } from './widgetSyncService';

/**
 * Headless Android Widget Task Handler.
 * Executes on widget placement, hourly updates, resize, and background 1-tap clicks.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;

  // 1. Ensure Zustand store is hydrated from AsyncStorage if running headless
  if (useAppStore.persist && !useAppStore.persist.hasHydrated()) {
    try {
      await useAppStore.persist.rehydrate();
    } catch (e) {
      console.warn('[WidgetTaskHandler] Hydration warning:', e);
    }
  }

  // 2. Handle 1-Tap Booking of Scheduled Meals from the Active Plan
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'LOG_PLANNED_MEAL') {
    const scheduledMealId = clickActionData?.scheduledMealId as string | undefined;
    const recipeId = clickActionData?.recipeId as string | undefined;

    if (scheduledMealId) {
      const store = useAppStore.getState();
      const activePlan = (store.dietPlans || []).find((p) => p.isActive);
      const sm = (activePlan?.scheduledMeals || []).find((m) => m.id === scheduledMealId);
      const rec = (store.savedMeals || []).find((r) => r.id === (sm?.recipeId || recipeId));

      const s = rec?.totalServings || 1;
      const mealServings = sm?.servings || 1;
      const cal = Math.round((rec ? rec.calories / s : 0) * mealServings);
      const pro = Math.round((rec ? rec.protein / s : 0) * mealServings);
      const car = Math.round((rec ? rec.carbs / s : 0) * mealServings);
      const fat = Math.round((rec ? rec.fat / s : 0) * mealServings);
      const displayName = sm?.customName || rec?.name || 'Plan-Mahlzeit';

      store.addLoggedMeal({
        name: displayName,
        calories: cal,
        protein: pro,
        carbs: car,
        fat,
        scheduledMealId: sm?.id || scheduledMealId,
        recipeId: rec?.id || recipeId,
        ingredients: rec?.ingredients,
        servingsLogged: mealServings,
      });
    }

    // Immediately re-render with fresh values on the homescreen (the booked meal is now hidden and the next appears!)
    const updatedData = getWidgetNutritionData();
    if (widgetInfo.widgetName === 'NutritionCompactWidget') {
      renderWidget(<NutritionCompactWidget data={updatedData} />);
    } else {
      renderWidget(<NutritionDashboardWidget data={updatedData} />);
    }

    setTimeout(() => {
      updateAllNutritionWidgets();
    }, 150);
    return;
  }

  // 3. Handle 1-Tap Quick-Logging from Home Screen (Fallback Quick-Meals)
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'LOG_RECIPE') {
    const recipeId = clickActionData?.recipeId as string | undefined;

    if (recipeId) {
      const store = useAppStore.getState();
      const savedMeals = store.savedMeals || [];
      let recipe = savedMeals.find((m) => m.id === recipeId);

      // Fallback defaults for instant 1-tap logging
      if (!recipe) {
        if (recipeId === 'default_shake') {
          recipe = {
            id: 'default_shake',
            name: 'Whey Shake',
            calories: 240,
            protein: 35,
            carbs: 4,
            fat: 3,
          };
        } else if (recipeId === 'default_chicken') {
          recipe = {
            id: 'default_chicken',
            name: 'Reis & Huhn',
            calories: 520,
            protein: 45,
            carbs: 65,
            fat: 8,
          };
        }
      }

      if (recipe) {
        store.addLoggedMeal({
          name: recipe.name,
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fat: recipe.fat || 0,
          recipeId: recipe.id,
          ingredients: recipe.ingredients,
        });
      }
    }

    // Immediately re-render with fresh values on the homescreen
    const updatedData = getWidgetNutritionData();
    if (widgetInfo.widgetName === 'NutritionCompactWidget') {
      renderWidget(<NutritionCompactWidget data={updatedData} />);
    } else {
      renderWidget(<NutritionDashboardWidget data={updatedData} />);
    }

    // Sync any other widget instances
    setTimeout(() => {
      updateAllNutritionWidgets();
    }, 150);
    return;
  }

  // 3. Render widget for ADDED, UPDATE, RESIZED or other clicks
  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED' ||
    widgetAction === 'WIDGET_CLICK'
  ) {
    const data = getWidgetNutritionData();
    if (widgetInfo.widgetName === 'NutritionCompactWidget') {
      renderWidget(<NutritionCompactWidget data={data} />);
    } else {
      renderWidget(<NutritionDashboardWidget data={data} />);
    }
  }
}
