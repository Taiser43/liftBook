const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

if (!code.includes('globalCardioActivityType')) {
  code = code.replace(
    `  const globalCardioDuration = useAppStore(state => state.globalCardioDuration);`,
    `  const globalCardioActivityType = useAppStore(state => state.globalCardioActivityType);
  const globalCardioDuration = useAppStore(state => state.globalCardioDuration);`
  );
}

// Function to map activity type to icon
const getCardioIconStr = `
  const getCardioIcon = (type: string) => {
    switch (type) {
      case 'Running': return 'run';
      case 'Cycling': return 'bike';
      case 'Walking': return 'walk';
      case 'Swimming': return 'swim';
      case 'Boxing': return 'boxing-glove';
      case 'Football': return 'soccer';
      case 'Paddle': return 'tennis';
      default: return 'heart-pulse';
    }
  };
`;
if (!code.includes('getCardioIcon')) {
  code = code.replace(
    `  useEffect(() => {`,
    `${getCardioIconStr}\n  useEffect(() => {`
  );
}

code = code.replace(
  `              <View style={[styles.miniPlayerIconBg, { backgroundColor: '#0A2A0A' }]}>
                <MaterialCommunityIcons name="run-fast" size={20} color="#30D158" />
              </View>`,
  `              <View style={[styles.miniPlayerIconBg, { backgroundColor: '#0A2A0A' }]}>
                <MaterialCommunityIcons name={getCardioIcon(globalCardioActivityType || 'Running')} size={20} color="#30D158" />
              </View>`
);

code = code.replace(
  `                <Text style={[styles.miniPlayerTitle, { color: '#30D158' }]}>Cardio Active</Text>`,
  `                <Text style={[styles.miniPlayerTitle, { color: '#30D158' }]}>{globalCardioActivityType || 'Cardio'} Active</Text>`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
