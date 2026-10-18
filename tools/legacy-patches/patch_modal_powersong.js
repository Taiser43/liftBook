const fs = require('fs');
let code = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

if (!code.includes('PowerSongConfigModal')) {
  code = code.replace(
    "import React, { useState, useMemo } from 'react';",
    "import React, { useState, useMemo } from 'react';\\nimport PowerSongConfigModal from './PowerSongConfigModal';"
  );
}

// Add state
code = code.replace(
  "const [editName, setEditName] = useState(playlist.name);",
  "const [editName, setEditName] = useState(playlist.name);\\n  const [powerSongConfigVisible, setPowerSongConfigVisible] = useState(false);\\n  const [selectedPowerSong, setSelectedPowerSong] = useState<Song | null>(null);"
);

// Update lightning bolt onPress
const oldBolt = `onPress={() => {
                  useMusicStore.getState().setPowerSong({
                    songId: item.id,
                    playlistId: playlist.id,
                    startPosition: 0
                  });
                  setExpandedSongId(null);
                  Alert.alert("Power Song Set!", item.title + " is now your Power Song!");
                }}`;

const newBolt = `onPress={() => {
                  setSelectedPowerSong(item);
                  setPowerSongConfigVisible(true);
                  setExpandedSongId(null);
                }}`;

code = code.replace(oldBolt, newBolt);

// Add the modal at the end
const modals = `      </SafeAreaView>
      <PowerSongConfigModal
        visible={powerSongConfigVisible}
        song={selectedPowerSong}
        playlistId={playlist.id}
        onClose={() => {
          setPowerSongConfigVisible(false);
          setSelectedPowerSong(null);
        }}
      />
    </Modal>
  );
}`;

code = code.replace(`      </SafeAreaView>
    </Modal>
  );
}`, modals);

fs.writeFileSync('src/components/PlaylistModal.tsx', code);
console.log("Patched PlaylistModal.tsx with PowerSongConfigModal");
