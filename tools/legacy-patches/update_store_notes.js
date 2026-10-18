const fs = require('fs');
const p = 'src/store/store.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /export interface AppState \{/,
  `export interface AppNote {
  id: string;
  text: string;
  screenName: string;
  createdAt: string;
}

export interface AppState {
  globalNotes: AppNote[];
  addGlobalNote: (text: string, screenName: string) => void;
  deleteGlobalNote: (id: string) => void;`
);

c = c.replace(
  /export const useAppStore = create<AppState>\(\)\(/,
  `export const useAppStore = create<AppState>()(`
);

c = c.replace(
  /bodyweight: 0,/,
  `globalNotes: [],
      addGlobalNote: (text, screenName) => set((state) => ({
        globalNotes: [{ id: Date.now().toString(), text, screenName, createdAt: new Date().toISOString() }, ...state.globalNotes]
      })),
      deleteGlobalNote: (id) => set((state) => ({
        globalNotes: state.globalNotes.filter(n => n.id !== id)
      })),
      bodyweight: 0,`
);

fs.writeFileSync(p, c);
console.log('Added global notes to store');
