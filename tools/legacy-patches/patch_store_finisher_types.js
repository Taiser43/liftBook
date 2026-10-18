const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

code = code.replace(
  `  finishCurrentCardio: (() => void) | null;
  setFinishCurrentCardio: (fn: (() => void) | null) => void;
  finishCurrentStrength: (() => void) | null;
  setFinishCurrentStrength: (fn: (() => void) | null) => void;`,
  `  finishCurrentCardio: ((skipNav?: boolean) => void) | null;
  setFinishCurrentCardio: (fn: ((skipNav?: boolean) => void) | null) => void;
  finishCurrentStrength: ((skipNav?: boolean) => void) | null;
  setFinishCurrentStrength: (fn: ((skipNav?: boolean) => void) | null) => void;`
);

fs.writeFileSync('src/store/store.ts', code);
console.log('Done');
