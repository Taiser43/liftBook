const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `<ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {workoutPrograms.length === 0 && (`;

const newCode = `<ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            
            {/* Spontaneous Workout Section */}
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(0, 210, 255, 0.1)', borderWidth: 1, borderColor: '#00D2FF', borderRadius: 16, padding: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.8}
              onPress={() => setFreestyleNameModalVisible(true)}
            >
              <View style={{ backgroundColor: '#00D2FF', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Freestyle Workout</Text>
                <Text style={{ color: '#00D2FF', fontSize: 13, marginTop: 4 }}>Start an empty workout & add exercises on the fly</Text>
              </View>
            </TouchableOpacity>

            {spontaneousWorkouts && spontaneousWorkouts.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Saved Freestyle Workouts</Text>
                {spontaneousWorkouts.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planCard, { backgroundColor: '#1E1E1E', borderColor: '#333' }]}
                    onPress={() => handleStartLiveWorkout(plan)}
                  >
                    <View style={styles.planCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planCardTitle}>{plan.name}</Text>
                        <Text style={styles.planCardSub}>{plan.exercises.length} Exercises</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: '#333', marginLeft: 8 }]}
                        onPress={() => {
                          useAppStore.getState().deleteSpontaneousWorkout(plan.id);
                        }}
                      >
                        <MaterialCommunityIcons name="trash-can" size={20} color="#FF453A" />
                      </TouchableOpacity>
                      <View style={[styles.playButton, { backgroundColor: '#00D2FF', marginLeft: 8 }]}>
                        <MaterialCommunityIcons name="play" size={20} color="#000" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Training Programs</Text>

            {workoutPrograms.length === 0 && (`;

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Patched root view with Freestyle section");
