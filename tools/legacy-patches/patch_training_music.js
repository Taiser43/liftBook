const fs = require('fs');
let content = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// 1. Add Import for InWorkoutMusicWidget
if (!content.includes('InWorkoutMusicWidget')) {
  content = content.replace(
    "import WorkoutMiniPlayer from '../components/WorkoutMiniPlayer';",
    "import WorkoutMiniPlayer from '../components/WorkoutMiniPlayer';\nimport InWorkoutMusicWidget from '../components/InWorkoutMusicWidget';"
  );
}

// 2. Add local state inside TrainingScreen
content = content.replace(
  "const [liveWorkoutModalVisible, setLiveWorkoutModalVisible] = useState(false);",
  "const [liveWorkoutModalVisible, setLiveWorkoutModalVisible] = useState(false);\n  const [inWorkoutMusicVisible, setInWorkoutMusicVisible] = useState(false);"
);

// 3. Add Music Button to the Header (Next to Finish button)
const oldHeaderButtons = `{powerSong && (
              <TouchableOpacity 
                style={[styles.finishWorkoutButton, { backgroundColor: 'rgba(255, 214, 10, 0.2)', marginRight: 10, paddingHorizontal: 10 }]}
                onPress={handleTriggerPowerSong}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.finishWorkoutButton}
              onPress={() => handleFinishLiveWorkout()}
            >`;

const newHeaderButtons = `{powerSong && (
              <TouchableOpacity 
                style={[styles.finishWorkoutButton, { backgroundColor: 'rgba(255, 214, 10, 0.2)', marginRight: 10, paddingHorizontal: 10 }]}
                onPress={handleTriggerPowerSong}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.finishWorkoutButton, { backgroundColor: inWorkoutMusicVisible ? '#FFD700' : '#333', marginRight: 10, paddingHorizontal: 10 }]}
              onPress={() => setInWorkoutMusicVisible(!inWorkoutMusicVisible)}
            >
              <MaterialCommunityIcons name="music-note" size={20} color={inWorkoutMusicVisible ? '#000' : '#FFD700'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.finishWorkoutButton}
              onPress={() => handleFinishLiveWorkout()}
            >`;

content = content.replace(oldHeaderButtons, newHeaderButtons);

// 4. Render the Widget inside the Modal
const oldListStart = `{/* Exercise Sets Tracking View */}
          <KeyboardAwareFlatList`;

const newListStart = `{/* In-Workout Music Widget */}
          {inWorkoutMusicVisible && (
             <InWorkoutMusicWidget />
          )}

          {/* Exercise Sets Tracking View */}
          <KeyboardAwareFlatList`;

content = content.replace(oldListStart, newListStart);

fs.writeFileSync('src/screens/TrainingScreen.tsx', content);
