const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
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

  return config;
};
