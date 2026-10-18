import { CompletedWorkout, WorkoutProgram, DailyNutritionLog } from '../store/store';

export function calculateStreaks(
  workoutHistory: CompletedWorkout[],
  programs: WorkoutProgram[],
  nutritionHistory: DailyNutritionLog[],
  consumedToday: { calories: number; protein: number; carbs: number; fat: number },
  targets: { calories: number; protein: number; carbs: number; fat: number }
) {
  const getDateStr = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
  };
  const today = new Date();
  
  const activeProgram = programs.find(p => p.isActive);
  const currentWorkouts = activeProgram ? activeProgram.workouts : [];
  
  const isDayScheduled = (dayOfWeekName: string) => {
    return currentWorkouts.some(plan => 
      Array.isArray(plan.daysOfWeek) && plan.daysOfWeek.some(d => d.toLowerCase() === dayOfWeekName.toLowerCase())
    );
  };

  const getDayName = (dateStr: string) => {
    // Add time component so timezone doesn't shift the day incorrectly
    return new Date(dateStr + "T12:00:00").toLocaleDateString('en-US', { weekday: 'long' });
  };
  
  const workoutDays = new Set(workoutHistory.map(w => w.date.substring(0, 10)));
  const nutritionDays = new Map(nutritionHistory.map(n => [n.date, n.hitGoal]));

  const calDiff = Math.abs(consumedToday.calories - targets.calories) / targets.calories;
  const proRatio = targets.protein > 0 ? (consumedToday.protein / targets.protein) : 1;
  const hitGoalToday = (calDiff <= 0.1) && (proRatio >= 0.9);
  
  nutritionDays.set(getDateStr(today), hitGoalToday);

  let currentTrain = 0, currentNutr = 0, currentOverall = 0;
  let brokeTrain = false, brokeNutr = false, brokeOverall = false;

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateStr(d);
    const dayName = getDayName(dateStr);
    
    const scheduled = isDayScheduled(dayName);
    const workedOut = workoutDays.has(dateStr);
    
    if (!brokeTrain) {
      if (scheduled) {
        if (workedOut) currentTrain++;
        else {
          if (i !== 0) brokeTrain = true;
        }
      } else {
        if (workedOut) currentTrain++; 
      }
    }

    const hitNutr = nutritionDays.get(dateStr) || false;
    if (!brokeNutr) {
      if (hitNutr) currentNutr++;
      else {
        if (i !== 0) brokeNutr = true;
      }
    }
    
    const daySatisfied = (workedOut || !scheduled) && hitNutr;
    if (!brokeOverall) {
      if (daySatisfied) currentOverall++;
      else {
        if (i !== 0) brokeOverall = true;
      }
    }

    if (brokeTrain && brokeNutr && brokeOverall) break;
  }

  let tempT = 0, tempN = 0, tempO = 0;
  let maxT = 0, maxN = 0, maxO = 0;

  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateStr(d);
    const dayName = getDayName(dateStr);
    
    const scheduled = isDayScheduled(dayName);
    const workedOut = workoutDays.has(dateStr);
    const hitNutr = nutritionDays.get(dateStr) || false;

    if (scheduled) {
      if (workedOut) tempT++;
      else tempT = 0;
    } else {
      if (workedOut) tempT++;
    }
    if (tempT > maxT) maxT = tempT;

    if (hitNutr) tempN++;
    else tempN = 0;
    if (tempN > maxN) maxN = tempN;

    const daySatisfied = (workedOut || !scheduled) && hitNutr;
    if (daySatisfied) tempO++;
    else tempO = 0;
    if (tempO > maxO) maxO = tempO;
  }

  maxT = Math.max(maxT, currentTrain);
  maxN = Math.max(maxN, currentNutr);
  maxO = Math.max(maxO, currentOverall);

  return {
    training: currentTrain,
    nutrition: currentNutr,
    overall: currentOverall,
    maxTraining: maxT,
    maxNutrition: maxN,
    maxOverall: maxO,
    workedOutToday: workoutDays.has(getDateStr(today)),
    hitNutritionToday: hitGoalToday
  };
}
