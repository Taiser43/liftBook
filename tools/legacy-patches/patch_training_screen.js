const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Add "Add Exercise" button to Live Workout view
c = c.replace(
  /(\{\/\* Swap Exercise Modal \*\/)/,
  `<TouchableOpacity 
              style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
              onPress={() => setSwapExerciseIndex(-1)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
              <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Add Exercise to Workout</Text>
            </TouchableOpacity>

            $1`
);

// 2. Add Freestyle Name Modal at the bottom, just before the final `</View>`
c = c.replace(
  /(\n\s*\{triggerMacroConfetti &&)/,
  `
      {/* Freestyle Name Modal */}
      <Modal
        visible={freestyleNameModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFreestyleNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.centeredModalContent}>
            <Text style={styles.modalTitle}>Freestyle Workout</Text>
            <Text style={styles.modalSubtitle}>Name your spontaneous workout</Text>
            <TextInput 
              style={styles.modalInput}
              placeholder="e.g. Late Night Pump"
              placeholderTextColor="#666666"
              value={freestyleName}
              onChangeText={setFreestyleName}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setFreestyleNameModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleStartFreestyle}>
                <Text style={styles.modalConfirmBtnText}>Start Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
$1`
);

fs.writeFileSync(p, c);
console.log('Patched TrainingScreen.tsx');
