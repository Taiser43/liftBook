import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { getWidgetNutritionData } from './widgetData';
import { NutritionDashboardWidget } from './NutritionDashboardWidget';
import { NutritionCompactWidget } from './NutritionCompactWidget';

let isUpdating = false;
let pendingUpdate = false;

/**
 * Triggers a full re-render of all active nutrition widgets on the Android home screen.
 * Debounced and safe against concurrent calls.
 */
export async function updateAllNutritionWidgets(): Promise<void> {
  if (Platform.OS !== 'android') return;

  if (isUpdating) {
    pendingUpdate = true;
    return;
  }

  isUpdating = true;
  pendingUpdate = false;

  try {
    const data = getWidgetNutritionData();

    // 1. Update 4x2 Dashboard Widget
    await requestWidgetUpdate({
      widgetName: 'NutritionDashboardWidget',
      renderWidget: () => <NutritionDashboardWidget data={data} />,
    }).catch(() => {
      // Ignored if widget is not placed on homescreen
    });

    // 2. Update 2x2 Compact Widget
    await requestWidgetUpdate({
      widgetName: 'NutritionCompactWidget',
      renderWidget: () => <NutritionCompactWidget data={data} />,
    }).catch(() => {
      // Ignored if widget is not placed on homescreen
    });
  } catch (error) {
    console.warn('[WidgetSyncService] Failed to update widgets:', error);
  } finally {
    isUpdating = false;
    if (pendingUpdate) {
      pendingUpdate = false;
      setTimeout(() => {
        updateAllNutritionWidgets();
      }, 300);
    }
  }
}
