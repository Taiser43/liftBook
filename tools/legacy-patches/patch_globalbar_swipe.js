const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// Use Capture phase to ensure swipes over touchables are registered
content = content.replace(
  "onStartShouldSetPanResponder: () => false,",
  "onStartShouldSetPanResponder: () => false,\n      onStartShouldSetPanResponderCapture: () => false,\n      onMoveShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),"
);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
