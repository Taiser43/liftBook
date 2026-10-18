import re
with open('src/screens/StatsScreen.tsx', 'r') as f:
    code = f.read()

pattern1 = r'const FlippableExerciseCard = \(\{\s*item,\s*imageUri,\s*stats,\s*chartLabels,\s*chartData,\s*levelData,\s*borderColor,\s*collectionType,\s*screenWidth,\s*styles\s*\}\) => \{'

repl1 = """const FlippableExerciseCard = ({ 
  item, 
  imageUri, 
  stats, 
  chartLabels, 
  chartData, 
  levelData, 
  borderColor,
  collectionType,
  screenWidth,
  styles,
  exerciseTimeRange,
  setExerciseTimeRange
}: any) => {"""

code = re.sub(pattern1, repl1, code)

pattern2 = r'\{chartData\.length > 0 \? \(\s*<View style=\{\{ alignItems: \'center\' \}\}>\s*<LineChart'

repl2 = """{chartData.length > 0 ? (
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      {['1w', '1m', '1y'].map(range => (
                        <TouchableOpacity
                          key={range}
                          onPress={() => setExerciseTimeRange && setExerciseTimeRange(range)}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
                            backgroundColor: exerciseTimeRange === range ? '#00D2FF20' : '#2A2A2A',
                            borderWidth: 1, borderColor: exerciseTimeRange === range ? '#00D2FF' : '#444'
                          }}
                        >
                          <Text style={{ color: exerciseTimeRange === range ? '#00D2FF' : '#888', fontSize: 12, fontWeight: '700' }}>
                            {range.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <LineChart"""

code = re.sub(pattern2, repl2, code)

# Now pass these props into FlippableExerciseCard where it's used
pattern3 = r'(<FlippableExerciseCard\s+item=\{item\}[\s\S]*?styles=\{styles\})'
repl3 = r'\1\n                    exerciseTimeRange={exerciseTimeRange}\n                    setExerciseTimeRange={setExerciseTimeRange}'

code = re.sub(pattern3, repl3, code)

with open('src/screens/StatsScreen.tsx', 'w') as f:
    f.write(code)
