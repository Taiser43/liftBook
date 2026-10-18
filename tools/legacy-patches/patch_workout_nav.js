const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

const oldPress = `          onPress={() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('MainTabs', { screen: 'Training' });
            }
            setGlobalLiveWorkoutModalVisible(true);
          }}`;

const newPress = `          onPress={() => {
            setGlobalLiveWorkoutModalVisible(true);
          }}`;

content = content.replace(oldPress, newPress);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
