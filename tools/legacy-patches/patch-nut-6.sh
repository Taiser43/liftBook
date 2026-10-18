sed -i '' -e 's/deleteLoggedMeal,/deleteLoggedMeal,\n    moveMealToYesterday,/g' src/screens/NutritionScreen.tsx
