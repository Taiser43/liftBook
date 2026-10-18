const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `  const finishWorkout = () => {`,
  `  const finishWorkout = (skipNavigation = false) => {`
);

code = code.replace(
  `    if (navigation && navigation.navigate) {
      navigation.navigate('MainTabs', { screen: 'Cardio' } as any);
      setTimeout(() => navigation.navigate('CardioHistory'), 100);
    }`,
  `    if (!skipNavigation && navigation && navigation.navigate) {
      navigation.navigate('MainTabs', { screen: 'Cardio' } as any);
      setTimeout(() => navigation.navigate('CardioHistory'), 100);
    }`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
