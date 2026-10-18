const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

// Remove from Stack
code = code.replace(
  `          <Stack.Screen name="CardioTracking" component={CardioTrackingScreen} />\n`,
  ``
);

// Add as a global component at the bottom
code = code.replace(
  `      {/* GLOBAL MINIMIZED CARDIO PLAYER */}`,
  `      <CardioTrackingScreen navigation={navigationRef} />\n      {/* GLOBAL MINIMIZED CARDIO PLAYER */}`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
