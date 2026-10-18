const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `{liveExercises.map((ex, exIdx) => {`;
const endTarget = `</ScrollView>\n\n          {/* Swap Exercise Modal */}`;

// Let's replace the scrollview content.
// Actually, I can just find the end of the map:
//                  </View>
//                );
//              })}

const oldMapEnd = `                  </View>
                );
              })}
              <View style={{ height: 80 }} />
            </ScrollView>`;

const newMapEnd = `                  </View>
                );
              })}
              
              {/* Add Exercise to Live Workout */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0, 210, 255, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: '#00D2FF', borderStyle: 'dashed', marginBottom: 20 }}
                onPress={() => setSwapExerciseIndex(-1)}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#00D2FF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#00D2FF', fontWeight: 'bold', fontSize: 16 }}>Add Exercise</Text>
              </TouchableOpacity>
              
              <View style={{ height: 80 }} />
            </ScrollView>`;

code = code.replace(oldMapEnd, newMapEnd);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Patched Add Exercise button");
