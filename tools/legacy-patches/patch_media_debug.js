const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// Ensure FileSystem and Alert are imported
if (!content.includes("import * as FileSystem")) {
  content = content.replace("import TrackPlayer", "import * as FileSystem from 'expo-file-system';\nimport TrackPlayer");
}
if (!content.includes("import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, Alert }")) {
  content = content.replace("import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing }", "import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, Alert }");
}

const checkLogic = `          if (needsFullLoad) {
            // Debug check for the first song
            if (playlist.songs.length > 0) {
               const fileInfo = await FileSystem.getInfoAsync(playlist.songs[0].uri);
               if (!fileInfo.exists) {
                  Alert.alert("Dateifehler", "Die Musikdatei existiert nicht mehr auf dem Gerät. Sie wurde vermutlich vom System gelöscht, da sie im Cache lag. Bitte importiere die Lieder neu!");
               }
            }

            await TrackPlayer.reset();`;

content = content.replace("          if (needsFullLoad) {\n            await TrackPlayer.reset();", checkLogic);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
