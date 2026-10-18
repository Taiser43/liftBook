const fs = require('fs');
const p = 'src/store/store.ts';
let c = fs.readFileSync(p, 'utf8');

// Update AppState
c = c.replace(
  /customExercises: \{ name: string; category: string \}\[\];/,
  `customExercises: { name: string; category: string; equipmentType?: string; brand?: string }[];
  equipmentTypes: string[];
  equipmentBrands: string[];
  addEquipmentType: (type: string) => void;
  addEquipmentBrand: (brand: string) => void;
  editCustomExercise: (oldName: string, exercise: { name: string; category: string; equipmentType?: string; brand?: string }) => void;`
);

// Update addCustomExercise type signature just in case
c = c.replace(
  /addCustomExercise: \(exercise: \{ name: string; category: string \}\) => void;/,
  `addCustomExercise: (exercise: { name: string; category: string; equipmentType?: string; brand?: string }) => void;`
);

// Add to state initialization
c = c.replace(
  /customExercises: \[\],/,
  `customExercises: [],
      equipmentTypes: ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'],
      equipmentBrands: ['Technogym', 'Hammer Strength', 'Gym80', 'Nautilus', 'Precor', 'Cybex', 'Eleiko', 'Prime', 'Keine'],
      addEquipmentType: (type) => set((state) => {
        if (!state.equipmentTypes.includes(type)) {
          return { equipmentTypes: [...state.equipmentTypes, type] };
        }
        return state;
      }),
      addEquipmentBrand: (brand) => set((state) => {
        if (!state.equipmentBrands.includes(brand)) {
          return { equipmentBrands: [...state.equipmentBrands, brand] };
        }
        return state;
      }),
      editCustomExercise: (oldName, exercise) => set((state) => {
        const filtered = (state.customExercises || []).filter(e => e.name !== oldName);
        return { customExercises: [...filtered, exercise] };
      }),`
);

fs.writeFileSync(p, c);
console.log('Patched store.ts with equipment types and brands');
