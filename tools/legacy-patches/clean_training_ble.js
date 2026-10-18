const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `// BLE Manager
let BleManager: any = null;
try {
  BleManager = require('react-native-ble-plx').BleManager;
} catch {}`,
  ``
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
