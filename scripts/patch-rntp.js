// This script patches react-native-track-player's MusicModule.kt for:
// 1. Kotlin 2.x null safety (Arguments.fromBundle requires non-null)
// 2. TurboModule compatibility: scope.launch returns Job, but TurboModuleInterop
//    requires @ReactMethod functions to return void (Unit). We wrap them so Kotlin
//    sees the return type as Unit.
//
// Runs automatically after every `npm install` via the "postinstall" script in package.json.

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-track-player',
  'android',
  'src',
  'main',
  'java',
  'com',
  'doublesymmetry',
  'trackplayer',
  'module',
  'MusicModule.kt'
);

if (!fs.existsSync(filePath)) {
  console.log('[patch-rntp] react-native-track-player not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');
let changed = false;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1: Null safety – getTrack()
// ─────────────────────────────────────────────────────────────────────────────
const oldGetTrack = `callback.resolve(Arguments.fromBundle(musicService.tracks[index].originalItem))`;
const newGetTrack = `val originalItem = musicService.tracks[index].originalItem
            if (originalItem != null) {
                callback.resolve(Arguments.fromBundle(originalItem))
            } else {
                callback.resolve(null)
            }`;

if (content.includes(oldGetTrack)) {
  content = content.replace(oldGetTrack, newGetTrack);
  console.log('[patch-rntp] ✅ Patched getTrack() for Kotlin 2.x null safety');
  changed = true;
} else {
  console.log('[patch-rntp] ℹ️  getTrack() already patched or not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2: Null safety – getActiveTrack()
// ─────────────────────────────────────────────────────────────────────────────
const oldGetActiveTrack = `callback.resolve(
            if (musicService.tracks.isEmpty()) null
            else Arguments.fromBundle(
                musicService.tracks[musicService.getCurrentTrackIndex()].originalItem
            )
        )`;
const newGetActiveTrack = `val activeItem = if (musicService.tracks.isEmpty()) null
            else musicService.tracks[musicService.getCurrentTrackIndex()].originalItem
        callback.resolve(if (activeItem != null) Arguments.fromBundle(activeItem) else null)`;

if (content.includes(oldGetActiveTrack)) {
  content = content.replace(oldGetActiveTrack, newGetActiveTrack);
  console.log('[patch-rntp] ✅ Patched getActiveTrack() for Kotlin 2.x null safety');
  changed = true;
} else {
  console.log('[patch-rntp] ℹ️  getActiveTrack() already patched or not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 3: TurboModule compatibility – all `= scope.launch { ... }` methods
//
// Problem: `fun foo(...) = scope.launch { ... }` has return type `Job` (non-void).
// TurboModuleInterop requires @ReactMethod functions to return void/Unit.
// Fix: Convert expression body to block body: `fun foo(...) { scope.launch { ... } }
// ─────────────────────────────────────────────────────────────────────────────
const lines = content.split('\n');
const newLines = [];
let i = 0;
let launchPatchCount = 0;

while (i < lines.length) {
  const line = lines[i];

  // Detect: `    fun someMethod(...) = scope.launch {`
  if (/^\s+fun \w+\([^)]*\)\s*=\s*scope\.launch\s*\{/.test(line)) {
    // Convert expression body to block body
    const converted = line.replace(/(\))\s*=\s*scope\.launch\s*\{/, '$1 { scope.launch {');
    newLines.push(converted);
    launchPatchCount++;

    // Scan forward to find the closing `}` of scope.launch block
    const indent = line.match(/^(\s+)/)?.[1] ?? '    ';
    i++;
    let braceDepth = 1;
    while (i < lines.length && braceDepth > 0) {
      const inner = lines[i];
      for (const ch of inner) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth === 0) {
        newLines.push(inner);       // closes scope.launch
        newLines.push(indent + '}'); // closes outer block body
      } else {
        newLines.push(inner);
      }
      i++;
    }
    continue;
  }

  newLines.push(line);
  i++;
}

if (launchPatchCount > 0) {
  content = newLines.join('\n');
  console.log(`[patch-rntp] ✅ Patched ${launchPatchCount} scope.launch methods for TurboModule (Unit return)`);
  changed = true;
} else {
  console.log('[patch-rntp] ℹ️  scope.launch methods already patched or not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// Write result
// ─────────────────────────────────────────────────────────────────────────────
if (changed) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[patch-rntp] ✅ MusicModule.kt patch complete');
} else {
  console.log('[patch-rntp] ✅ No patches needed');
}
