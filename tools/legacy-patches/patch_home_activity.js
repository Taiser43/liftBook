const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const target = `          {renderProgressBar(consumedToday.fat, targets.fat, '#BF5AF2')}
        </View>
      </View>`;

const replacement = `          {renderProgressBar(consumedToday.fat, targets.fat, '#BF5AF2')}
        </View>
      </View>

      {/* ACTIVITY & BURNED CALORIES (MOCK) */}
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <MaterialCommunityIcons name="watch" size={20} color="#30D158" />
          <Text style={styles.activityTitle}>Activity (Mock Watch)</Text>
        </View>
        <View style={styles.activityRow}>
          <View style={styles.activityStat}>
            <MaterialCommunityIcons name="fire" size={24} color="#FF453A" />
            <Text style={styles.activityValue}>
              {/* Calculate burned calories: 300 base for steps + workout calories */
                300 + (workoutHistory.filter(w => w.date.startsWith(new Date().toISOString().split('T')[0])).reduce((sum, w) => sum + w.caloriesBurned, 0) || 0)
              } <Text style={styles.activityUnit}>kcal</Text>
            </Text>
            <Text style={styles.activityLabel}>Active Burn</Text>
          </View>
          <View style={styles.activityStat}>
            <MaterialCommunityIcons name="shoe-sneaker" size={24} color="#00D2FF" />
            <Text style={styles.activityValue}>8,452 <Text style={styles.activityUnit}>steps</Text></Text>
            <Text style={styles.activityLabel}>Daily Steps</Text>
          </View>
        </View>
      </View>`;

code = code.replace(target, replacement);

const styleAppend = `
  activityCard: { backgroundColor: '#1E1E20', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#303036' },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activityTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-around' },
  activityStat: { alignItems: 'center' },
  activityValue: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 8 },
  activityUnit: { fontSize: 14, color: '#888', fontWeight: '600' },
  activityLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 4 },
});`;

// replace last styles block again
const lastIndex = code.lastIndexOf('});');
code = code.substring(0, lastIndex) + styleAppend + code.substring(lastIndex + 3);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
