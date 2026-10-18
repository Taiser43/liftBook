const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `    addCompletedWorkout(completedWorkout);

    setLiveWorkoutModalVisible(false);`;

const newTarget = `    addCompletedWorkout(completedWorkout);

    // Save Freestyle Workout if it's new
    if (activePlan.id.startsWith('spontaneous_')) {
      const finalPlan: WorkoutPlan = {
        ...activePlan,
        exercises: updatedPlanExercises
      };
      useAppStore.getState().addSpontaneousWorkout(finalPlan);
    }

    setLiveWorkoutModalVisible(false);`;

code = code.replace(target, newTarget);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Patched finish logic");
