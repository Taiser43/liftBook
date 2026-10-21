// [AGENT CONTEXT]: These imports MUST remain at the very top of the file before any other code.
// Moving them down will cause react-native-reanimated and gesture-handler to crash on startup.
import 'react-native-gesture-handler';
import './src/services/cardioBackgroundTask'; // register background GPS task
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

import App from './App';

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/PlaybackService';

// Register the background playback service for the music player (lock screen controls)
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Register the Android Home-Screen Widget task handler
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
