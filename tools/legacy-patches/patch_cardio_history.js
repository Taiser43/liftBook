const fs = require('fs');

let code = fs.readFileSync('src/screens/CardioHistoryScreen.tsx', 'utf8');

// Add import for generateMockCardioSessions
code = code.replace(
  `import { useCardioStore, CardioSession, CardioActivityType } from '../store/useCardioStore';`,
  `import { useCardioStore, CardioSession, CardioActivityType, generateMockCardioSessions } from '../store/useCardioStore';`
);

// Add details button inside the expanded view
code = code.replace(
  `            {renderHRZones(item)}\n          </View>`,
  `            {renderHRZones(item)}\n            <TouchableOpacity \n              style={{ backgroundColor: '#00D2FF', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' }}\n              onPress={() => navigation.navigate('CardioSessionDetail', { sessionId: item.id })}\n            >\n              <Text style={{ color: '#121212', fontWeight: 'bold' }}>View Full Details</Text>\n            </TouchableOpacity>\n          </View>`
);

// Add a button in the header to trigger the mock generator for testing
code = code.replace(
  `        <Text style={styles.title}>History</Text>`,
  `        <Text style={styles.title} onPress={() => generateMockCardioSessions()}>History (Tap for Mock)</Text>`
);

fs.writeFileSync('src/screens/CardioHistoryScreen.tsx', code);
