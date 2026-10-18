const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// Fix the minimize button to also clear the global modal flag
code = code.replace(
  `              <TouchableOpacity
                style={{ paddingRight: 12 }}
                onPress={() => setLiveWorkoutModalVisible(false)}
              >
                <MaterialCommunityIcons name="chevron-down" size={28} color="#00D2FF" />
              </TouchableOpacity>`,
  `              <TouchableOpacity
                style={{ paddingRight: 12 }}
                onPress={() => {
                  setLiveWorkoutModalVisible(false);
                  setGlobalLiveWorkoutModalVisible(false); // allow mini-player to show
                }}
              >
                <MaterialCommunityIcons name="chevron-down" size={28} color="#00D2FF" />
              </TouchableOpacity>`
);

// Also fix onRequestClose (Android back button)
code = code.replace(
  `        onRequestClose={() => setLiveWorkoutModalVisible(false)}`,
  `        onRequestClose={() => {
          setLiveWorkoutModalVisible(false);
          setGlobalLiveWorkoutModalVisible(false);
        }}`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
