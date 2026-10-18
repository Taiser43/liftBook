const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// The block we want to extract is from {cardioAggregates && ( ... )} inside CardioModalVisible
// It starts around line 882.
const startStr = '{cardioAggregates && (';
const endStr = '                </View>\n              ))}\n            {cardioHistory.filter(s => s.type === selectedCardioType).length === 0 && (\n              <Text style={{ color: \'#888\', textAlign: \'center\', marginTop: 40 }}>No recorded sessions found.</Text>\n            )}\n          </ScrollView>\n        </View>\n      </Modal>';

const idx1 = c.indexOf(startStr);
const idx2 = c.indexOf(endStr);

if (idx1 !== -1 && idx2 !== -1) {
  let statsBlock = c.substring(idx1, idx2 + endStr.indexOf('</ScrollView>')); // keep up to the end of the history map
  
  // Clean up the "View Level Tiers" button we added earlier
  statsBlock = statsBlock.replace(
    /<View style=\{\{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 \}\}>\n\s*<Text style=\{\{ color: '#00D2FF', fontSize: 16, fontWeight: '700' \}\}>Lifetime Stats<\/Text>[\s\S]*?<\/TouchableOpacity>\n\s*<\/View>/,
    `<Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Lifetime Stats</Text>`
  );

  // We need to inject this block into the LevelProgressionModal children!
  const modalInvoke = `<LevelProgressionModal 
          visible={!!detailNode} 
          onClose={() => setDetailNode(null)} 
          title={detailNode.name} 
          currentXP={Math.round(detailNode.xp)} 
          type={detailNode.type} 
          thresholds={detailNode.thresholds}
          description={detailNode.desc}
        />`;
        
  // Wait, I haven't added Math.round yet! I'll add it now.
  const newModalInvoke = `<LevelProgressionModal 
          visible={!!detailNode} 
          onClose={() => setDetailNode(null)} 
          title={detailNode.name} 
          currentXP={Math.round(detailNode.xp)} 
          type={detailNode.type} 
          thresholds={detailNode.thresholds}
          description={detailNode.desc}
        >
          {detailNode.type === 'cardio' && (
            <View style={{ marginTop: 24 }}>
              ${statsBlock}
            </View>
          )}
        </LevelProgressionModal>`;
        
  c = c.replace(
    /<LevelProgressionModal[\s\S]*?\/>/,
    newModalInvoke
  );
  
  // Now completely remove the old Cardio Modal!
  const modalStart = `<Modal visible={cardioModalVisible} animationType="slide" presentationStyle="pageSheet">`;
  const modalEnd = `      </Modal>`; // the one after cardioHistory map
  const m1 = c.indexOf(modalStart);
  const m2 = c.indexOf(modalEnd, m1);
  if (m1 !== -1 && m2 !== -1) {
    c = c.substring(0, m1) + c.substring(m2 + modalEnd.length);
  }
  
  fs.writeFileSync(p, c);
  console.log('Merged Cardio Stats into LevelProgressionModal');
}
