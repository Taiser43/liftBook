const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

const regex = /<Text style=\{styles\.title\}>Stats & Collections<\/Text>[\s\S]*?<Text style=\{styles\.subtitle\}>Your Collection<\/Text>/;

const newRender = `<Text style={styles.title}>Player Profile</Text>

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

code = code.replace(regex, newRender);
fs.writeFileSync('src/screens/StatsScreen.tsx', code);
