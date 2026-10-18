const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

code = code.replace(
  `  const setTriggerStreakConfetti = useAppStore(state => state.setTriggerStreakConfetti);

  useEffect(() => {
    checkDailyReset();
  }, []);`,
  `  const setTriggerStreakConfetti = useAppStore(state => state.setTriggerStreakConfetti);
  const totalXP = useAppStore(state => state.totalXP);
  const addXP = useAppStore(state => state.addXP);
  const workoutHistory = useAppStore(state => state.workoutHistory);
  const nutritionHistory = useAppStore(state => state.nutritionHistory);

  useEffect(() => {
    checkDailyReset();
    if (totalXP === 0 && (workoutHistory.length > 0 || nutritionHistory.length > 0)) {
      const calcXP = (workoutHistory.length * 500) + (nutritionHistory.filter(n => n.hitGoal).length * 250);
      if (calcXP > 0) {
         addXP(calcXP);
      }
    }
  }, [totalXP, workoutHistory.length, nutritionHistory.length]);`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
