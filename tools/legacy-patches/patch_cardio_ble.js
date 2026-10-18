const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

// 1. Add import for requestBlePermissions
code = code.replace(
  `import { getHeartRateZoneColor } from '../utils/heartRate';`,
  `import { getHeartRateZoneColor } from '../utils/heartRate';\nimport { requestBlePermissions } from '../utils/blePermissions';`
);

// 2. Remove mock loop and fix connectToHRMonitor
code = code.replace(
  `  useEffect(() => {
    let hrInterval: any;
    if (isTracking && isWatchConnected) {
      if (currentHR === 0) {
        setCurrentHR(120);
        setHrHistory([120]);
      }
      hrInterval = setInterval(() => {
        setCurrentHR(prev => {
          let next = prev || 120;
          const jitter = Math.floor(Math.random() * 3) - 1;
          next = Math.max(105, Math.min(176, next + jitter));
          setHrHistory(h => [...h.slice(-180), next]);
          return next;
        });
      }, 1000);
    } else if (!isTracking) {
      setCurrentHR(0);
      setHrHistory([]);
    }
    return () => clearInterval(hrInterval);
  }, [isTracking, isWatchConnected]);`,
  ``
);

// We need to keep a way for the real BLE device to update the history.
// When currentHR changes, we can just push it to the history array every second if it's connected, or just push it when it changes.
// Actually, `CardioTrackingScreen` has a 1-second interval inside `startTracking` (timerRef).
// We can use that interval to push the currentHR to `hrHistory` array!

code = code.replace(
  `      setCalories(prev => prev + ((currentHR > 80 ? currentHR * 0.05 : 10) / 60));`,
  `      setCalories(prev => prev + ((currentHR > 80 ? currentHR * 0.05 : 10) / 60));
      
      if (currentHR > 0) {
        setHrHistory(h => [...h.slice(-180), currentHR]);
      }`
);

// Fix connectToHRMonitor
code = code.replace(
  `  // ── Optional BLE HR monitor ──────────────────────────────────────────────────
  const connectToHRMonitor = async () => {
    // MOCK CONNECTION
    setIsWatchConnected(prev => !prev);
    return;
    // -- Real BLE --
    if (!BleManager) { alert('BLE not available'); return; }
    if (!bleManagerRef.current) bleManagerRef.current = new BleManager();
    try {
      const state = await bleManagerRef.current.state();
      if (state !== 'PoweredOn') { alert('Bluetooth is not powered on'); return; }
      bleManagerRef.current.startDeviceScan(['180D'], null, async (error: any, device: any) => {`,
  `  // ── Optional BLE HR monitor ──────────────────────────────────────────────────
  const connectToHRMonitor = async () => {
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      alert('Bluetooth permissions denied.');
      return;
    }

    if (!BleManager) { alert('BLE module not available in this environment'); return; }
    if (!bleManagerRef.current) bleManagerRef.current = new BleManager();
    
    // Toggle off if already connected
    if (isWatchConnected || connectedDevice) {
       if (connectedDevice) await bleManagerRef.current.cancelDeviceConnection(connectedDevice.id);
       setConnectedDevice(null);
       setIsWatchConnected(false);
       setCurrentHR(0);
       return;
    }

    alert('Scanning for Heart Rate Monitor (make sure "Heart for Bluetooth" is broadcasting)...');
    try {
      // If state is not powered on, wait or alert
      const state = await bleManagerRef.current.state();
      if (state !== 'PoweredOn') { alert('Bluetooth is not powered on'); return; }
      
      bleManagerRef.current.startDeviceScan(['180D'], null, async (error: any, device: any) => {`
);

code = code.replace(
  `            const connected = await device.connect();
            await connected.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connected);
            connected.monitorCharacteristicForService('180D', '2A37', (err: any, characteristic: any) => {
              if (err) return;
              if (characteristic?.value) {
                const buffer = Buffer.from(characteristic.value, 'base64');
                const flags = buffer[0];
                const hr16bit = (flags & 1) !== 0;
                const hrValue = hr16bit ? buffer.readUInt16LE(1) : buffer.readUInt8(1);
                setCurrentHR(hrValue);
              }
            });`,
  `            const connected = await device.connect();
            await connected.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connected);
            setIsWatchConnected(true);
            alert('Connected to Heart Rate Monitor!');
            
            connected.monitorCharacteristicForService('180D', '2A37', (err: any, characteristic: any) => {
              if (err) {
                 console.warn(err);
                 setIsWatchConnected(false);
                 return;
              }
              if (characteristic?.value) {
                try {
                  const Buffer = require('buffer').Buffer;
                  const buffer = Buffer.from(characteristic.value, 'base64');
                  const flags = buffer[0];
                  const hr16bit = (flags & 1) !== 0;
                  const hrValue = hr16bit ? buffer.readUInt16LE(1) : buffer.readUInt8(1);
                  setCurrentHR(hrValue);
                } catch (e) {
                  console.warn('Error parsing HR data', e);
                }
              }
            });`
);

// We must also handle unmount disconnecting the BLE device
code = code.replace(
  `      if (timerRef.current) clearInterval(timerRef.current);
      if (fgSubRef.current) fgSubRef.current.remove();`,
  `      if (timerRef.current) clearInterval(timerRef.current);
      if (fgSubRef.current) fgSubRef.current.remove();
      if (bleManagerRef.current) bleManagerRef.current.destroy();`
);


fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
