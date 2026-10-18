const fs = require('fs');
let code = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

const target = `          <View style={styles.songIconContainer}>
            {isCurrentlyPlaying && isPlaying ? (
              <MaterialCommunityIcons name="volume-high" size={20} color="#00D2FF" />
            ) : (
              <MaterialCommunityIcons name="music-note" size={20} color="#888" />
            )}
          </View>`;

const newTarget = `          <View style={[styles.songIconContainer, { position: 'relative' }]}>
            {(item.coverUri || playlist.coverUri) ? (
              <Image source={{ uri: item.coverUri || playlist.coverUri }} style={{ width: 40, height: 40, borderRadius: 6, opacity: isCurrentlyPlaying && isPlaying ? 0.3 : 1 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="music-note" size={20} color="#888" />
              </View>
            )}
            {isCurrentlyPlaying && isPlaying && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="volume-high" size={20} color="#00D2FF" />
              </View>
            )}
          </View>`;

code = code.replace(target, newTarget);

// Adjust styles.songIconContainer width and margin
code = code.replace(
  "songIconContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },",
  "songIconContainer: { width: 40, height: 40, marginRight: 12, alignItems: 'center', justifyContent: 'center' },"
);

fs.writeFileSync('src/components/PlaylistModal.tsx', code);
console.log("Patched song thumbnail");
