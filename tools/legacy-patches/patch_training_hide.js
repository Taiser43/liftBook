const fs = require('fs');
let content = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `{/* In-Workout Music Widget */}
          {inWorkoutMusicVisible && (
             <InWorkoutMusicWidget />
          )}`;

const replacement = `{/* In-Workout Music Widget */}
          <View style={{ display: inWorkoutMusicVisible ? 'flex' : 'none' }}>
             <InWorkoutMusicWidget />
          </View>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/screens/TrainingScreen.tsx', content);
