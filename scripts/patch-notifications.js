const fs = require('fs');
const path = require('path');

function patchFile(relPath, replacer) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('File does not exist:', relPath);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const newContent = replacer(content);
  if (newContent !== content) {
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log('Successfully patched:', relPath);
  } else {
    console.log('Already patched or target pattern not found in:', relPath);
  }
}

// 1. Patch warnOfExpoGoPushUsage.js so it warns instead of throwing fatal runtime error on Android Expo Go
patchFile('node_modules/expo-notifications/build/warnOfExpoGoPushUsage.js', (content) => {
  return content.replace(
    /if\s*\(\s*Platform\.OS\s*===\s*'android'\s*\)\s*\{\s*throw new Error\(message\);\s*\}\s*else if\s*\(\s*__DEV__\s*\)\s*\{\s*didWarn = true;\s*console\.warn\(message\);\s*\}/g,
    'didWarn = true;\n        console.warn(message);'
  );
});

// 2. Patch warnOfExpoGoPushUsage.ts as well
patchFile('node_modules/expo-notifications/src/warnOfExpoGoPushUsage.ts', (content) => {
  return content.replace(
    /if\s*\(\s*Platform\.OS\s*===\s*'android'\s*\)\s*\{\s*throw new Error\(message\);\s*\}\s*else if\s*\(\s*__DEV__\s*\)\s*\{\s*didWarn = true;\s*console\.warn\(message\);\s*\}/g,
    'didWarn = true;\n        console.warn(message);'
  );
});

// 3. Patch DevicePushTokenAutoRegistration.fx.js so it does not auto-subscribe push tokens in Expo Go
patchFile('node_modules/expo-notifications/build/DevicePushTokenAutoRegistration.fx.js', (content) => {
  let updated = content;
  if (!updated.includes("import { isRunningInExpoGo } from 'expo';")) {
    updated = "import { isRunningInExpoGo } from 'expo';\n" + updated;
  }
  updated = updated.replace(
    /if\s*\(\s*ServerRegistrationModule\.getRegistrationInfoAsync\s*\)\s*\{/g,
    'if (ServerRegistrationModule.getRegistrationInfoAsync && !isRunningInExpoGo()) {'
  );
  return updated;
});

// 4. Patch all native module requires to use requireOptionalNativeModule with a Proxy fallback
const dir = path.join(__dirname, '..', 'node_modules/expo-notifications/build');
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('requireNativeModule')) {
      let newContent = content.replace(/requireNativeModule/g, 'requireOptionalNativeModule');
      newContent = newContent.replace(/requireOptionalNativeModule\((['"][^'"]+['"])\)/g, "(requireOptionalNativeModule($1) || new Proxy({}, { get(target, prop) { return () => { console.warn('Calling missing native module method:', prop); return Promise.resolve({ status: 'undetermined', canAskAgain: false, granted: false, expires: 'never', data: null }); } } }))");
      if (newContent !== content) {
        fs.writeFileSync(p, newContent, 'utf8');
        console.log('Successfully patched native module require in:', file);
      }
    }
  }
}

console.log('Notification patch completed.');
