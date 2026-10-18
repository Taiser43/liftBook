const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// Import AppState
if (!code.includes('AppState,')) {
  code = code.replace(
    `import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Vibration, Alert, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';`,
    `import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Vibration, Alert, TextInput, KeyboardAvoidingView, Platform, Modal, AppState } from 'react-native';`
  );
}

// Add AppState listener to rest timer useEffect
code = code.replace(
  `    if (restEndTime !== null) {
      // Schedule background notification for the exact end time
      scheduleRestNotification(restEndTime);

      timer = setInterval(() => {
        const now = Date.now();
        const left = Math.ceil((restEndTime - now) / 1000);
        if (left <= 0) {
          Vibration.vibrate([0, 500, 200, 500]);
          Alert.alert("🔔 Rest Over!", "Time for your next set! 🏋️‍♂️");
          setRestTimeLeft(null);
          setRestEndTime(null);
        } else {
          setRestTimeLeft(left);
        }
      }, 1000);
    } else {
      cancelRestNotification();
    }
    return () => clearInterval(timer);
  }, [restEndTime]);`,
  `    if (restEndTime !== null) {
      // Schedule background notification for the exact end time
      scheduleRestNotification(restEndTime);

      const checkRest = () => {
        const now = Date.now();
        const left = Math.ceil((restEndTime - now) / 1000);
        if (left <= 0) {
          Vibration.vibrate([0, 500, 200, 500]);
          Alert.alert("🔔 Rest Over!", "Time for your next set! 🏋️‍♂️");
          setRestTimeLeft(null);
          setRestEndTime(null);
        } else {
          setRestTimeLeft(left);
        }
      };

      timer = setInterval(checkRest, 1000);
      
      const appStateSub = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          checkRest();
        }
      });
      
      return () => {
        clearInterval(timer);
        appStateSub.remove();
      };
    } else {
      cancelRestNotification();
    }
    return () => clearInterval(timer);
  }, [restEndTime]);`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
