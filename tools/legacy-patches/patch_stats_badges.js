const fs = require('fs');

let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

// 1. Add pinnedAchievements to useAppStore destruct
code = code.replace(
  'unlockedAchievements,',
  'unlockedAchievements,\n    pinnedAchievements,\n    setPinnedAchievements,'
);

// 2. Add Badge Picker state
code = code.replace(
  'const [titleModalVisible, setTitleModalVisible] = useState(false);',
  'const [titleModalVisible, setTitleModalVisible] = useState(false);\n  const [badgePickerVisible, setBadgePickerVisible] = useState(false);\n  const [selectingBadgeSlot, setSelectingBadgeSlot] = useState<number | null>(null);'
);

// 3. Replace profileStreakRight
const oldProfileStreakRight = `<View style={styles.profileStreakRight}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#FFD60A', fontSize: 12, fontWeight: '800' }}>{fitCoins} 🪙</Text>
              <Text style={{ color: '#888', fontSize: 9 }}>FitCoins</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '800' }}>{restDayTokens} 🛡️</Text>
              <Text style={{ color: '#888', fontSize: 9 }}>Rest Tokens</Text>
            </View>
          </View>`;

const newProfileStreakRight = `<View style={[styles.profileStreakRight, { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', flex: 1, paddingRight: 8 }]}>
            {[0, 1, 2].map(slotIndex => {
              const pinnedId = (pinnedAchievements || [])[slotIndex];
              const ach = pinnedId ? achievements.find(a => a.id === pinnedId) : null;
              
              return (
                <TouchableOpacity 
                  key={slotIndex} 
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ach ? (ach.tier !== 'Locked' ? ach.tierColor + '20' : '#222') : '#222', borderWidth: 1, borderColor: ach && ach.tier !== 'Locked' ? ach.tierColor : '#444', justifyContent: 'center', alignItems: 'center' }}
                  onPress={(e) => { e.stopPropagation(); setSelectingBadgeSlot(slotIndex); setBadgePickerVisible(true); }}
                >
                  {ach && ach.tier !== 'Locked' ? (
                    <EmblemIcon icon={ach.icon || 'trophy'} color={ach.tierColor} size={26} />
                  ) : (
                    <MaterialCommunityIcons name="plus" size={24} color="#666" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>`;

code = code.replace(oldProfileStreakRight, newProfileStreakRight);

// 4. Add the Badge Picker Modal at the end, just before </> or inside the main return container
const badgePickerModal = `

      {/* BADGE PICKER MODAL */}
      <Modal visible={badgePickerVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>Pin Achievement</Text>
              <TouchableOpacity onPress={() => { setBadgePickerVisible(false); setSelectingBadgeSlot(null); }}>
                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#888', marginBottom: 16 }}>Select an unlocked achievement to show on your profile.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Option to clear slot */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#28282C', borderRadius: 12, marginBottom: 12 }}
                onPress={() => {
                  if (selectingBadgeSlot !== null) {
                    const newPinned = [...(pinnedAchievements || [])];
                    newPinned[selectingBadgeSlot] = '';
                    setPinnedAchievements(newPinned);
                  }
                  setBadgePickerVisible(false);
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <MaterialCommunityIcons name="minus" size={24} color="#FFF" />
                </View>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Clear Slot</Text>
              </TouchableOpacity>

              {achievements.filter(a => a.tier !== 'Locked').map(ach => (
                <TouchableOpacity 
                  key={ach.id} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#28282C', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: ach.tierColor }}
                  onPress={() => {
                    if (selectingBadgeSlot !== null) {
                      const newPinned = [...(pinnedAchievements || [])];
                      // Remove it from other slots if it's already pinned
                      const existingIndex = newPinned.indexOf(ach.id);
                      if (existingIndex !== -1) newPinned[existingIndex] = '';
                      
                      newPinned[selectingBadgeSlot] = ach.id;
                      setPinnedAchievements(newPinned);
                    }
                    setBadgePickerVisible(false);
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ach.tierColor + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                    <EmblemIcon icon={ach.icon || 'trophy'} color={ach.tierColor} size={26} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: ach.tierColor, fontSize: 16, fontWeight: 'bold' }}>{ach.title}</Text>
                    <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{ach.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {achievements.filter(a => a.tier !== 'Locked').length === 0 && (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No unlocked achievements yet. Keep training!</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
`;

// Insert the modal just before the closing tag of the main component return
// It's wrapped in a fragments `<></>` in `StatsScreen.tsx`
code = code.replace(/(\s*)(<\/ScrollView>\s*<\/>)/, badgePickerModal + "$1$2");

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
console.log('Patched StatsScreen.tsx');
