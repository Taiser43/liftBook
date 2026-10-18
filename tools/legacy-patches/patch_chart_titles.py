import re
with open('src/screens/StatsScreen.tsx', 'r') as f:
    code = f.read()

workout_repl = """
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.chartTitle, { marginBottom: 0 }]}>Workout Volume (kg)</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['1w', '1m', '1y'].map(range => (
                <TouchableOpacity key={range} onPress={() => setWorkoutTimeRange(range as any)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: workoutTimeRange === range ? '#00D2FF20' : '#2A2A2A', borderWidth: 1, borderColor: workoutTimeRange === range ? '#00D2FF' : '#444' }}>
                  <Text style={{ color: workoutTimeRange === range ? '#00D2FF' : '#888', fontSize: 10, fontWeight: '700' }}>{range.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
"""

code = code.replace("<Text style={styles.chartTitle}>Workout Volume (kg)</Text>", workout_repl.strip())

nutrition_repl = """
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.chartTitle, { marginBottom: 0 }]}>Calories Consumed (kcal)</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['1w', '1m', '1y'].map(range => (
                <TouchableOpacity key={range} onPress={() => setNutritionTimeRange(range as any)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: nutritionTimeRange === range ? 'rgba(48, 209, 88, 0.2)' : '#2A2A2A', borderWidth: 1, borderColor: nutritionTimeRange === range ? '#30D158' : '#444' }}>
                  <Text style={{ color: nutritionTimeRange === range ? '#30D158' : '#888', fontSize: 10, fontWeight: '700' }}>{range.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
"""

code = code.replace("<Text style={styles.chartTitle}>Calories Consumed (kcal)</Text>", nutrition_repl.strip())

with open('src/screens/StatsScreen.tsx', 'w') as f:
    f.write(code)
