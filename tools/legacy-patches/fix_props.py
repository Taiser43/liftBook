import re
with open('src/screens/StatsScreen.tsx', 'r') as f:
    code = f.read()

pattern1 = r'const FlippableExerciseCard = \(\{\s*item,\s*imageUri,\s*stats,\s*chartLabels,\s*chartData,\s*levelData,\s*borderColor,\s*collectionType,\s*screenWidth,\s*styles\s*\}:\s*any\s*\) => \{'

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

with open('src/screens/StatsScreen.tsx', 'w') as f:
    f.write(code)
