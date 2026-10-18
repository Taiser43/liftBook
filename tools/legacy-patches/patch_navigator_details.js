const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

if (!code.includes('CardioSessionDetailScreen')) {
  code = code.replace(
    `import CardioHistoryScreen from '../screens/CardioHistoryScreen';`,
    `import CardioHistoryScreen from '../screens/CardioHistoryScreen';\nimport CardioSessionDetailScreen from '../screens/CardioSessionDetailScreen';`
  );

  code = code.replace(
    `<Stack.Screen name="CardioHistory" component={CardioHistoryScreen} />`,
    `<Stack.Screen name="CardioHistory" component={CardioHistoryScreen} />\n          <Stack.Screen name="CardioSessionDetail" component={CardioSessionDetailScreen} />`
  );

  fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
  console.log('AppNavigator patched');
}
