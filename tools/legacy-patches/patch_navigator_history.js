const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

if (!code.includes('WorkoutHistoryScreen')) {
  code = code.replace(
    `import CardioHistoryScreen from '../screens/CardioHistoryScreen';`,
    `import CardioHistoryScreen from '../screens/CardioHistoryScreen';\nimport WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';`
  );

  code = code.replace(
    `<Stack.Screen name="CardioHistory" component={CardioHistoryScreen} />`,
    `<Stack.Screen name="CardioHistory" component={CardioHistoryScreen} />\n          <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />`
  );

  fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
  console.log('AppNavigator patched');
}
