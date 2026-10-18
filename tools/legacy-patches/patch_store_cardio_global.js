const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

// 1. Add interface entries
code = code.replace(
  `  setGlobalActivePlan: (plan: WorkoutPlan | null) => void;`,
  `  setGlobalActivePlan: (plan: WorkoutPlan | null) => void;

  // Global Cardio Mini-Player state
  globalCardioActive: boolean;
  globalCardioDuration: number;
  globalCardioDistance: number; // metres
  globalCardioSpeed: number;    // km/h
  setGlobalCardioSession: (active: boolean, duration: number, distance: number, speed: number) => void;`
);

// 2. Add initial state + action
code = code.replace(
  `      setGlobalActivePlan: (plan) => set({ globalActivePlan: plan }),`,
  `      setGlobalActivePlan: (plan) => set({ globalActivePlan: plan }),

      globalCardioActive: false,
      globalCardioDuration: 0,
      globalCardioDistance: 0,
      globalCardioSpeed: 0,
      setGlobalCardioSession: (active, duration, distance, speed) =>
        set({ globalCardioActive: active, globalCardioDuration: duration, globalCardioDistance: distance, globalCardioSpeed: speed }),`
);

fs.writeFileSync('src/store/store.ts', code);
console.log('Done');
