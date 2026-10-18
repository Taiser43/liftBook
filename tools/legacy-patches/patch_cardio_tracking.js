const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

// 1. Add Modal import
code = code.replace(
  `import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';`,
  `import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Modal } from 'react-native';`
);

// 2. Remove route params, get from store
code = code.replace(
  `export default function CardioTrackingScreen({ route, navigation }: Props) {
  const activityType: CardioActivityType = route?.params?.activityType ?? 'Running';
  const testType = route?.params?.testType;`,
  `export default function CardioTrackingScreen({ navigation }: Props) {
  const activityType = useAppStore(state => state.globalCardioActivityType) ?? 'Running';
  const testType = useAppStore(state => state.globalCardioTestType);
  const modalVisible = useAppStore(state => state.globalCardioModalVisible);
  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);`
);

// 3. Fix navigate goBack
code = code.replace(
  `<TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>`,
  `<TouchableOpacity onPress={() => setGlobalCardioModalVisible(false)} style={{ padding: 8 }}>`
);

// 4. Fix finish
code = code.replace(
  `    setGlobalCardioSession(false, 0, 0, 0); // clear mini-player
    navigation.replace('CardioHistory');
  };`,
  `    setGlobalCardioSession(false, 0, 0, 0); // clear mini-player
    setGlobalCardioModalVisible(false);
    if (navigation && navigation.navigate) {
      navigation.navigate('MainTabs', { screen: 'Cardio' } as any);
      setTimeout(() => navigation.navigate('CardioHistory'), 100);
    }
  };`
);

// 5. Wrap in Modal
code = code.replace(
  `  return (
    <SafeAreaView style={styles.safeArea}>`,
  `  return (
    <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGlobalCardioModalVisible(false)}>
      <SafeAreaView style={styles.safeArea}>`
);
code = code.replace(
  `    </SafeAreaView>
  );
}

const styles =`,
  `      </SafeAreaView>
    </Modal>
  );
}

const styles =`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
