const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/store/store.ts');
let content = fs.readFileSync(p, 'utf8');

if (!content.includes('xpEvent:')) {
  // Add xpEvent to state interface
  content = content.replace(
    /interface AppState \{/,
    "interface AppState {\n  xpEvent: { id: number, sourceX: number, sourceY: number, amount: number, type: string } | null;\n  triggerXPEvent: (sourceX: number, sourceY: number, amount: number, type?: string) => void;"
  );

  // Add default state
  content = content.replace(
    /const initialState = \{/,
    "const initialState = {\n  xpEvent: null,"
  );

  // Add action
  content = content.replace(
    /return \{/,
    "return {\n    triggerXPEvent: (sourceX, sourceY, amount, type = 'XP') => set({ xpEvent: { id: Date.now(), sourceX, sourceY, amount, type } }),"
  );
  
  fs.writeFileSync(p, content);
  console.log('Patched store.ts with XP event');
}
