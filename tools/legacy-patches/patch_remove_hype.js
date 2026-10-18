const fs = require('fs');
let content = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `{powerSong && (
              <TouchableOpacity 
                style={[styles.finishWorkoutButton, { backgroundColor: 'rgba(255, 214, 10, 0.2)', marginRight: 10, paddingHorizontal: 10 }]}
                onPress={handleTriggerPowerSong}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
              </TouchableOpacity>
            )}`;

content = content.replace(target, "");

fs.writeFileSync('src/screens/TrainingScreen.tsx', content);
