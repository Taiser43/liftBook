const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const target = `      finishLiveWorkout: () => set((state) => {
        if (!state.liveWorkout) return state;`;

const replacement = `      finishLiveWorkout: () => set((state) => {
        if (!state.liveWorkout) return state;
        
        // Add XP and Confetti
        const currentXP = state.totalXP || 0;
        const newXP = currentXP + 500;
        
        return {
          workoutHistory: [...state.workoutHistory, state.liveWorkout],
          liveWorkout: null,
          totalXP: newXP,
          triggerStreakConfetti: true // Using streak confetti for workout finish!
        };
      }),

      // OLD START -> Replace inner return
      old_finishLiveWorkout: () => set((state) => {
        if (!state.liveWorkout) return state;`;

code = code.replace(target, replacement);

const returnTarget = `        return {
          workoutHistory: [...state.workoutHistory, state.liveWorkout],
          liveWorkout: null,
        };
      }),`;
const returnReplacement = `        // Replaced by Gamification override
      }),`;
code = code.replace(returnTarget, returnReplacement);

fs.writeFileSync('src/store/store.ts', code);
