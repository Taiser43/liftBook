const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace DocumentPicker logic in both files
  content = content.replace(
    /const result = await DocumentPicker\.getDocumentAsync\(\{[\s\S]*?copyToCacheDirectory: true,\s*\}\);\s*if \(!result\.canceled && result\.assets && result\.assets\.length > 0\) \{[\s\S]*?const rawSongs = result\.assets\.map\(\(asset: any\) => \(\{[\s\S]*?title: asset\.name\.replace\(\/\\\.\[\^\/\.\]\+\$\/, ""\),[\s\S]*?uri: asset\.uri,[\s\S]*?artist: 'Unknown Artist'[\s\S]*?\}\)\);/g,
    `const FileSystem = require('expo-file-system');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawSongs = await Promise.all(result.assets.map(async (asset: any) => {
          let permanentUri = asset.uri;
          try {
            const filename = asset.name || asset.uri.split('/').pop() || \`song_\${Date.now()}.mp3\`;
            // Remove spaces and special chars to prevent URI issues
            const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const newUri = FileSystem.documentDirectory + safeFilename;
            await FileSystem.copyAsync({ from: asset.uri, to: newUri });
            permanentUri = newUri;
          } catch (e) {
            console.warn("Failed to copy audio file", e);
          }
          return {
            title: asset.name.replace(/\\.[^/.]+$/, ""),
            uri: permanentUri,
            artist: 'Unknown Artist',
          };
        }));`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched', filePath);
}

patchFile('src/components/MediaPlayerWidget.tsx');
patchFile('src/components/PlaylistModal.tsx');
