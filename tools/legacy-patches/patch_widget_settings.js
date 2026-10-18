const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

if (!code.includes('MusicSettingsModal')) {
  code = code.replace(
    "import PlaylistModal from './PlaylistModal';",
    "import PlaylistModal from './PlaylistModal';\\nimport MusicSettingsModal from './MusicSettingsModal';"
  );
}

// Add state for settings modal
code = code.replace(
  "const [modalVisible, setModalVisible] = useState(false);",
  "const [modalVisible, setModalVisible] = useState(false);\\n  const [settingsModalVisible, setSettingsModalVisible] = useState(false);"
);

// Add the settings cog icon to the top right of the widget
const oldTopSection = `      <View style={styles.topSection}>
        {/* Vinyl Record */}`;

const newTopSection = `      <TouchableOpacity 
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
        onPress={() => setSettingsModalVisible(true)}
      >
        <MaterialCommunityIcons name="cog" size={20} color="#666" />
      </TouchableOpacity>
      <View style={styles.topSection}>
        {/* Vinyl Record */}`;

code = code.replace(oldTopSection, newTopSection);

// Add the settings modal component at the end
const modals = `      <PlaylistModal 
        visible={modalVisible} 
        playlist={selectedPlaylist} 
        onClose={() => setModalVisible(false)} 
      />
      <MusicSettingsModal 
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />`;

code = code.replace(`      <PlaylistModal 
        visible={modalVisible} 
        playlist={selectedPlaylist} 
        onClose={() => setModalVisible(false)} 
      />`, modals);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched MediaPlayerWidget.tsx with Settings");
