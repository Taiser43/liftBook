sed -i '' -e 's/deleteIngredient,/deleteIngredient,\n    incrementIngredientUsage,/g' src/screens/NutritionScreen.tsx
