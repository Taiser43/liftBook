const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

code = code.replace(
  `  setGlobalCardioSessionInfo: (activityType: any, testType: any) => void;`,
  `  setGlobalCardioSessionInfo: (activityType: any, testType: any) => void;
  finishCurrentCardio: (() => void) | null;
  setFinishCurrentCardio: (fn: (() => void) | null) => void;`
);

code = code.replace(
  `      setGlobalCardioSessionInfo: (type, test) => set({ globalCardioActivityType: type, globalCardioTestType: test }),`,
  `      setGlobalCardioSessionInfo: (type, test) => set({ globalCardioActivityType: type, globalCardioTestType: test }),
      finishCurrentCardio: null,
      setFinishCurrentCardio: (fn) => set({ finishCurrentCardio: fn }),`
);

fs.writeFileSync('src/store/store.ts', code);
console.log('Done');
