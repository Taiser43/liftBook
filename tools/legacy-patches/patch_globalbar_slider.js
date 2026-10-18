const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// 1. Add UIManager, LayoutAnimation
content = content.replace(
  "import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder } from 'react-native';",
  "import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder, UIManager, LayoutAnimation } from 'react-native';"
);

// 2. Add Slider and useProgress
content = content.replace(
  "import TrackPlayer, { State, usePlaybackState } from 'react-native-track-player';",
  "import TrackPlayer, { State, usePlaybackState, useProgress } from 'react-native-track-player';\nimport Slider from '@react-native-community/slider';"
);

// 3. Android experimental setup
const formatTimeAndSetup = `
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
};
`;
if (!content.includes('UIManager.setLayoutAnimationEnabledExperimental')) {
  content = content.replace("const { width } = Dimensions.get('window');", formatTimeAndSetup + "\nconst { width } = Dimensions.get('window');");
}

// 4. Add state inside component
content = content.replace(
  "const [textWidth, setTextWidth] = useState(0);",
  "const [textWidth, setTextWidth] = useState(0);\n  const [isMusicExpanded, setIsMusicExpanded] = useState(false);\n  const progress = useProgress();"
);

// 5. Modify musicSection UI
const oldMusicSection = `{/* MUSIC SECTION */}
      {hasMusic && (
        <TouchableOpacity 
          style={[styles.musicSection, (hasWorkout || hasCardio) && styles.musicSectionBorder]}
          activeOpacity={0.9}
          onPress={() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('MainTabs', { screen: 'Home' });
            }
          }}
        >
          <View style={styles.musicLeft}>
            <View style={styles.musicIconBg}>
              <MaterialCommunityIcons name="music-note" size={20} color="#FFD700" />
            </View>
            <View style={{ marginLeft: 12, width: width * 0.4, overflow: 'hidden' }}>
              <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollAnim }] }}>
                <Text 
                  style={styles.musicTitle} 
                  numberOfLines={1}
                  onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                >
                  {currentSong.title}
                </Text>
              </Animated.View>
              <Text style={styles.musicArtist} numberOfLines={1}>{currentSong.artist || 'Unknown Artist'}</Text>
            </View>
          </View>

          <View style={styles.musicControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause}>
              <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={skipNext}>
              <MaterialCommunityIcons name="skip-next" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}`;

const newMusicSection = `{/* MUSIC SECTION */}
      {hasMusic && (
        <TouchableOpacity 
          style={[styles.musicSection, (hasWorkout || hasCardio) && styles.musicSectionBorder]}
          activeOpacity={0.9}
          onPress={() => {
             LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
             setIsMusicExpanded(!isMusicExpanded);
          }}
        >
          <View style={styles.musicRow}>
            <View style={styles.musicLeft}>
              <View style={styles.musicIconBg}>
                <MaterialCommunityIcons name="music-note" size={20} color="#FFD700" />
              </View>
              <View style={{ marginLeft: 12, width: width * 0.4, overflow: 'hidden' }}>
                <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollAnim }] }}>
                  <Text 
                    style={styles.musicTitle} 
                    numberOfLines={1}
                    onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                  >
                    {currentSong.title}
                  </Text>
                </Animated.View>
                <Text style={styles.musicArtist} numberOfLines={1}>{currentSong.artist || 'Unknown Artist'}</Text>
              </View>
            </View>

            <View style={styles.musicControls}>
              <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause}>
                <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={26} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} onPress={skipNext}>
                <MaterialCommunityIcons name="skip-next" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {isMusicExpanded && (
            <View style={styles.expandedSliderArea}>
              <Slider
                style={{ width: '100%', height: 30, marginTop: 8 }}
                minimumValue={0}
                maximumValue={progress.duration || 1}
                value={progress.position}
                minimumTrackTintColor="#FFD700"
                maximumTrackTintColor="#555"
                thumbTintColor="#FFD700"
                onSlidingComplete={async (val) => {
                  await TrackPlayer.seekTo(val);
                }}
              />
              <View style={styles.expandedTimeRow}>
                <Text style={styles.expandedTimeText}>{formatTime(progress.position)}</Text>
                <Text style={styles.expandedTimeText}>{formatTime(progress.duration)}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}`;

content = content.replace(oldMusicSection, newMusicSection);

// 6. Fix Styles
content = content.replace(
  `  musicSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },`,
  `  musicSection: {
    padding: 12,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedSliderArea: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  expandedTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: -4,
  },
  expandedTimeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },`
);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
