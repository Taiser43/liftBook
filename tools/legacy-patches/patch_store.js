const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

// Add spontaneousWorkouts to the AppState interface
const interfaceTarget = `  workoutPrograms: WorkoutProgram[];`;
const newInterface = `  workoutPrograms: WorkoutProgram[];
  
  // Spontaneous Workouts
  spontaneousWorkouts: WorkoutPlan[];
  addSpontaneousWorkout: (plan: WorkoutPlan) => void;
  renameSpontaneousWorkout: (id: string, name: string) => void;
  deleteSpontaneousWorkout: (id: string) => void;
`;
code = code.replace(interfaceTarget, newInterface);

// Add spontaneousWorkouts to the store implementation
const implTarget = `      workoutPrograms: [],`;
const newImpl = `      workoutPrograms: [],
      
      spontaneousWorkouts: [],
      addSpontaneousWorkout: (plan) => set((state) => ({
        spontaneousWorkouts: [plan, ...(state.spontaneousWorkouts || [])]
      })),
      renameSpontaneousWorkout: (id, name) => set((state) => ({
        spontaneousWorkouts: (state.spontaneousWorkouts || []).map(p => p.id === id ? { ...p, name } : p)
      })),
      deleteSpontaneousWorkout: (id) => set((state) => ({
        spontaneousWorkouts: (state.spontaneousWorkouts || []).filter(p => p.id !== id)
      })),
`;
code = code.replace(implTarget, newImpl);

fs.writeFileSync('src/store/store.ts', code);
console.log("Patched store.ts");
