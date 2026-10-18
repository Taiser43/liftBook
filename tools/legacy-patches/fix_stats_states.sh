sed -i '' -e '/const \[musicTimeRange/a\
  const [workoutTimeRange, setWorkoutTimeRange] = useState<'\''1w'\'' | '\''1m'\'' | '\''1y'\''>('\''1w'\'');\
  const [nutritionTimeRange, setNutritionTimeRange] = useState<'\''1w'\'' | '\''1m'\'' | '\''1y'\''>('\''1w'\'');\
  const [exerciseTimeRange, setExerciseTimeRange] = useState<'\''1w'\'' | '\''1m'\'' | '\''1y'\''>('\''1w'\'');\
' src/screens/StatsScreen.tsx
