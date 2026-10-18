const fs = require('fs');
let lines = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8').split('\n');

const uiReplacement = `      {/* Unified Streaks Banner */}
      <View style={styles.unifiedStreakCard}>
        <View style={styles.masterStreakRow}>
          <MaterialCommunityIcons name="crown" size={32} color={(streaks.workedOutToday && streaks.hitNutritionToday) ? "#FFD60A" : "#666"} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={styles.masterStreakNum}>{streaks.overall}</Text>
            <Text style={styles.masterStreakTitle}>MASTER STREAK</Text>
          </View>
          <View style={[styles.masterBadge, (streaks.workedOutToday && streaks.hitNutritionToday) && styles.masterBadgeActive]}>
            <Text style={[styles.masterBadgeText, (streaks.workedOutToday && streaks.hitNutritionToday) && { color: '#000' }]}>
              {(streaks.workedOutToday && streaks.hitNutritionToday) ? 'LOCKED TODAY' : 'PENDING'}
            </Text>
          </View>
        </View>

        <View style={styles.subStreaksRow}>
          <View style={styles.subStreak}>
            <MaterialCommunityIcons name="weight-lifter" size={20} color={streaks.workedOutToday ? "#00D2FF" : "#666"} />
            <Text style={styles.subStreakVal}>{streaks.training} <Text style={styles.subStreakLabel}>Training</Text></Text>
          </View>
          <View style={styles.subStreakDivider} />
          <View style={styles.subStreak}>
            <MaterialCommunityIcons name="food-apple" size={20} color={streaks.hitNutritionToday ? "#30D158" : "#666"} />
            <Text style={styles.subStreakVal}>{streaks.nutrition} <Text style={styles.subStreakLabel}>Nutrition</Text></Text>
          </View>
        </View>
      </View>`;

// Delete lines 162 to 184 (0-indexed 161 to 183) and insert replacement
lines.splice(161, 23, uiReplacement);
fs.writeFileSync('src/screens/HomeScreen.tsx', lines.join('\n'));
