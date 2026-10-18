const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `  // Galaxy Watch 5 Smartwatch Heart Rate State
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [watchModalVisible, setWatchModalVisible] = useState(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;`,
  `  // Galaxy Watch 5 Smartwatch Heart Rate State
  const { currentHR: heartRate, isWatchConnected, toggleConnection, setCurrentHR: setHeartRate, setIsWatchConnected } = useHeartRateMonitor();
  const [watchModalVisible, setWatchModalVisible] = useState(false);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
