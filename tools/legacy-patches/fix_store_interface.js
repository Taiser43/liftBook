const fs = require('fs');
const p = 'src/store/store.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /export interface AppState \{\n  adminStreakOverride: number \| null;\n  setAdminStreakOverride: \(val: number \| null\) => void;/,
  "interface AppState {\n  adminStreakOverride: number | null;\n  setAdminStreakOverride: (val: number | null) => void;"
);

// wait, it didn't match the original regex because `export` was missing in `store.ts`.
// So `c.replace` just DID NOTHING. The `adminStreakOverride` is NOT in the interface!

c = c.replace(
  /interface AppState \{/,
  "export interface AppState {\n  adminStreakOverride: number | null;\n  setAdminStreakOverride: (val: number | null) => void;"
);

// We should also ensure the `setAdminStreakOverride` uses explicit typing in the store implementation.
c = c.replace(
  /setAdminStreakOverride: \(val\) =>/,
  "setAdminStreakOverride: (val: number | null) =>"
);

fs.writeFileSync(p, c);
console.log('Fixed interface AppState');
