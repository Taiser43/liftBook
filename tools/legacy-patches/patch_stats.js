const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

if (!code.includes('useMusicStore')) {
  code = code.replace(
    "import { useCardioStore } from '../store/useCardioStore';",
    "import { useCardioStore } from '../store/useCardioStore';\\nimport { useMusicStore } from '../store/useMusicStore';"
  );
}

// Add state for Music Stats Modal
const hooks = `  const { playlists } = useMusicStore();
  const [musicStatsModalVisible, setMusicStatsModalVisible] = useState(false);
  const [musicTimeRange, setMusicTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const topSongs = useMemo(() => {
    let allSongs: any[] = [];
    playlists.forEach(p => {
      p.songs.forEach(s => {
        allSongs.push({ ...s, playlistName: p.name });
      });
    });

    const now = Date.now();
    const rangeMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    }[musicTimeRange];

    return allSongs.map(s => {
      const playsInRange = (s.playHistory || []).filter((timestamp: number) => (now - timestamp) <= rangeMs).length;
      return { ...s, playsInRange };
    }).filter(s => s.playsInRange > 0)
      .sort((a, b) => b.playsInRange - a.playsInRange)
      .slice(0, 10);
  }, [playlists, musicTimeRange]);
`;

code = code.replace("const bottomSpacing = useBottomSpacing();", "const bottomSpacing = useBottomSpacing();\\n" + hooks);

// Add the Music block in Collections section
const musicBtn = `
      <TouchableOpacity style={styles.collectionBtn} onPress={() => setMusicStatsModalVisible(true)}>
        <MaterialCommunityIcons name="music-box-multiple" size={28} color="#FFD60A" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Music Stats</Text>
          <Text style={styles.collectionBtnSub}>Your Top Tracks</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>
`;
code = code.replace("</ScrollView>", musicBtn + "\\n</ScrollView>");

// Add Music Modal
const musicModal = `
      {/* Music Stats Modal */}
      <Modal visible={musicStatsModalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMusicStatsModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="chevron-down" size={32} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Your Top Songs</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
            {(['week', 'month', 'year'] as const).map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterChip,
                  musicTimeRange === range && styles.filterChipActive
                ]}
                onPress={() => setMusicTimeRange(range)}
              >
                <Text style={[styles.filterChipText, musicTimeRange === range && { color: '#000' }]}>
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
            {topSongs.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No songs played in this time range.</Text>
            ) : (
              topSongs.map((song, idx) => (
                <View key={idx + song.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                  <Text style={{ color: '#00D2FF', fontSize: 18, fontWeight: 'bold', width: 30 }}>{idx + 1}</Text>
                  {song.coverUri ? (
                    <Image source={{ uri: song.coverUri }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                  ) : (
                    <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="music" size={24} color="#666" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{song.title}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>{song.artist || 'Unknown'} • {song.playlistName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#FFD60A', fontSize: 16, fontWeight: 'bold' }}>{song.playsInRange}</Text>
                    <Text style={{ color: '#888', fontSize: 10 }}>Plays</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
`;

code = code.replace("</View>\\n    </View>\\n  );\\n}", musicModal + "\\n</View>\\n    </View>\\n  );\\n}");

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
console.log("Patched StatsScreen");
