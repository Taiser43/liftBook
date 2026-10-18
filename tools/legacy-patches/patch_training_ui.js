const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// Add states
const stateTarget = `  const [liveWorkoutModalVisible, setLiveWorkoutModalVisible] = useState(false);`;
const newState = `  const [liveWorkoutModalVisible, setLiveWorkoutModalVisible] = useState(false);
  const [freestyleNameModalVisible, setFreestyleNameModalVisible] = useState(false);
  const [freestyleName, setFreestyleName] = useState('Freestyle Workout');
  const spontaneousWorkouts = useAppStore(state => state.spontaneousWorkouts) || [];
`;
code = code.replace(stateTarget, newState);

// Add start freestyle handler
const handlerTarget = `  // START LIVE WORKOUT FULL-SCREEN`;
const newHandler = `  // START FREESTYLE WORKOUT
  const handleStartFreestyle = () => {
    const name = freestyleName.trim() || 'Freestyle Workout';
    const plan: WorkoutPlan = {
      id: 'spontaneous_' + Date.now(),
      name: name,
      daysOfWeek: [],
      exercises: []
    };
    handleStartLiveWorkout(plan);
    setFreestyleNameModalVisible(false);
    setFreestyleName('Freestyle Workout');
  };

  // START LIVE WORKOUT FULL-SCREEN`;
code = code.replace(handlerTarget, newHandler);

// Inject Freestyle Name Modal UI at the bottom of the root view
const modalTarget = `      {/* Celebration Modal */}`;
const newModal = `      {/* Freestyle Name Modal */}
      <Modal visible={freestyleNameModalVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1E1E1E', padding: 24, borderRadius: 16, width: '85%' }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Start Freestyle Workout</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 20 }}
              placeholder="e.g. Chest & Triceps Blast"
              placeholderTextColor="#888"
              value={freestyleName}
              onChangeText={setFreestyleName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setFreestyleNameModalVisible(false)} style={{ padding: 12 }}>
                <Text style={{ color: '#00D2FF', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStartFreestyle} style={{ backgroundColor: '#00D2FF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}>
                <Text style={{ color: '#000', fontSize: 16, fontWeight: 'bold' }}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Celebration Modal */}`;
code = code.replace(modalTarget, newModal);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Patched UI hooks and Modal");
