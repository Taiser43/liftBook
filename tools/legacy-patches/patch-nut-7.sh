sed -i '' -e '/if (meal.ingredients && meal.ingredients.length > 0) {/i\
              }} onLongPress={() => {\
                Alert.alert(\
                  "Move to Yesterday",\
                  "Do you want to log this meal for yesterday instead?",\
                  [\
                    { text: "Cancel", style: "cancel" },\
                    { text: "Log for yesterday", style: "destructive", onPress: () => moveMealToYesterday(meal.id) }\
                  ]\
                );\
' src/screens/NutritionScreen.tsx
