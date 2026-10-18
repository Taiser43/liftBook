const fs = require('fs');

let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// 1. Add PanResponder to imports
content = content.replace(
  "import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing } from 'react-native';",
  "import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder } from 'react-native';"
);

// 2. Add panResponder logic inside the component before return
const panResponderHook = `
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          useMusicStore.getState().playPrevious();
        } else if (gestureState.dx < -50) {
          useMusicStore.getState().playNext();
        }
      },
    })
  ).current;

  if (!isActive) return null;
`;

content = content.replace("  if (!isActive) return null;", panResponderHook);

// 3. Attach panHandlers to the main View
content = content.replace(
  "    <View \n      style={[",
  "    <View \n      {...panResponder.panHandlers}\n      style={["
);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
