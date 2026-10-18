const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

code = code.replace(
  `  finishCurrentCardio: (() => void) | null;
  setFinishCurrentCardio: (fn: (() => void) | null) => void;`,
  `  finishCurrentCardio: (() => void) | null;
  setFinishCurrentCardio: (fn: (() => void) | null) => void;
  finishCurrentStrength: (() => void) | null;
  setFinishCurrentStrength: (fn: (() => void) | null) => void;`
);

code = code.replace(
  `      finishCurrentCardio: null,
      setFinishCurrentCardio: (fn) => set({ finishCurrentCardio: fn }),`,
  `      finishCurrentCardio: null,
      setFinishCurrentCardio: (fn) => set({ finishCurrentCardio: fn }),
      finishCurrentStrength: null,
      setFinishCurrentStrength: (fn) => set({ finishCurrentStrength: fn }),`
);

fs.writeFileSync('src/store/store.ts', code);
console.log('Done');
