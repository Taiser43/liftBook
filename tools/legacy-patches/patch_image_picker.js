const fs = require('fs');
let code = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

const target = `    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditCoverUri(result.assets[0].uri);
    }`;

const newTarget = `    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      try {
        const FileSystem = require('expo-file-system');
        const filename = sourceUri.split('/').pop() || \`cover_\${Date.now()}.jpg\`;
        const newUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({ from: sourceUri, to: newUri });
        setEditCoverUri(newUri);
      } catch (e) {
        setEditCoverUri(sourceUri); // Fallback
      }
    }`;

code = code.replace(target, newTarget);
fs.writeFileSync('src/components/PlaylistModal.tsx', code);
console.log("Patched Image Picker");
