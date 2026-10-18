const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

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

// Only add it if it's not already there
if (!code.includes('Pin Achievement')) {
  code = code.replace(/(\s*)(<\/>\s*\);\s*})/m, badgePickerModal + "$1$2");
  fs.writeFileSync('src/screens/StatsScreen.tsx', code);
  console.log('Appended modal successfully');
} else {
  console.log('Modal was already present somehow.');
}
