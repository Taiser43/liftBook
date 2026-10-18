const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

// Add globalCardioModalVisible to hooks
code = code.replace(
  `  const setGlobalCardioSession = useAppStore(state => state.setGlobalCardioSession);`,
  `  const setGlobalCardioSession = useAppStore(state => state.setGlobalCardioSession);
  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);`
);

// Update onPress
code = code.replace(
  `          onPress={() => {
            if (navigationRef.isReady()) {
              (navigationRef as any).navigate('CardioTracking');
            }
          }}`,
  `          onPress={() => {
            setGlobalCardioModalVisible(true);
          }}`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
