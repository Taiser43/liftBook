sed -i '' -e '337,348c\
            <TouchableOpacity key={meal.id} style={styles.loggedMealItem} \
              onLongPress={() => {\
                Alert.alert(\
                  "Move to Yesterday",\
                  "Do you want to log this meal for yesterday instead?",\
                  [\
                    { text: "Cancel", style: "cancel" },\
                    { text: "Log for yesterday", style: "destructive", onPress: () => moveMealToYesterday(meal.id) }\
                  ]\
                );\
              }}\
              onPress={() => {\
' src/screens/NutritionScreen.tsx
