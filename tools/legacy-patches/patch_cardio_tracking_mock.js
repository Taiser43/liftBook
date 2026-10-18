const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

// Add Animated to imports
code = code.replace(
  `import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Modal } from 'react-native';`,
  `import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Modal, Animated } from 'react-native';`
);

// Add heartRate mock logic
code = code.replace(
  `  // HR via BLE (optional)
  const [currentHR, setCurrentHR] = useState(0);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const bleManagerRef = useRef<any>(null);`,
  `  // HR via BLE (optional) or Mock Watch
  const [currentHR, setCurrentHR] = useState(0);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const bleManagerRef = useRef<any>(null);
  
  // Galaxy Watch 5 Mock
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
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
  }, [isTracking, isWatchConnected]);
  
  useEffect(() => {
    if (isWatchConnected && currentHR > 0) {
      const beatDuration = Math.max(380, Math.min(1000, Math.round((60 / currentHR) * 1000)));
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.28, duration: Math.round(beatDuration * 0.35), useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1, duration: Math.round(beatDuration * 0.65), useNativeDriver: true })
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      heartScale.setValue(1);
    }
  }, [isWatchConnected, currentHR]);`
);

// Modify connectToHRMonitor to simulate connection
code = code.replace(
  `  // ── Optional BLE HR monitor ──────────────────────────────────────────────────
  const connectToHRMonitor = async () => {
    if (!BleManager) { alert('BLE not available'); return; }`,
  `  // ── Optional BLE HR monitor ──────────────────────────────────────────────────
  const connectToHRMonitor = async () => {
    // MOCK CONNECTION
    setIsWatchConnected(prev => !prev);
    return;
    // -- Real BLE --
    if (!BleManager) { alert('BLE not available'); return; }`
);

// Update Bluetooth button to use isWatchConnected
code = code.replace(
  `        <TouchableOpacity onPress={connectToHRMonitor} style={styles.btButton}>
          <MaterialCommunityIcons
            name={connectedDevice ? 'bluetooth-connect' : 'bluetooth'}
            size={24}
            color={connectedDevice ? '#30D158' : 'white'}
          />
        </TouchableOpacity>`,
  `        <TouchableOpacity onPress={connectToHRMonitor} style={styles.btButton}>
          <MaterialCommunityIcons
            name={isWatchConnected || connectedDevice ? 'watch-variant' : 'watch-variant'}
            size={24}
            color={isWatchConnected || connectedDevice ? '#30D158' : 'white'}
          />
        </TouchableOpacity>`
);

// Update Heart Icon to pulse
code = code.replace(
  `                <><MaterialCommunityIcons name="heart" color="#FF3B30" size={22} /> {currentHR}</>`,
  `                <>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <MaterialCommunityIcons name="heart" color="#FF3B30" size={22} />
                  </Animated.View>
                  {' '}{currentHR}
                </>`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
