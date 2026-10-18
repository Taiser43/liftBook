const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// 1. Remove handleImport function
const handleImportRegex = /const handleImport = async \(\) => \{[\s\S]*?catch\s*\(\w*\)\s*\{[\s\S]*?\}\n  \};\n/g;
code = code.replace(handleImportRegex, "");

// 2. Replace Playlists Row
const oldPlaylistsRow = `<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistsScroll}>
          <TouchableOpacity style={styles.addPlaylistBtn} onPress={handleImport}>
            <MaterialCommunityIcons name="folder-plus" size={28} color="#00D2FF" />
            <Text style={styles.addPlaylistText}>Import</Text>
          </TouchableOpacity>
          
          {playlists.map(playlist => (
            <TouchableOpacity 
              key={playlist.id} 
              style={styles.playlistIconContainer}
              onPress={() => openPlaylist(playlist)}
            >
              <View style={[styles.playlistCover, !playlist.coverUri && { backgroundColor: '#333' }]}>
                {playlist.coverUri ? (
                  <Image source={{ uri: playlist.coverUri }} style={styles.playlistCoverImg} />
                ) : (
                  <MaterialCommunityIcons name="music" size={24} color="#666" />
                )}
              </View>
              <Text style={styles.playlistIconName} numberOfLines={1}>{playlist.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>`;

const newPlaylistsRow = `<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          {playlists.slice(0, 8).map(playlist => (
            <TouchableOpacity 
              key={playlist.id} 
              style={styles.playlistIconContainer}
              onPress={() => openPlaylist(playlist)}
            >
              <View style={[styles.playlistCover, !playlist.coverUri && { backgroundColor: '#333' }]}>
                {playlist.coverUri ? (
                  <Image source={{ uri: playlist.coverUri }} style={styles.playlistCoverImg} />
                ) : (
                  <MaterialCommunityIcons name="music" size={24} color="#666" />
                )}
              </View>
              <Text style={styles.playlistIconName} numberOfLines={1}>{playlist.name}</Text>
            </TouchableOpacity>
          ))}
        </View>`;

code = code.replace(oldPlaylistsRow, newPlaylistsRow);

// I'll make the playlistIconContainer a bit more dynamic or let it be width: 70
code = code.replace(
  "playlistIconContainer: { width: 70, alignItems: 'center' },",
  "playlistIconContainer: { width: '22%', alignItems: 'center', marginBottom: 12 },"
);

code = code.replace(
  "playlistCover: {",
  "playlistCover: {\n    aspectRatio: 1, width: '100%', height: undefined,"
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched grid");
