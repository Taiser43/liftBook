const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// 1. Add ActivityIndicator
content = content.replace(
  "import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder, UIManager, LayoutAnimation } from 'react-native';",
  "import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder, UIManager, LayoutAnimation, ActivityIndicator } from 'react-native';"
);

// 2. Add isExpandingToWorkout state
content = content.replace(
  "const [isMusicExpanded, setIsMusicExpanded] = useState(false);",
  "const [isMusicExpanded, setIsMusicExpanded] = useState(false);\n  const [isExpandingToWorkout, setIsExpandingToWorkout] = useState(false);"
);

// 3. Update container style
content = content.replace(
  "style={[styles.container, { transform: [{ translateY: bounceAnim }] }]}",
  "style={[styles.container, isExpandingToWorkout && styles.fullScreenWorkout, { transform: [{ translateY: bounceAnim }] }]}"
);

// 4. Update the content to show ActivityIndicator if expanding
const oldPanResponderOpen = `{/* Container for swipe */}`;
const newContentOpen = `
      {isExpandingToWorkout ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00D2FF" />
          <Text style={{ color: '#00D2FF', marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
            Lade Workout...
          </Text>
        </View>
      ) : (
        <>
`;
content = content.replace("{/* Container for swipe */}", newContentOpen + "{/* Container for swipe */}");

// We need to close the fragment before the final </Animated.View>
const closingTags = `        </>
      )}
    </Animated.View>
  );
}`;
content = content.replace("    </Animated.View>\n  );\n}", closingTags);

// 5. Add fullScreenWorkout style
content = content.replace(
  "  container: {",
  `  fullScreenWorkout: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
    borderWidth: 0,
    zIndex: 99999,
  },
  container: {`
);

// 6. Update onPress for Workout Section
const oldWorkoutPress = `          onPress={() => {
            setGlobalLiveWorkoutModalVisible(true);
          }}`;

const newWorkoutPress = `          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsExpandingToWorkout(true);
            setTimeout(() => {
              setGlobalLiveWorkoutModalVisible(true);
              // Reset shortly after modal opens so the bar returns to normal in the background
              setTimeout(() => setIsExpandingToWorkout(false), 500);
            }, 400);
          }}`;
content = content.replace(oldWorkoutPress, newWorkoutPress);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
