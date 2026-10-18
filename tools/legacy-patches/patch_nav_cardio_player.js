const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

code = code.replace(
  `  const globalCardioActive = useAppStore(state => state.globalCardioActive);`,
  `  const globalCardioActive = useAppStore(state => state.globalCardioActive);\n  const globalCardioActivityType = useAppStore(state => state.globalCardioActivityType);`
);

code = code.replace(
  `            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons name="run" size={24} color="#FFF" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.miniPlayerTitle}>Cardio Tracking</Text>`,
  `            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons 
                name={
                  globalCardioActivityType === 'Cycling' ? 'bike' :
                  globalCardioActivityType === 'Swimming' ? 'swim' :
                  globalCardioActivityType === 'Walking' ? 'walk' :
                  globalCardioActivityType === 'Boxing' ? 'boxing-glove' :
                  globalCardioActivityType === 'Paddle' ? 'oar' :
                  globalCardioActivityType === 'Football' ? 'soccer' : 'run'
                } 
                size={24} color="#FFF" style={{ marginRight: 12 }} 
              />
              <View>
                <Text style={styles.miniPlayerTitle}>{globalCardioActivityType} Session</Text>`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
