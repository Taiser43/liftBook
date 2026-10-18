const fs = require('fs');
let code = fs.readFileSync('src/services/notificationService.ts', 'utf8');

code = code.replace(
  `export async function scheduleRestNotification(endTimeMs: number): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;`,
  `export async function scheduleRestNotification(endTimeMs: number): Promise<void> {
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
    }`
);

code = code.replace(
  `      content: {
        title: \`🔔 Rest Over!\`,
        body: \`Time for your next set! 🏋️‍♂️\`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { action: 'open_workout' },
      },`,
  `      content: {
        title: \`🔔 Rest Over!\`,
        body: \`Time for your next set! 🏋️‍♂️\`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { action: 'open_workout' },
      },
      identifier: 'rest_timer_notif',`
);

// We need to add Platform import to notificationService if it isn't there
if (!code.includes("import { Platform }")) {
  code = code.replace(
    `import * as Notifications from 'expo-notifications';`,
    `import * as Notifications from 'expo-notifications';\nimport { Platform } from 'react-native';`
  );
}

fs.writeFileSync('src/services/notificationService.ts', code);
console.log('Done');
