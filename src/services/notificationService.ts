import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { Supplement, showCustomAlert } from '../store/store';

// Set global notification presentation behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('Failed to set notification handler:', e);
}

/**
 * Configure Android notification channel for supplements
 */
export async function setupNotificationChannels(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('supplements', {
        name: 'Supplement Reminders',
        description: 'Daily alerts to take your scheduled supplements and vitamins',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D2FF',
        sound: 'default',
      });
    }
  } catch (e) {
    console.warn('Failed to set up notification channel:', e);
  }
}

/**
 * Request permission for notifications if not already granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus === 'granted') {
      await setupNotificationChannels();
      return true;
    }

    // If we get here, it's denied
    showCustomAlert(
      "Notifications Disabled",
      "Please enable notifications in your phone settings to receive workout and supplement reminders.",
      [{ text: "OK" }]
    );
    return false;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Schedules a daily recurring notification for a supplement at its specified time (HH:MM)
 */
export async function scheduleSupplementNotification(supplement: Supplement): Promise<string | undefined> {
  try {
    // If notifications are explicitly disabled for this supplement, cancel if existing
    if (supplement.notificationEnabled === false) {
      if (supplement.notificationId) {
        await cancelSupplementNotification(supplement.notificationId);
      }
      return undefined;
    }

    // Ensure permissions
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Cannot schedule supplement notification without permissions');
      return undefined;
    }

    // Cancel previous scheduled notification if any
    if (supplement.notificationId) {
      await cancelSupplementNotification(supplement.notificationId);
    }

    // Parse time
    const parts = supplement.time.split(':');
    if (parts.length < 2) return undefined;
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (isNaN(hour) || isNaN(minute)) return undefined;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 Time for ${supplement.name}!`,
        body: `Dosage: ${supplement.dosage}${supplement.notes ? ` • ${supplement.notes}` : ''}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { supplementId: supplement.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log(`Scheduled daily notification for ${supplement.name} at ${supplement.time}, id: ${id}`);
    return id;
  } catch (err) {
    console.warn('Failed to schedule supplement notification:', err);
    return undefined;
  }
}

/**
 * Cancels a scheduled notification by identifier
 */
export async function cancelSupplementNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Failed to cancel supplement notification:', err);
  }
}

/**
 * Fires an instant test notification so the user can verify notifications immediately
 */
export async function sendTestSupplementNotification(supplement: Supplement): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 Test Reminder: ${supplement.name}`,
        body: `Dosage: ${supplement.dosage} (Scheduled daily at ${supplement.time})`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { supplementId: supplement.id },
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn('Failed to send test notification:', err);
    return false;
  }
}

let activeWorkoutNotificationId: string | undefined = undefined;

/**
 * Fires a persistent-like notification when a live workout is running
 */
export async function showActiveWorkoutNotification(planName: string): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('workouts', {
          name: 'Live Workout',
          description: 'Active workout sessions',
          importance: Notifications.AndroidImportance.LOW,
          sound: null,
          enableVibrate: false,
        });
      } catch (e) {
        // Known issue in some Expo Go environments, ignore and fall back to default channel
      }
    }

    activeWorkoutNotificationId = 'live_workout_session';

    await Notifications.scheduleNotificationAsync({
      identifier: activeWorkoutNotificationId,
      content: {
        title: `🏋️‍♂️ Active Workout: ${planName}`,
        body: `Tap here to return to your live session.`,
        sound: false,
        sticky: true, // Ongoing notification for Android
        autoDismiss: false, // Don't disappear when tapped (Android)
        priority: Notifications.AndroidNotificationPriority.LOW, // Use LOW to avoid popping up on screen and making noise
        data: { action: 'open_workout' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Failed to show active workout notification:', err);
  }
}

/**
 * Cancels the active workout notification
 */
export async function hideActiveWorkoutNotification(): Promise<void> {
  try {
    // Always try to cancel the hardcoded ID regardless of memory state
    await Notifications.cancelScheduledNotificationAsync('live_workout_session');
    activeWorkoutNotificationId = undefined;
    // Also try to dismiss all to be absolutely sure if it got stuck as a presented notification
    await Notifications.dismissNotificationAsync('live_workout_session');
  } catch (err) {
    console.warn('Failed to cancel active workout notification:', err);
  }
}

let restNotificationId: string | undefined = undefined;

export async function scheduleRestNotification(endTimeMs: number): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('rest_timers', {
          name: 'Rest Timers',
          description: 'Notifies you when your rest period is over',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
          vibrationPattern: [0, 500, 200, 500],
        });
      } catch (e) {}
    }

    if (restNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(restNotificationId);
    }

    const triggerDate = new Date(endTimeMs);
    // Don't schedule if it's already in the past
    if (triggerDate.getTime() <= Date.now()) return;

    restNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 Rest Over!`,
        body: `Time for your next set! 🏋️‍♂️`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { action: 'open_workout' },
      },
      identifier: 'rest_timer_notif',
      trigger: {
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: 'rest_timers',
      },
    });
  } catch (err) {
    console.warn('Failed to schedule rest notification:', err);
  }
}

export async function cancelRestNotification(): Promise<void> {
  if (restNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(restNotificationId);
      restNotificationId = undefined;
    } catch (err) {
      console.warn('Failed to cancel rest notification:', err);
    }
  }
}

let activeDownloadNotificationId: string | undefined = undefined;

/**
 * Shows or updates an ongoing background download notification on the lock screen / status bar
 */
export async function showDownloadProgressNotification(
  playlistName: string,
  completed: number,
  total: number,
  currentSongTitle: string,
  progressPercent: number
): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('yt_downloads', {
          name: 'Music Downloads',
          description: 'YouTube playlist download progress',
          importance: Notifications.AndroidImportance.LOW,
          sound: null,
          enableVibrate: false,
        });
      } catch (e) {}
    }

    activeDownloadNotificationId = 'yt_download_progress';

    await Notifications.scheduleNotificationAsync({
      identifier: activeDownloadNotificationId,
      content: {
        title: `⬇️ Lade Playlist: ${playlistName} (${progressPercent}%)`,
        body: `Song ${Math.min(completed + 1, total)} von ${total}: ${currentSongTitle}`,
        sound: false,
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        data: { action: 'open_music_player' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Failed to update download notification:', err);
  }
}

/**
 * Dismisses the active download progress notification
 */
export async function hideDownloadProgressNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('yt_download_progress');
    await Notifications.dismissNotificationAsync('yt_download_progress');
    activeDownloadNotificationId = undefined;
  } catch (err) {
    console.warn('Failed to dismiss download notification:', err);
  }
}

/**
 * Sends a notification when the entire playlist has finished downloading
 */
export async function showDownloadCompletedNotification(
  playlistName: string,
  songCount: number
): Promise<void> {
  try {
    await hideDownloadProgressNotification();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 Playlist bereit fürs Gym!`,
        body: `"${playlistName}" (${songCount} Songs) wurde vollständig heruntergeladen und ist jetzt offline verfügbar.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { action: 'open_music_player' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Failed to send download completion notification:', err);
  }
}
