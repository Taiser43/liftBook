const fs = require('fs');
let content = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

content = content.replace(
  `      <Modal
        visible={liveWorkoutModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"`,
  `      <Modal
        visible={liveWorkoutModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        hardwareAccelerated={true}`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', content);
