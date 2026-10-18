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

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
