sed -i '' -e '/const \[scannedIngredient/a\
  const [actionMealId, setActionMealId] = useState<string | null>(null);\
' src/screens/NutritionScreen.tsx
