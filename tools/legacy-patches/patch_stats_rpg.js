const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

// Imports
code = code.replace(
  `import { calculateStreaks } from '../utils/streakEngine';`,
  `import { calculateStreaks } from '../utils/streakEngine';
import { getLevelData, calculateAchievements } from '../utils/gamification';`
);

// Destructure from store
code = code.replace(
  `    targets
  } = useAppStore();`,
  `    targets,
    totalXP,
    unlockedAchievements
  } = useAppStore();`
);

// State for new Modals
code = code.replace(
  `  const [initialPage, setInitialPage] = useState(0);`,
  `  const [initialPage, setInitialPage] = useState(0);
  
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);`
);

// Compute Highlights -> Delete old highlights
const highlightsTarget = `  // --- Compute Highlights ---
  const totalWorkouts = workoutHistory.length;
  let heaviestWeight = 0;
  let heaviestExercise = '';
  const exerciseGlobalCounts: Record<string, number> = {};

  workoutHistory.forEach(w => {
    w.exercises.forEach(ex => {
      exerciseGlobalCounts[ex.name] = (exerciseGlobalCounts[ex.name] || 0) + 1;
      ex.sets.forEach(set => {
        if (set.weight && set.weight > heaviestWeight) {
          heaviestWeight = set.weight;
          heaviestExercise = ex.name;
        }
      });
    });
  });

  let favExercise = 'None';
  let maxCount = 0;
  Object.entries(exerciseGlobalCounts).forEach(([name, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favExercise = name;
    }
  });`;

const highlightsReplacement = `  // --- Compute RPG Data ---
  const levelData = getLevelData(totalXP || 0);
  const achievements = calculateAchievements(workoutHistory, nutritionHistory, unlockedAchievements || []);
  
  // Total Deep Stats (for modal)
  let totalWorkouts = workoutHistory.length;
  let totalReps = 0;
  let totalSets = 0;
  let totalVolume = 0;
  const muscleGroupsCount: Record<string, number> = {};
  
  workoutHistory.forEach(w => {
    w.exercises.forEach(ex => {
      totalSets += ex.sets.length;
      // Pre-fill muscle group if possible (simple heuristic)
      const baseEx = [...PRELOADED_EXERCISES, ...customExercises].find(e => e.name === ex.name);
      if (baseEx && baseEx.category) {
        muscleGroupsCount[baseEx.category] = (muscleGroupsCount[baseEx.category] || 0) + 1;
      }
      ex.sets.forEach(set => {
        totalReps += set.reps || 0;
        totalVolume += (set.reps || 0) * (set.weight || 0);
      });
    });
  });
  
  let topMuscle = 'None';
  let mCount = 0;
  Object.entries(muscleGroupsCount).forEach(([m, c]) => {
    if (c > mCount) {
      mCount = c;
      topMuscle = m;
    }
  });`;
code = code.replace(highlightsTarget, highlightsReplacement);

// Render logic replacement
// From `<View style={styles.topHeader}>` down to `Your Collection`
const renderRegex = /<Text style=\{styles\.greeting\}>Your Stats<\/Text>[\s\S]*?<Text style=\{styles\.subtitle\}>Your Collection<\/Text>/;

const newRender = `<Text style={styles.greeting}>Player Profile</Text>
        </View>
      </View>

      {/* PLAYER PROFILE CARD */}
      <TouchableOpacity 
        style={[styles.profileCard, { borderColor: levelData.rankColor }]} 
        activeOpacity={0.9}
        onPress={() => setProfileModalVisible(true)}
      >
        <View style={styles.profileHeader}>
          <View style={styles.rankBadge}>
            <MaterialCommunityIcons name="shield-star" size={32} color={levelData.rankColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.rankTitle, { color: levelData.rankColor }]}>{levelData.title}</Text>
            <Text style={styles.levelText}>Level {levelData.level}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.xpText}>{levelData.totalXP} XP</Text>
            <Text style={styles.xpSubtext}>Total Exp</Text>
          </View>
        </View>

        <View style={styles.xpBarContainer}>
          <View style={[styles.xpBarFill, { width: \`\${Math.min(100, (levelData.progressXP / levelData.neededXP) * 100)}%\`, backgroundColor: levelData.rankColor }]} />
        </View>
        <Text style={styles.xpToNext}>{levelData.neededXP - levelData.progressXP} XP to Level {levelData.level + 1}</Text>

        {/* Master Streak Widget Inside Profile */}
        <View style={styles.profileStreakWidget}>
          <View style={styles.profileStreakLeft}>
            <MaterialCommunityIcons name="crown" size={24} color="#FFD60A" />
            <Text style={styles.profileStreakNum}>{streaks.overall}</Text>
            <Text style={styles.profileStreakLabel}>Master Streak</Text>
          </View>
          <View style={{ width: 1, backgroundColor: '#333' }} />
          <View style={styles.profileStreakRight}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '800' }}>{streaks.maxTraining}</Text>
              <Text style={{ color: '#888', fontSize: 9 }}>Max Train</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#30D158', fontSize: 12, fontWeight: '800' }}>{streaks.maxNutrition}</Text>
              <Text style={{ color: '#888', fontSize: 9 }}>Max Nutri</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* ACHIEVEMENTS SECTION */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.subtitle}>Achievements</Text>
        <TouchableOpacity onPress={() => setAchievementsExpanded(!achievementsExpanded)}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>{achievementsExpanded ? 'Show Less' : 'Show All'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.achievementsGrid}>
        {(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => (
          <View key={ach.id} style={[styles.achievementBadge, { borderColor: ach.tierColor }]}>
            <MaterialCommunityIcons name={ach.icon as any} size={28} color={ach.tierColor} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.achTitle, { color: ach.tierColor }]}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.description}</Text>
              <View style={styles.achProgressBg}>
                <View style={[styles.achProgressFill, { width: \`\${Math.min(100, (ach.progress / ach.max) * 100)}%\`, backgroundColor: ach.tierColor }]} />
              </View>
            </View>
            <View style={styles.achTierCircle}>
              <Text style={[styles.achTierText, { color: ach.tierColor }]}>{ach.tier === 'Locked' ? '🔒' : ach.tier.charAt(0)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.subtitle, { marginTop: 24 }]}>Your Collection</Text>`;

code = code.replace(renderRegex, newRender);

// Add the Profile Modal to the bottom
const bottomRegex = /<\/ScrollView>\n\n    <\/View>\n  \);\n\}/;
const profileModal = `
      {/* DEEP STATS MODAL */}
      <Modal visible={profileModalVisible} animationType="slide" transparent>
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deep Stats</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16 }}>
              <View style={styles.deepStatBox}>
                <Text style={styles.deepStatVal}>{totalWorkouts}</Text>
                <Text style={styles.deepStatLabel}>Workouts</Text>
              </View>
              <View style={styles.deepStatBox}>
                <Text style={styles.deepStatVal}>{totalSets}</Text>
                <Text style={styles.deepStatLabel}>Total Sets</Text>
              </View>
              <View style={styles.deepStatBox}>
                <Text style={styles.deepStatVal}>{totalReps}</Text>
                <Text style={styles.deepStatLabel}>Total Reps</Text>
              </View>
              <View style={styles.deepStatBox}>
                <Text style={styles.deepStatVal}>{totalVolume > 1000 ? (totalVolume/1000).toFixed(1) + 'k' : totalVolume}</Text>
                <Text style={styles.deepStatLabel}>Vol (kg)</Text>
              </View>
              <View style={[styles.deepStatBox, { width: '100%', marginTop: 16 }]}>
                <Text style={[styles.deepStatVal, { color: '#BF5AF2' }]}>{topMuscle}</Text>
                <Text style={styles.deepStatLabel}>Most Hit Muscle Group</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
    </View>
  );
}`;

code = code.replace(bottomRegex, profileModal);

// Append styles
const styleAppend = `
  profileCard: { backgroundColor: '#1E1E20', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  rankTitle: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  levelText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 2 },
  xpText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  xpSubtext: { color: '#888', fontSize: 10, fontWeight: '700' },
  xpBarContainer: { height: 8, backgroundColor: '#333', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  xpToNext: { color: '#888', fontSize: 10, fontWeight: '700', textAlign: 'right', marginTop: 6 },
  
  profileStreakWidget: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 12, marginTop: 16, padding: 12, alignItems: 'center' },
  profileStreakLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  profileStreakNum: { color: '#FFF', fontSize: 20, fontWeight: '900', marginLeft: 8 },
  profileStreakLabel: { color: '#FFD60A', fontSize: 10, fontWeight: '800', marginLeft: 8, textTransform: 'uppercase' },
  profileStreakRight: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },

  achievementsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  achievementsGrid: { marginBottom: 8 },
  achievementBadge: { flexDirection: 'row', backgroundColor: '#1E1E20', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  achTitle: { fontSize: 14, fontWeight: '800' },
  achDesc: { color: '#888', fontSize: 11, marginTop: 2 },
  achProgressBg: { height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  achProgressFill: { height: '100%', borderRadius: 2 },
  achTierCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  achTierText: { fontSize: 16, fontWeight: '900' },

  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  profileModalContent: { backgroundColor: '#1E1E20', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  deepStatBox: { width: '48%', backgroundColor: '#121212', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  deepStatVal: { color: '#00D2FF', fontSize: 24, fontWeight: '900' },
  deepStatLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 4 }
});`;

const lastIndex = code.lastIndexOf('});');
code = code.substring(0, lastIndex) + styleAppend + code.substring(lastIndex + 3);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
