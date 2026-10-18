const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

const target = `    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCollectibleImage(id, result.assets[0].uri);
    }`;

const newTarget = `    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      try {
        const FileSystem = require('expo-file-system');
        const filename = sourceUri.split('/').pop() || \`collectible_\${Date.now()}.jpg\`;
        const newUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({ from: sourceUri, to: newUri });
        setCollectibleImage(id, newUri);
      } catch (e) {
        setCollectibleImage(id, sourceUri); // Fallback
      }
    }`;

code = code.replace(target, newTarget);
fs.writeFileSync('src/screens/StatsScreen.tsx', code);
console.log("Patched Image Picker in StatsScreen");
