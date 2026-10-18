const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Enable background location
if (!obj.expo.android.permissions) obj.expo.android.permissions = [];
if (!obj.expo.android.permissions.includes('ACCESS_BACKGROUND_LOCATION')) {
  obj.expo.android.permissions.push('ACCESS_BACKGROUND_LOCATION');
}
// Ensure the location plugin has backgroundMode
const locPlugin = obj.expo.plugins.find(p => Array.isArray(p) && p[0] === 'expo-location');
if (locPlugin && !locPlugin[1].isAndroidBackgroundLocationEnabled) {
  locPlugin[1].isAndroidBackgroundLocationEnabled = true;
  locPlugin[1].locationAlwaysPermission = 'Allow PT Nutrition to track your cardio route in the background.';
}

fs.writeFileSync('app.json', JSON.stringify(obj, null, 2));
console.log('app.json patched');
