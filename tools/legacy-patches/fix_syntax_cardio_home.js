const fs = require('fs');

let code = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');
code = code.replace(
  /onPress: async \(\) => {\n\s*if \(store\.finishCurrentCardio\) await store\.finishCurrentCardio\(true\);\n\s*store\.setGlobalCardioSessionInfo\(selectedActivity, null\);\n\s*store\.setGlobalCardioModalVisible\(true\);\n\s*}\n\s*}\n\s*}/,
  'onPress: async () => {\n                if (store.finishCurrentCardio) await store.finishCurrentCardio(true);\n                store.setGlobalCardioSessionInfo(selectedActivity, null);\n                store.setGlobalCardioModalVisible(true);\n              }'
);
code = code.replace(
  /onPress: async \(\) => {\n\s*if \(store\.finishCurrentStrength\) await store\.finishCurrentStrength\(true\);\n\s*store\.setGlobalCardioSessionInfo\(selectedActivity, null\);\n\s*store\.setGlobalCardioModalVisible\(true\);\n\s*}\n\s*}\n\s*}/,
  'onPress: async () => {\n                if (store.finishCurrentStrength) await store.finishCurrentStrength(true);\n                store.setGlobalCardioSessionInfo(selectedActivity, null);\n                store.setGlobalCardioModalVisible(true);\n              }'
);
fs.writeFileSync('src/screens/CardioHomeScreen.tsx', code);

let code2 = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');
code2 = code2.replace(
  /onPress: async \(\) => {\n\s*if \(store\.finishCurrentCardio\) await store\.finishCurrentCardio\(true\);\n\s*store\.setGlobalCardioSessionInfo\('Running', testType\);\n\s*store\.setGlobalCardioModalVisible\(true\);\n\s*}\n\s*}/,
  'onPress: async () => {\n              if (store.finishCurrentCardio) await store.finishCurrentCardio(true);\n              store.setGlobalCardioSessionInfo(\'Running\', testType);\n              store.setGlobalCardioModalVisible(true);\n            }'
);
code2 = code2.replace(
  /onPress: async \(\) => {\n\s*if \(store\.finishCurrentStrength\) await store\.finishCurrentStrength\(true\);\n\s*store\.setGlobalCardioSessionInfo\('Running', testType\);\n\s*store\.setGlobalCardioModalVisible\(true\);\n\s*}\n\s*}/,
  'onPress: async () => {\n              if (store.finishCurrentStrength) await store.finishCurrentStrength(true);\n              store.setGlobalCardioSessionInfo(\'Running\', testType);\n              store.setGlobalCardioModalVisible(true);\n            }'
);
fs.writeFileSync('src/screens/CardioTestsScreen.tsx', code2);
