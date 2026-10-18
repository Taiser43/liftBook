const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `  const handleFinishLiveWorkout = () => {`,
  `  const handleFinishLiveWorkout = (skipCelebration = false) => {`
);

code = code.replace(
  `    setLastCompletedWorkout(completedWorkoutEntry);
    setLiveWorkoutModalVisible(false);
    setActivePlan(null); // Clear the active plan to hide mini player
    setRestTimeLeft(null);
    setRestEndTime(null);
    setWorkoutStartTime(null);
    setCelebrationModalVisible(true);
    Vibration.vibrate([0, 200, 100, 300]);
  };`,
  `    setLastCompletedWorkout(completedWorkoutEntry);
    setLiveWorkoutModalVisible(false);
    setActivePlan(null); // Clear the active plan to hide mini player
    setRestTimeLeft(null);
    setRestEndTime(null);
    setWorkoutStartTime(null);
    if (!skipCelebration) {
      setCelebrationModalVisible(true);
      Vibration.vibrate([0, 200, 100, 300]);
    }
  };`
);

// Update handleStartLiveWorkout to pass true
code = code.replace(/handleFinishLiveWorkout\(\);/g, 'handleFinishLiveWorkout(true);');
code = code.replace(/if \(finishCurrentCardio\) finishCurrentCardio\(\);/g, 'if (finishCurrentCardio) finishCurrentCardio(true);');

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
