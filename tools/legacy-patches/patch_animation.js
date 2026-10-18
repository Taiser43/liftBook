const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// 1. Add panX animated value
content = content.replace(
  "const panResponder = React.useRef(",
  "const panX = React.useRef(new Animated.Value(0)).current;\n\n  const panResponder = React.useRef("
);

// 2. Update panResponder logic
const oldPan = `    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
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
    })`;

const newPan = `    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        panX.setValue(gestureState.dx * 0.4);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (useMusicStore.getState().currentSongId || useMusicStore.getState().currentQueueSong) {
          if (gestureState.dx > 50) {
            useMusicStore.getState().playPrevious();
          } else if (gestureState.dx < -50) {
            useMusicStore.getState().playNext();
          }
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
      }
    })`;

content = content.replace(oldPan, newPan);

// 3. Change View to Animated.View and apply transform
content = content.replace(
  "    <View \n      {...panResponder.panHandlers}\n      style={[",
  "    <Animated.View \n      {...panResponder.panHandlers}\n      style={[\n        { transform: [{ translateX: panX }] },"
);

// We need to also change the closing </View> to </Animated.View>
// Wait, the main container is closed at the very end of the file.
// Let's use regex or just replace the last </View>
// The best way to replace the outer View is to do a manual replace for the closing tag.
// We can just find the end of the file.
content = content.replace(/<\/View>\n  \);\n};\n\nconst styles/g, "</Animated.View>\n  );\n};\n\nconst styles");


fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
