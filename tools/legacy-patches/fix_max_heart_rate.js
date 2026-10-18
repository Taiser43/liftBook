const fs = require('fs');
const p = 'src/components/GlobalActivityBar.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /currentHeartRate, connectedDeviceId, maxHeartRate,/,
  "currentHeartRate, connectedDeviceId,"
);

c = c.replace(
  /import \{ useAppStore \} from '\.\.\/store\/store';/,
  "import { useAppStore } from '../store/store';\nimport { useCardioStore } from '../store/useCardioStore';"
);

c = c.replace(
  /const maxHeartRateSetting = maxHeartRate \|\| 190;/,
  "const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting) || 190;"
);

fs.writeFileSync(p, c);
console.log('Fixed maxHeartRateSetting');
