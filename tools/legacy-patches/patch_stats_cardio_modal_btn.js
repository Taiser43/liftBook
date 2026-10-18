const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<Text style=\{\{ color: '#00D2FF', fontSize: 16, fontWeight: '700', marginBottom: 12 \}\}>Lifetime Stats<\/Text>/,
  `<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: '700' }}>Lifetime Stats</Text>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#00D2FF20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                    onPress={() => {
                      setCardioModalVisible(false);
                      setTimeout(() => setDetailNode({ type: 'cardio', name: selectedCardioType, xp: cardioXP[selectedCardioType] || 0 }), 300);
                    }}
                  >
                    <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700' }}>View Level Tiers</Text>
                  </TouchableOpacity>
                </View>`
);

fs.writeFileSync(p, c);
console.log('Added button to CardioModal');
