const fs = require('fs');
let code = fs.readFileSync('src/services/notificationService.ts', 'utf8');

code = code.replace(
  `export async function hideActiveWorkoutNotification(): Promise<void> {
  if (activeWorkoutNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(activeWorkoutNotificationId);
      activeWorkoutNotificationId = undefined;
    } catch (err) {
      console.warn('Failed to cancel active workout notification:', err);
    }
  }
}`,
  `export async function hideActiveWorkoutNotification(): Promise<void> {
  try {
    // Always try to cancel the hardcoded ID regardless of memory state
    await Notifications.cancelScheduledNotificationAsync('live_workout_session');
    activeWorkoutNotificationId = undefined;
    // Also try to dismiss all to be absolutely sure if it got stuck as a presented notification
    await Notifications.dismissNotificationAsync('live_workout_session');
  } catch (err) {
    console.warn('Failed to cancel active workout notification:', err);
  }
}`
);

fs.writeFileSync('src/services/notificationService.ts', code);
console.log('Done');
