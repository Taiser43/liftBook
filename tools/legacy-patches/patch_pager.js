const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

const oldPagerRegex = /<View key=\{item\.id\} style=\{styles\.page\}>\s*\{\/\* The Trading Card \*\/\}\s*<View style=\{\[styles\.cardFull[\s\S]*?\{\/\* Action Buttons at the Bottom of the Screen \*\/\}/;

const newPagerCode = `<View key={item.id} style={styles.page}>
                  <FlippableExerciseCard 
                    item={item}
                    imageUri={imageUri}
                    stats={stats}
                    chartLabels={chartLabels}
                    chartData={chartData}
                    levelData={levelData}
                    borderColor={borderColor}
                    collectionType={collectionType}
                    screenWidth={screenWidth}
                    styles={styles}
                  />

                  {/* Action Buttons at the Bottom of the Screen */}`;

if (oldPagerRegex.test(c)) {
  c = c.replace(oldPagerRegex, newPagerCode);
  fs.writeFileSync(p, c);
  console.log('Replaced inline card with FlippableExerciseCard');
} else {
  console.log('Regex did not match');
}
