sed -i '' -e '/updateIngredient(scannedIngredient);/a\
                  incrementIngredientUsage(scannedIngredient.id);\
' src/screens/NutritionScreen.tsx
