const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withHealthConnectQueries(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest.queries) {
      manifest.manifest.queries = [];
    }

    const hasHealthDataQuery = manifest.manifest.queries.some(
      (q) =>
        q.package &&
        q.package.some((p) => p.$['android:name'] === 'com.google.android.apps.healthdata')
    );

    if (!hasHealthDataQuery) {
      if (!manifest.manifest.queries[0]) {
        manifest.manifest.queries[0] = {};
      }
      if (!manifest.manifest.queries[0].package) {
        manifest.manifest.queries[0].package = [];
      }
      manifest.manifest.queries[0].package.push({
        $: { 'android:name': 'com.google.android.apps.healthdata' }
      });
    }

    return config;
  });
};
