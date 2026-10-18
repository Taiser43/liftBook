const fs = require('fs');
const p = 'src/components/GlobalActivityBar.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /isWatchConnected, currentHeartRate, maxHeartRateSetting,/,
  "currentHeartRate, connectedDeviceId, maxHeartRate,"
);

c = c.replace(
  /const playbackState = usePlaybackState\(\);/,
  `const playbackState = usePlaybackState();
  const isWatchConnected = !!connectedDeviceId;
  const maxHeartRateSetting = maxHeartRate || 190;`
);

c = c.replace(
  /currentHeartRate > 0/g,
  "(currentHeartRate || 0) > 0"
);

c = c.replace(
  /getHeartRateZoneColor\(currentHeartRate/g,
  "getHeartRateZoneColor(currentHeartRate || 0"
);

fs.writeFileSync(p, c);
console.log('Fixed GlobalActivityBar state dependencies');
