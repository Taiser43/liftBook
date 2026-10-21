const { withAppBuildGradle, withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withDevAppVariant(config) {
  // 1. Modify build.gradle to add applicationIdSuffix ".dev" to debug buildType
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    if (!buildGradle.includes('applicationIdSuffix ".dev"')) {
      buildGradle = buildGradle.replace(
        /(debug\s*\{\s*signingConfig signingConfigs\.debug)/,
        '$1\n            applicationIdSuffix ".dev"'
      );
      config.modResults.contents = buildGradle;
    }
    return config;
  });

  // 2. Create android/app/src/debug/res/values/strings.xml with "Iron Log (Dev)"
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const debugResDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'debug',
        'res',
        'values'
      );
      fs.mkdirSync(debugResDir, { recursive: true });
      fs.writeFileSync(
        path.join(debugResDir, 'strings.xml'),
        `<resources>\n  <string name="app_name">Iron Log (Dev)</string>\n</resources>\n`,
        'utf8'
      );
      return config;
    },
  ]);

  // 3. Ensure widget receivers are exported=true (required by Android Launcher) and support .dev variant
  config = withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application?.[0];
    if (mainApp && Array.isArray(mainApp.receiver)) {
      mainApp.receiver.forEach((receiver) => {
        if (receiver.$ && typeof receiver.$['android:name'] === 'string' && receiver.$['android:name'].includes('Nutrition')) {
          // Android Launcher needs exported=true to display and bind widgets in the picker
          receiver.$['android:exported'] = 'true';

          // Fully qualify class name so applicationIdSuffix (".dev") resolves the Java class correctly
          if (receiver.$['android:name'].startsWith('.')) {
            receiver.$['android:name'] = 'com.taiser.ptnutritionapp' + receiver.$['android:name'];
          }
        }

        if (Array.isArray(receiver['intent-filter'])) {
          receiver['intent-filter'].forEach((filter) => {
            if (Array.isArray(filter.action)) {
              filter.action.forEach((act) => {
                if (act.$ && typeof act.$['android:name'] === 'string' && act.$['android:name'].endsWith('.WIDGET_CLICK')) {
                  act.$['android:name'] = '${applicationId}.WIDGET_CLICK';
                }
              });
            }
          });
        }
      });
    }
    return config;
  });

  return config;
};

