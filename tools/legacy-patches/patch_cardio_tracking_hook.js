const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

// Import hook
code = code.replace(
  `import { requestBlePermissions } from '../utils/blePermissions';`,
  `import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';`
);

// Replace state and mock logic
code = code.replace(
  `  // HR via BLE (optional) or Mock Watch
  const [currentHR, setCurrentHR] = useState(0);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const bleManagerRef = useRef<any>(null);
  
  // Galaxy Watch 5 Mock
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;`,
  `  const { currentHR, isWatchConnected, toggleConnection, setCurrentHR, setIsWatchConnected } = useHeartRateMonitor();
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;`
);

// Remove the old connection method and BLE manager declaration
code = code.replace(
  `// BLE Manager – optional. If react-native-ble-plx not available it's caught below.
let BleManager: any = null;
try {
  BleManager = require('react-native-ble-plx').BleManager;
} catch {}`,
  ``
);

code = code.replace(
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
      
      bleManagerRef.current.startDeviceScan(['180D'], null, async (error: any, device: any) => {
            const connected = await device.connect();
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
            });
          } catch (connErr) {
             console.warn('Connection failed', connErr);
             alert('Failed to connect to Heart Rate Monitor.');
          }
        }
      });
      
      // Stop scan after 10 seconds if nothing found
      setTimeout(() => {
        if (bleManagerRef.current) bleManagerRef.current.stopDeviceScan();
      }, 10000);
      
    } catch (err) {
      console.warn('BLE error', err);
    }
  };`,
  `  const connectToHRMonitor = toggleConnection;`
);

// Cleanup
code = code.replace(
  `      if (timerRef.current) clearInterval(timerRef.current);
      if (fgSubRef.current) fgSubRef.current.remove();
      if (bleManagerRef.current) bleManagerRef.current.destroy();`,
  `      if (timerRef.current) clearInterval(timerRef.current);
      if (fgSubRef.current) fgSubRef.current.remove();`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
