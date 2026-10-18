const fs = require('fs');
let content = fs.readFileSync('src/components/InWorkoutMusicWidget.tsx', 'utf8');

const oldResponder = `    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderMove: Animated.event([null, { dx: panX }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          playPrevious();
        } else if (gestureState.dx < -50) {
          playNext();
        }
        Animated.spring(panX, { toValue: 0, useNativeDriver: false }).start();
      },
    })`;

const newResponder = `    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (evt, gestureState) => {
        panX.setValue(gestureState.dx * 0.4);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          playPrevious();
        } else if (gestureState.dx < -50) {
          playNext();
        }
        Animated.spring(panX, { 
          toValue: 0, 
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
      },
    })`;

content = content.replace(oldResponder, newResponder);

fs.writeFileSync('src/components/InWorkoutMusicWidget.tsx', content);
