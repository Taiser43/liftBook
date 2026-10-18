const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

// 1. Add interface entries
code = code.replace(
  `  setGlobalCardioSession: (active: boolean, duration: number, distance: number, speed: number) => void;`,
  `  setGlobalCardioSession: (active: boolean, duration: number, distance: number, speed: number) => void;
  globalCardioModalVisible: boolean;
  setGlobalCardioModalVisible: (visible: boolean) => void;
  globalCardioActivityType: any;
  globalCardioTestType: any;
  setGlobalCardioSessionInfo: (activityType: any, testType: any) => void;`
);

// 2. Add initial state + action
code = code.replace(
  `      setGlobalCardioSession: (active, duration, distance, speed) =>
        set({ globalCardioActive: active, globalCardioDuration: duration, globalCardioDistance: distance, globalCardioSpeed: speed }),`,
  `      setGlobalCardioSession: (active, duration, distance, speed) =>
        set({ globalCardioActive: active, globalCardioDuration: duration, globalCardioDistance: distance, globalCardioSpeed: speed }),
      globalCardioModalVisible: false,
      setGlobalCardioModalVisible: (visible) => set({ globalCardioModalVisible: visible }),
      globalCardioActivityType: null,
      globalCardioTestType: null,
      setGlobalCardioSessionInfo: (type, test) => set({ globalCardioActivityType: type, globalCardioTestType: test }),`
);

fs.writeFileSync('src/store/store.ts', code);
console.log('Done');
