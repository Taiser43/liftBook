const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

code = code.replace(
  `    <NavigationContainer theme={DarkTheme}>`,
  `    <View style={{ flex: 1 }}>
      <NavigationContainer theme={DarkTheme}>`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
