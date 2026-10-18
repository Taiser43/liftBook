const fs = require('fs');
let code = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

code = code.replace(
  "import { SafeAreaView } from 'react-native-safe-area-context';",
  "import { SafeAreaView } from 'react-native-safe-area-context';\\nimport PowerSongConfigModal from './PowerSongConfigModal';"
);

code = code.replace(
  "const [editCoverUri, setEditCoverUri] = useState<string | undefined>(undefined);",
  "const [editCoverUri, setEditCoverUri] = useState<string | undefined>(undefined);\\n  const [powerSongConfigVisible, setPowerSongConfigVisible] = useState(false);\\n  const [selectedPowerSong, setSelectedPowerSong] = useState<Song | null>(null);"
);

fs.writeFileSync('src/components/PlaylistModal.tsx', code);
console.log("Patched PlaylistModal.tsx");
