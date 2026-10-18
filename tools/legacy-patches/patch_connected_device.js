const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

// The bluetooth icon used connectedDevice before
code = code.replace(
  `name={isWatchConnected || connectedDevice ? 'watch-variant' : 'watch-variant'}`,
  `name="watch-variant"`
);
code = code.replace(
  `color={isWatchConnected || connectedDevice ? '#30D158' : 'white'}`,
  `color={isWatchConnected ? '#30D158' : 'white'}`
);

// Any other references
code = code.replace(
  `    if (isWatchConnected || connectedDevice) {
       if (connectedDevice) await bleManagerRef.current.cancelDeviceConnection(connectedDevice.id);`,
  `    if (isWatchConnected) {`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
