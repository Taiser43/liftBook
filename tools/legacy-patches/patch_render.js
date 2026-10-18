const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// Clean up the bad closing tags first
content = content.replace("        </>\n      )}\n    </Animated.View>\n  );\n}", "    </Animated.View>\n  );\n}");

// Replace Animated.View opening to inject the ActivityIndicator and styling
const oldAnimatedOpen = `    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        { transform: [{ translateX: panX }] },
        styles.container,
        hasWorkout && isWatchConnected && (currentHeartRate || 0) > 0 && {
          borderColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || '#2C2C2E',
          shadowColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || 'transparent',
        },
        hasCardio && !hasWorkout && { borderColor: '#30D158' }
      ]}
    >
      {/* MUSIC SECTION */}`;

const newAnimatedOpen = `    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        { transform: [{ translateX: panX }] },
        styles.container,
        isExpandingToWorkout && styles.fullScreenWorkout,
        !isExpandingToWorkout && hasWorkout && isWatchConnected && (currentHeartRate || 0) > 0 && {
          borderColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || '#2C2C2E',
          shadowColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || 'transparent',
        },
        !isExpandingToWorkout && hasCardio && !hasWorkout && { borderColor: '#30D158' }
      ]}
    >
      {isExpandingToWorkout ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00D2FF" />
          <Text style={{ color: '#00D2FF', marginTop: 12, fontSize: 16, fontWeight: '700' }}>
            Lade Workout...
          </Text>
        </View>
      ) : (
        <>
          {/* MUSIC SECTION */}`;

content = content.replace(oldAnimatedOpen, newAnimatedOpen);

// Add the closing tag for the new fragment
const oldAnimatedClose = `        </TouchableOpacity>
      )}
    </Animated.View>
  );
}`;

const newAnimatedClose = `        </TouchableOpacity>
      )}
      </>
      )}
    </Animated.View>
  );
}`;

content = content.replace(oldAnimatedClose, newAnimatedClose);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
