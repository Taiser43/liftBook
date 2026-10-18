const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const swapLogicRegex = /if \(swapExerciseIndex !== null\) \{[\s\S]*?setSwapExerciseIndex\(null\);\s*\}/;

const newSwapLogic = `if (swapExerciseIndex !== null) {
                        const newId = \`\${Date.now()}_\${Math.random().toString(36).substr(2, 5)}\`;
                        if (swapExerciseIndex === -1) {
                          // Add brand new exercise to Live Workout
                          const newEx: Exercise = {
                            id: newId,
                            name: ex.name,
                            sets: 3,
                            reps: 10,
                            weight: 0,
                            category: ex.category
                          };
                          setLiveExercises(prev => [...prev, newEx]);
                          setSetLogs(prev => {
                            const newLogs = { ...prev };
                            for (let i = 0; i < 3; i++) {
                              newLogs[\`\${newId}_\${i}\`] = { weight: "0", reps: "10", checked: false };
                            }
                            return newLogs;
                          });
                        } else {
                          // Swap existing exercise
                          const oldEx = liveExercises[swapExerciseIndex];
                          const newEx: Exercise = {
                            id: newId,
                            name: ex.name,
                            sets: oldEx.sets,
                            reps: oldEx.reps,
                            weight: oldEx.weight,
                            category: ex.category
                          };
                          
                          setLiveExercises(prev => {
                            const copy = [...prev];
                            copy[swapExerciseIndex] = newEx;
                            return copy;
                          });

                          // Copy logs over so they don't get lost or reset
                          setSetLogs(prev => {
                            const newLogs = { ...prev };
                            const setCount = newEx.sets || 3;
                            for (let i = 0; i < setCount; i++) {
                              const oldKey = \`\${oldEx.id}_\${i}\`;
                              const newKey = \`\${newEx.id}_\${i}\`;
                              if (newLogs[oldKey]) {
                                newLogs[newKey] = newLogs[oldKey];
                              } else {
                                newLogs[newKey] = { weight: (newEx.weight || 0).toString(), reps: (newEx.reps || 10).toString(), checked: false };
                              }
                            }
                            return newLogs;
                          });
                        }
                        setSwapExerciseIndex(null);
                      }`;

code = code.replace(swapLogicRegex, newSwapLogic);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Patched swapExerciseIndex logic");
