const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// Import streak engine
code = code.replace(
  "import SwipeableModal from '../components/SwipeableModal';",
  "import SwipeableModal from '../components/SwipeableModal';\nimport { calculateStreaks } from '../utils/streakEngine';"
);

// Add nutritionHistory to store destructure
code = code.replace(
  "    setLiveWorkoutToStart,\n    addIngredient,\n  } = useAppStore();",
  "    setLiveWorkoutToStart,\n    addIngredient,\n    nutritionHistory,\n  } = useAppStore();"
);

// Delete old calculateWorkoutStreak function block completely (it is around line 125-165)
// Let's use a regex to delete it safely.
code = code.replace(/\/\/ INTELLIGENT STREAK ENGINE:[\s\S]*?(?=const handleSaveWeight)/, '');

// Replace old destructured streak logic
const targetLogic = `  const { streak, statusMsg, badgeLabel, workedOutToday } = calculateWorkoutStreak();`;
const replacementLogic = `  const streaks = calculateStreaks(workoutHistory, programs, nutritionHistory, consumedToday, targets);
  const workedOutToday = streaks.workedOutToday;`;
code = code.replace(targetLogic, replacementLogic);

// Replace old UI
const uiTarget = `      {/* Workout Streak Banner */}
      <View style={styles.streakCard}>
        <View style={styles.streakLeftCol}>
          <View style={[styles.streakFlameCircle, workedOutToday && styles.streakFlameCircleActive]}>
            <MaterialCommunityIcons 
              name="fire" 
              size={30} 
              color={workedOutToday ? "#FF3B30" : streak > 0 ? "#FF9500" : "#666666"} 
            />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakTitle}> DAY STREAK</Text>
              <View style={[styles.streakStatusBadge, workedOutToday && styles.streakStatusBadgeDone]}>
                <Text style={[styles.streakStatusBadgeText, workedOutToday && { color: '#30D158' }]}>
                  {badgeLabel || "Pending"}
                </Text>
              </View>
            </View>
            <Text style={styles.streakSubtitle}>{statusMsg}</Text>
          </View>
        </View>
      </View>`;

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

code = code.replace(uiTarget, uiReplacement);

// Append styles for new streak
const styleAppend = `
  unifiedStreakCard: { backgroundColor: '#1E1E20', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#333' },
  masterStreakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  masterStreakNum: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  masterStreakTitle: { color: '#FFD60A', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  masterBadge: { backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  masterBadgeActive: { backgroundColor: '#FFD60A' },
  masterBadgeText: { color: '#888', fontSize: 10, fontWeight: '800' },
  subStreaksRow: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 12, padding: 12 },
  subStreak: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  subStreakDivider: { width: 1, backgroundColor: '#333', marginHorizontal: 10 },
  subStreakVal: { color: '#FFF', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  subStreakLabel: { color: '#888', fontSize: 12, fontWeight: '600' }
});`;

const lastIndex = code.lastIndexOf('});');
code = code.substring(0, lastIndex) + styleAppend + code.substring(lastIndex + 3);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
