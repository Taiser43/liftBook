const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `import { getHeartRateZoneColor } from '../utils/heartRate';`,
  `import { getHeartRateZoneColor } from '../utils/heartRate';\nimport { requestBlePermissions } from '../utils/blePermissions';`
);

code = code.replace(
  `// BLE Manager – optional. If react-native-ble-plx not available it's caught below.
let BleManager: any = null;
try {
  BleManager = require('react-native-ble-plx').BleManager;
} catch {}`,
  `// BLE Manager
let BleManager: any = null;
try {
  BleManager = require('react-native-ble-plx').BleManager;
} catch {}`
);

// We need to find the connectToHRMonitor in TrainingScreen.tsx
// It's probably similarly mocked.
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
