const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// Import hook
code = code.replace(
  `import { requestBlePermissions } from '../utils/blePermissions';`,
  `import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';`
);

// Replace state and mock logic
code = code.replace(
  `  // Galaxy Watch 5 Simulation State
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [heartRate, setHeartRate] = useState(0);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;`,
  `  const { currentHR: heartRate, isWatchConnected, toggleConnection, setCurrentHR: setHeartRate, setIsWatchConnected } = useHeartRateMonitor();
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;`
);

// We need to feed the hrHistory somehow for TrainingScreen just like Cardio.
// TrainingScreen has its own setInterval? No, it used the HR interval for history.
// Let's check TrainingScreen's hr interval block and replace it.
code = code.replace(
  `  // Live Heart Rate Telemetry & Realistic Galaxy Watch 5 Simulation Loop
  useEffect(() => {
    let hrInterval: any;
    if (activePlan !== null && isWatchConnected) {
      if (heartRate === 0) {
        setHeartRate(120);
        setHrHistory([120]);
      }

      hrInterval = setInterval(() => {
        setHeartRate(prevBpm => {
          let nextBpm = prevBpm || 120;
          
          // If resting, gradually recover towards 115-125
          if (restTimeLeft !== null && restTimeLeft > 0) {
            if (nextBpm > 122) {
              nextBpm -= (Math.random() > 0.4 ? 1 : 0);
            } else {
              nextBpm += (Math.random() > 0.5 ? 1 : -1);
            }
          } else {
            // Slight natural drift during work
            const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            nextBpm = Math.max(105, Math.min(176, nextBpm + jitter));
          }

          setHrHistory(history => [...history.slice(-180), nextBpm]);
          return nextBpm;
        });
      }, 1000);
    } else if (activePlan === null) {
      setHeartRate(0);
      setHrHistory([]);
      setIsWatchConnected(false);
    }
    return () => clearInterval(hrInterval);
  }, [activePlan, isWatchConnected, restTimeLeft]);`,
  `  // Log history for graph
  useEffect(() => {
    let hrInterval: any;
    if (activePlan !== null && isWatchConnected) {
      hrInterval = setInterval(() => {
         // Push the live BLE HR to history every second for the chart
         setHrHistory(history => {
            const h = [...history.slice(-180)];
            if (heartRate > 0) h.push(heartRate);
            return h;
         });
      }, 1000);
    } else if (activePlan === null) {
      setHeartRate(0);
      setHrHistory([]);
      setIsWatchConnected(false);
    }
    return () => clearInterval(hrInterval);
  }, [activePlan, isWatchConnected, heartRate]);`
);

// Fix the toggle connection button
code = code.replace(
  `            onPress={() => {
              if (isWatchConnected) {
                setIsWatchConnected(false);
                setHeartRate(0);
                Vibration.vibrate(30);
              } else {
                setIsWatchConnected(true);
                setHeartRate(122);
                setHrHistory([122]);
                Vibration.vibrate(80);
              }
            }}`,
  `            onPress={() => {
              Vibration.vibrate(30);
              toggleConnection();
            }}`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
