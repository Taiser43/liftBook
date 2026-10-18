const fs = require('fs');
let code = fs.readFileSync('src/services/notificationService.ts', 'utf8');

code = code.replace(
  `      trigger: {
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },`,
  `      trigger: {
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: 'rest_timers',
      },`
);

fs.writeFileSync('src/services/notificationService.ts', code);
console.log('Done');
