const fs = require('fs');
const p = 'src/store/store.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /export interface AppState \{/,
  "export interface AppState {\n  adminStreakOverride: number | null;\n  setAdminStreakOverride: (val: number | null) => void;"
);

c = c.replace(
  /addWorkoutProgram: \(program\) =>/,
  "adminStreakOverride: null,\n      setAdminStreakOverride: (val) => set({ adminStreakOverride: val }),\n      addWorkoutProgram: (program) =>"
);

fs.writeFileSync(p, c);
console.log('Added adminStreakOverride to store');
