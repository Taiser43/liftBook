const fs = require('fs');
let code = fs.readFileSync('src/components/MusicSettingsModal.tsx', 'utf8');

const importLogic = `
  const { addPlaylist } = useMusicStore();
  
  const handleImport = async () => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawSongs = result.assets.map((asset: any) => ({ 
          title: asset.name.replace(/\.[^/.]+$/, ""), 
          uri: asset.uri, 
          artist: 'Unknown Artist' 
        }));
        
        addPlaylist({
          id: Date.now().toString(),
          name: 'Imported Playlist ' + new Date().toLocaleDateString(),
          songs: rawSongs as any[],
        });
        
        const { Alert } = require('react-native');
        Alert.alert("Success", "Playlist imported successfully!");
      }
    } catch(e) {
      console.warn("Import error:", e);
    }
  };
`;

code = code.replace("const { crossfadeSeconds", importLogic + "\n  const { crossfadeSeconds");

const importButton = `
          <View style={styles.section}>
            <Text style={styles.label}>Music Management</Text>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', padding: 16, borderRadius: 12, marginTop: 8 }}
              onPress={handleImport}
            >
              <MaterialCommunityIcons name="folder-download" size={24} color="#00D2FF" style={{ marginRight: 12 }} />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Import MP3s from Device</Text>
            </TouchableOpacity>
          </View>
`;

code = code.replace("</View>\n      </View>\n    </Modal>", importButton + "\n        </View>\n      </View>\n    </Modal>");

fs.writeFileSync('src/components/MusicSettingsModal.tsx', code);
console.log("Patched MusicSettingsModal.tsx");
