const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

// Import ConfettiCannon
code = code.replace(
  `import { useAppStore } from '../store/store';`,
  `import { useAppStore } from '../store/store';\nimport ConfettiCannon from 'react-native-confetti-cannon';\nimport { Dimensions, View } from 'react-native';`
);

// Destructure triggers
code = code.replace(
  `const checkDailyReset = useAppStore(state => state.checkDailyReset);`,
  `const checkDailyReset = useAppStore(state => state.checkDailyReset);
  const triggerMacroConfetti = useAppStore(state => state.triggerMacroConfetti);
  const setTriggerMacroConfetti = useAppStore(state => state.setTriggerMacroConfetti);
  const triggerStreakConfetti = useAppStore(state => state.triggerStreakConfetti);
  const setTriggerStreakConfetti = useAppStore(state => state.setTriggerStreakConfetti);`
);

// Render Confetti
const returnTarget = `    <NavigationContainer>`;
const returnReplacement = `    <View style={{ flex: 1 }}>
      <NavigationContainer>`;

const endTarget = `    </NavigationContainer>`;
const endReplacement = `    </NavigationContainer>

      {triggerMacroConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <ConfettiCannon
            count={200}
            origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
            fadeOut={true}
            fallSpeed={3000}
            onAnimationEnd={() => setTriggerMacroConfetti(false)}
          />
        </View>
      )}

      {triggerStreakConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <ConfettiCannon
            count={300}
            origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
            fadeOut={true}
            fallSpeed={3000}
            colors={['#FFD700', '#FF8C00', '#FF3B30', '#00D2FF', '#30D158']}
            onAnimationEnd={() => setTriggerStreakConfetti(false)}
          />
        </View>
      )}
    </View>`;

code = code.replace(returnTarget, returnReplacement);
code = code.replace(endTarget, endReplacement);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
