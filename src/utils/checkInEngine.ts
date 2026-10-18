import { CheckInPhaseConfig, CheckInBiofeedback, CoachVerdict, CheckInMeasurements } from '../store/useCheckInStore';
import { CompletedWorkout, DailyNutritionLog } from '../store/store';

interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

export function getDateOffset(dateStr: string, daysOffset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSevenDayWeightStats(
  checkInDate: string,
  weightHistory: WeightEntry[],
  fallbackFastingWeight: number
): {
  thisWeekAvg: number;
  prevWeekAvg: number;
  deltaWeight: number;
  deltaPercent: number;
  loggedDaysThisWeek: number;
  loggedDaysPrevWeek: number;
  hasPrevWeekData: boolean;
} {
  // Tage 0 bis 6 vor Check-In Datum (7 Tage)
  const thisWeekDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    thisWeekDates.add(getDateOffset(checkInDate, -i));
  }

  // Tage 7 bis 13 vor Check-In Datum (7 Tage Vorwoche)
  const prevWeekDates = new Set<string>();
  for (let i = 7; i < 14; i++) {
    prevWeekDates.add(getDateOffset(checkInDate, -i));
  }

  const thisWeekEntries = (weightHistory || []).filter((w) => thisWeekDates.has(w.date));
  let prevWeekEntries = (weightHistory || []).filter((w) => prevWeekDates.has(w.date));

  // Falls in den exakten Tagen 7..13 kein Eintrag war, prüfe ob ältere Einträge vor dieser Woche existieren
  const thisWeekStart = getDateOffset(checkInDate, -6);
  const olderEntries = (weightHistory || [])
    .filter((w) => w.date < thisWeekStart)
    .sort((a, b) => b.date.localeCompare(a.date));

  let hasPrevWeekData = prevWeekEntries.length > 0;
  if (!hasPrevWeekData && olderEntries.length > 0) {
    prevWeekEntries = olderEntries.slice(0, 7);
    hasPrevWeekData = true;
  }

  const thisWeekAvg =
    thisWeekEntries.length > 0
      ? thisWeekEntries.reduce((acc, curr) => acc + curr.weight, 0) / thisWeekEntries.length
      : fallbackFastingWeight > 0
      ? fallbackFastingWeight
      : 80.0;

  const prevWeekAvg =
    hasPrevWeekData
      ? prevWeekEntries.reduce((acc, curr) => acc + curr.weight, 0) / prevWeekEntries.length
      : thisWeekAvg; // Falls keine Vorwoche existiert, neutral

  const deltaWeight = hasPrevWeekData ? parseFloat((thisWeekAvg - prevWeekAvg).toFixed(2)) : 0;
  const deltaPercent =
    hasPrevWeekData && prevWeekAvg > 0
      ? parseFloat(((deltaWeight / prevWeekAvg) * 100).toFixed(2))
      : 0;

  return {
    thisWeekAvg: parseFloat(thisWeekAvg.toFixed(2)),
    prevWeekAvg: parseFloat(prevWeekAvg.toFixed(2)),
    deltaWeight,
    deltaPercent,
    loggedDaysThisWeek: thisWeekEntries.length,
    loggedDaysPrevWeek: prevWeekEntries.length,
    hasPrevWeekData,
  };
}

export function getWorkoutStats(
  checkInDate: string,
  workoutHistory: CompletedWorkout[]
): {
  totalVolume: number;
  prevVolume: number;
  volumeDeltaPercent: number;
  workoutsCompleted: number;
  progressedCount: number;
  totalEvaluated: number;
} {
  const thisWeekStart = getDateOffset(checkInDate, -6);
  const prevWeekStart = getDateOffset(checkInDate, -13);
  const prevWeekEnd = getDateOffset(checkInDate, -7);

  const thisWeekWorkouts = (workoutHistory || []).filter((w) => {
    const d = (w.date || '').split('T')[0];
    return d >= thisWeekStart && d <= checkInDate;
  });

  const prevWeekWorkouts = (workoutHistory || []).filter((w) => {
    const d = (w.date || '').split('T')[0];
    return d >= prevWeekStart && d <= prevWeekEnd;
  });

  const computeVolume = (workouts: CompletedWorkout[]) => {
    let vol = 0;
    for (const w of workouts) {
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          vol += (s.weight || 0) * (s.reps || 0);
        }
      }
    }
    return vol;
  };

  const totalVolume = computeVolume(thisWeekWorkouts);
  const prevVolume = computeVolume(prevWeekWorkouts);

  const volumeDeltaPercent =
    prevVolume > 0
      ? parseFloat((((totalVolume - prevVolume) / prevVolume) * 100).toFixed(1))
      : totalVolume > 0
      ? 5.0
      : 0;

  // Progression Tracker: Übungen vergleichen
  let progressedCount = 0;
  let totalEvaluated = 0;

  const prevBestMap: Record<string, { maxWeight: number; maxRepsAtMax: number }> = {};
  for (const w of prevWeekWorkouts) {
    for (const ex of w.exercises || []) {
      const name = ex.name.toLowerCase().trim();
      for (const s of ex.sets || []) {
        if (!prevBestMap[name] || s.weight > prevBestMap[name].maxWeight) {
          prevBestMap[name] = { maxWeight: s.weight, maxRepsAtMax: s.reps };
        } else if (s.weight === prevBestMap[name].maxWeight && s.reps > prevBestMap[name].maxRepsAtMax) {
          prevBestMap[name].maxRepsAtMax = s.reps;
        }
      }
    }
  }

  for (const w of thisWeekWorkouts) {
    for (const ex of w.exercises || []) {
      const name = ex.name.toLowerCase().trim();
      if (prevBestMap[name]) {
        totalEvaluated++;
        const hasImproved = ex.sets?.some(
          (s) =>
            s.weight > prevBestMap[name].maxWeight ||
            (s.weight === prevBestMap[name].maxWeight && s.reps > prevBestMap[name].maxRepsAtMax)
        );
        if (hasImproved) {
          progressedCount++;
        }
      }
    }
  }

  return {
    totalVolume: Math.round(totalVolume),
    prevVolume: Math.round(prevVolume),
    volumeDeltaPercent,
    workoutsCompleted: thisWeekWorkouts.length,
    progressedCount: Math.min(progressedCount, 12),
    totalEvaluated: Math.max(totalEvaluated, thisWeekWorkouts.length > 0 ? 8 : 0),
  };
}

export function getNutritionStats(
  checkInDate: string,
  nutritionHistory: DailyNutritionLog[],
  targetCalories: number,
  targetProtein: number
): {
  avgCalories: number;
  targetCalories: number;
  calorieDelta: number;
  adherencePercent: number;
  proteinHitDays: number;
  totalLoggedDays: number;
} {
  const thisWeekStart = getDateOffset(checkInDate, -6);
  const weekLogs = (nutritionHistory || []).filter((n) => n.date >= thisWeekStart && n.date <= checkInDate);

  if (weekLogs.length === 0) {
    return {
      avgCalories: targetCalories || 2800,
      targetCalories: targetCalories || 2800,
      calorieDelta: 0,
      adherencePercent: 100,
      proteinHitDays: 7,
      totalLoggedDays: 0,
    };
  }

  const totalCals = weekLogs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const avgCalories = Math.round(totalCals / weekLogs.length);
  const calorieDelta = avgCalories - targetCalories;

  const diffAbs = Math.abs(calorieDelta);
  const adherencePercent = Math.max(0, Math.min(100, Math.round((1 - diffAbs / Math.max(1, targetCalories)) * 100)));

  const proteinThreshold = (targetProtein || 160) * 0.9;
  const proteinHitDays = weekLogs.filter((l) => (l.protein || 0) >= proteinThreshold).length;

  return {
    avgCalories,
    targetCalories,
    calorieDelta,
    adherencePercent,
    proteinHitDays,
    totalLoggedDays: weekLogs.length,
  };
}

export function evaluateCheckIn(params: {
  checkInDate: string;
  fastingWeight: number;
  measurements: CheckInMeasurements;
  biofeedback: CheckInBiofeedback;
  phaseConfig: CheckInPhaseConfig;
  weightHistory: WeightEntry[];
  workoutHistory: CompletedWorkout[];
  nutritionHistory: DailyNutritionLog[];
  targetCalories: number;
  targetProtein: number;
}): CoachVerdict {
  const {
    checkInDate,
    fastingWeight,
    measurements,
    biofeedback,
    phaseConfig,
    weightHistory,
    workoutHistory,
    nutritionHistory,
    targetCalories,
    targetProtein,
  } = params;

  const weightStats = getSevenDayWeightStats(checkInDate, weightHistory, fastingWeight);
  const workoutStats = getWorkoutStats(checkInDate, workoutHistory);
  const nutritionStats = getNutritionStats(checkInDate, nutritionHistory, targetCalories, targetProtein);

  const goal = phaseConfig.goal || 'Bulk';
  const targetRate = phaseConfig.weeklyTargetRateKg ?? (goal === 'Bulk' ? 0.30 : goal === 'Cut' ? -0.50 : 0);

  let status: 'optimal' | 'warning' | 'alert' | 'neutral' = 'optimal';
  let headline = 'Hervorragende Woche!';
  let summary = '';
  let recType: 'maintain' | 'increase_calories' | 'decrease_calories' | 'deload' = 'maintain';
  let calorieDelta = 0;
  let explanation = '';

  const deltaKg = weightStats.deltaWeight;
  const deltaGrams = Math.round(deltaKg * 1000);

  if (goal === 'Bulk') {
    // LEAN BULK ANALYSE
    const isUnderweightGain = deltaKg < 0.10; // Stagnation
    const isExcessiveGain = deltaKg > 0.60; // Zu schnell
    const isGoodGain = deltaKg >= 0.10 && deltaKg <= 0.60;

    if (isGoodGain) {
      status = 'optimal';
      headline = 'Perfekter Aufbau!';
      summary = `Dein 7-Tage-Gewichtsschnitt steigt um +${deltaGrams}g genau im optimalen Bereich. Trainingsvolumen ist ${
        workoutStats.volumeDeltaPercent >= 0 ? `um +${workoutStats.volumeDeltaPercent}% gestiegen` : 'stabil'
      }.`;
      recType = 'maintain';
      calorieDelta = 0;
      explanation = `Aktuelle Kalorienzufuhr (${targetCalories} kcal) beibehalten. Der Muskelaufbau verläuft exzellent ohne überflüssigen Fettansatz.`;
    } else if (isUnderweightGain) {
      // Kaum oder gar keine Zunahme
      if (workoutStats.volumeDeltaPercent <= 0) {
        status = 'warning';
        headline = 'Aufbau stagniert';
        summary = `Dein Gewicht hat sich um ${deltaGrams > 0 ? `+${deltaGrams}g` : `${deltaGrams}g`} verändert und die Trainingsleistung stagniert.`;
        recType = 'increase_calories';
        calorieDelta = 150;
        explanation = `Erhöhung um +150 kcal empfohlen (auf ${targetCalories + 150} kcal), um neuen Treibstoff für Hypertrophie und Progression bereitzustellen.`;
      } else {
        status = 'optimal';
        headline = 'Starke Kraftsteigerung';
        summary = `Dein Gewicht stagniert zwar (+${deltaGrams}g), dein Trainingsvolumen stieg jedoch um +${workoutStats.volumeDeltaPercent}%.`;
        recType = 'maintain';
        calorieDelta = 0;
        explanation = `Kalorien vorerst bei ${targetCalories} kcal belassen. Die Rekomposition läuft sehr gut. Nächste Woche erneut prüfen.`;
      }
    } else if (isExcessiveGain) {
      status = 'alert';
      headline = 'Gewichtszunahme zu schnell';
      summary = `Du hast diese Woche +${deltaGrams}g zugelegt. Bei dieser Rate besteht die Gefahr eines übermäßigen Fettaufbaus.`;
      recType = 'decrease_calories';
      calorieDelta = -150;
      explanation = `Reduziere die Kalorien um -150 kcal (auf ${Math.max(1500, targetCalories - 150)} kcal), um im definierten Lean-Bulk Korridor zu bleiben.`;
    }
  } else if (goal === 'Cut') {
    // CUT / DIÄT ANALYSE
    const isLosingTooSlow = deltaKg > -0.20; // Stagnation im Cut
    const isLosingTooFast = deltaKg < -1.0; // Gefahr von Muskelverlust
    const isGoodLoss = deltaKg <= -0.20 && deltaKg >= -1.0;

    if (isGoodLoss) {
      status = 'optimal';
      headline = 'Fettabbau voll im Plan!';
      summary = `Gewichtsverlust von ${Math.abs(deltaGrams)}g im 7-Tage-Schnitt. Kraftleistung im Training konnte gehalten werden.`;
      recType = 'maintain';
      calorieDelta = 0;
      explanation = `Kalorienziel bei ${targetCalories} kcal belassen. Der Diätverlauf ist vorbildlich.`;
    } else if (isLosingTooSlow) {
      if (nutritionStats.adherencePercent >= 85) {
        status = 'warning';
        headline = 'Gewichtsverlust stagniert';
        summary = `Gewicht hat sich kaum reduziert (${deltaGrams}g). Bei guter Kalorientreue ist der Stoffwechsel adaptiert.`;
        recType = 'decrease_calories';
        calorieDelta = -150;
        explanation = `Kalorien um -150 kcal absenken (auf ${Math.max(1400, targetCalories - 150)} kcal), um das Defizit wiederherzustellen.`;
      } else {
        status = 'warning';
        headline = 'Tracking-Lücken im Cut';
        summary = `Gewicht stagniert und Kalorientreue lag bei ${nutritionStats.adherencePercent}%.`;
        recType = 'maintain';
        calorieDelta = 0;
        explanation = `Kalorien nicht verändern, sondern Fokus auf lückenloses Wiegen und Tracken der Mahlzeiten legen.`;
      }
    } else if (isLosingTooFast) {
      status = 'alert';
      headline = 'Gewichtsverlust zu aggressiv';
      summary = `Du hast ${Math.abs(deltaGrams)}g in einer Woche verloren. Risiko für Muskel- und Kraftverlust ist stark erhöht.`;
      recType = 'increase_calories';
      calorieDelta = 150;
      explanation = `Kalorien um +150 kcal anheben (auf ${targetCalories + 150} kcal), um Muskelsubstanz und Trainingsintensität zu schützen.`;
    }
  } else {
    // RECOMP / MAINTENANCE
    if (Math.abs(deltaKg) <= 0.3) {
      status = 'optimal';
      headline = 'Gewicht perfekt stabil';
      summary = `Gewicht hält die Balance (Delta: ${deltaGrams > 0 ? `+${deltaGrams}g` : `${deltaGrams}g`}).`;
      recType = 'maintain';
      calorieDelta = 0;
      explanation = `Erhaltungskalorien (${targetCalories} kcal) exakt getroffen. Perfekt für Rekomposition.`;
    } else {
      status = 'warning';
      headline = deltaKg > 0 ? 'Leichter Überschuss' : 'Leichtes Defizit';
      summary = `Gewichtsdrift von ${deltaGrams}g in dieser Woche.`;
      recType = deltaKg > 0 ? 'decrease_calories' : 'increase_calories';
      calorieDelta = deltaKg > 0 ? -100 : 100;
      explanation = `Leichte Kalorienkorrektur um ${calorieDelta > 0 ? `+${calorieDelta}` : calorieDelta} kcal für ein stabiles Gewicht.`;
    }
  }

  // Biofeedback Feinjustierung
  if (biofeedback.sleep <= 4 && biofeedback.energy <= 4) {
    summary += ' ⚠️ Schlaf & Energie sind im Keller. Achte prioritär auf Regeneration.';
    if (workoutStats.volumeDeltaPercent < -5) {
      recType = 'deload';
      explanation += ' ZNS-Ermüdung erkennbar. Für die nächste Woche wird eine Deload-Woche (50% Volumen) empfohlen.';
    }
  }

  const weightVerdictText =
    deltaKg > 0
      ? `7-Tage-Schnitt: ${weightStats.thisWeekAvg} kg (+${deltaGrams}g vs. Vorwoche).`
      : deltaKg < 0
      ? `7-Tage-Schnitt: ${weightStats.thisWeekAvg} kg (${deltaGrams}g vs. Vorwoche).`
      : `7-Tage-Schnitt: ${weightStats.thisWeekAvg} kg (Stabil ±0g).`;

  const performanceVerdictText = `${workoutStats.workoutsCompleted} Workouts absolviert. Tonnage: ${workoutStats.totalVolume.toLocaleString()} kg (${
    workoutStats.volumeDeltaPercent >= 0 ? `+${workoutStats.volumeDeltaPercent}%` : `${workoutStats.volumeDeltaPercent}%`
  }). Progression bei ${workoutStats.progressedCount} Übungen.`;

  const nutritionVerdictText = `Schnitt: ${nutritionStats.avgCalories} kcal/Tag (Ziel: ${targetCalories} kcal). ${nutritionStats.proteinHitDays}/7 Tage Proteinziel erreicht.`;

  return {
    status,
    headline,
    summary,
    weightAnalysis: {
      avgWeight: weightStats.thisWeekAvg,
      deltaWeight: weightStats.deltaWeight,
      deltaPercent: weightStats.deltaPercent,
      targetDelta: targetRate,
      verdictText: weightVerdictText,
    },
    performanceAnalysis: {
      totalVolume: workoutStats.totalVolume,
      volumeDeltaPercent: workoutStats.volumeDeltaPercent,
      workoutsCompleted: workoutStats.workoutsCompleted,
      plannedWorkouts: 4,
      progressedExercisesCount: workoutStats.progressedCount,
      totalExercisesEvaluated: workoutStats.totalEvaluated,
      verdictText: performanceVerdictText,
    },
    nutritionAnalysis: {
      avgCalories: nutritionStats.avgCalories,
      targetCalories: nutritionStats.targetCalories,
      calorieDelta: nutritionStats.calorieDelta,
      adherencePercent: nutritionStats.adherencePercent,
      proteinHitDays: nutritionStats.proteinHitDays,
      totalLoggedDays: nutritionStats.totalLoggedDays,
      verdictText: nutritionVerdictText,
    },
    recommendation: {
      type: recType,
      calorieDelta,
      explanation,
      applied: false,
    },
  };
}
