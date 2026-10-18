const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

// Add globalCardioModalVisible to hooks
code = code.replace(
  `  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);`,
  `  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);\n  const globalCardioModalVisible = useAppStore(state => state.globalCardioModalVisible);`
);

// Update condition
code = code.replace(
  `{globalCardioActive && (`,
  `{globalCardioActive && !globalCardioModalVisible && (`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
