const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('equippedTitle')) {
  c = c.replace(
    /monkXP,/,
    "monkXP,\n    equippedTitle,\n    setEquippedTitle,\n    unlockedAchievements,"
  );
  
  c = c.replace(
    /const \[achievementsExpanded, setAchievementsExpanded\] = useState\(false\);/,
    "const [achievementsExpanded, setAchievementsExpanded] = useState(false);\n  const [titleModalVisible, setTitleModalVisible] = useState(false);"
  );
  
  c = c.replace(
    /<Text style=\{\[styles\.rankTitle, \{ color: levelData\.rankColor \}\]\}>\{levelData\.title\}<\/Text>/,
    `<TouchableOpacity onPress={() => setTitleModalVisible(true)}>
              <Text style={[styles.rankTitle, { color: levelData.rankColor }]}>{levelData.title}</Text>
              {equippedTitle && <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>« {equippedTitle} »</Text>}
            </TouchableOpacity>`
  );
  
  const modalCode = `
      {/* Title Selection Modal */}
      <Modal visible={titleModalVisible} animationType="slide" transparent={true}>
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Equip Title</Text>
              <TouchableOpacity onPress={() => setTitleModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <TouchableOpacity 
                style={{ padding: 16, backgroundColor: equippedTitle === null ? '#333' : '#1E1E1E', borderRadius: 8, marginBottom: 8 }}
                onPress={() => { setEquippedTitle(null); setTitleModalVisible(false); }}
              >
                <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>None</Text>
              </TouchableOpacity>
              
              {/* Derive titles from unlocked achievements */}
              {unlockedAchievements && unlockedAchievements.map(id => {
                const ach = achievements.find(a => a.id === id);
                if (!ach) return null;
                return (
                  <TouchableOpacity 
                    key={id} 
                    style={{ padding: 16, backgroundColor: equippedTitle === ach.title ? '#333' : '#1E1E1E', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#444' }}
                    onPress={() => { setEquippedTitle(ach.title); setTitleModalVisible(false); }}
                  >
                    <Text style={{ color: '#00D2FF', textAlign: 'center', fontWeight: 'bold' }}>« {ach.title} »</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
`;
  
  c = c.replace(/<\/ScrollView>\n  \);\n\}/, "</>)}\n    </ScrollView>\n" + modalCode + "  );\n}");
  
  fs.writeFileSync(p, c);
  console.log('Added Title equipping logic');
}
