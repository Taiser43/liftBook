import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AppNavigator from './src/navigation/AppNavigator';
import { GlobalXPOverlay } from './src/components/GlobalXPOverlay';
import { resumePendingDownloadsIfNeeded } from './src/services/youtubeDownloadService';
import { useMusicStore } from './src/store/useMusicStore';

export default function App() {
  useEffect(() => {
    // Resume any pending or interrupted background/standby playlist downloads
    resumePendingDownloadsIfNeeded();

    // Retroactively ensure all saved playlists, albums and songs have covers assigned and cached
    useMusicStore.getState().retroactiveFillMissingCovers();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        resumePendingDownloadsIfNeeded();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppNavigator />
          <GlobalXPOverlay />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
