const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// I will just replace everything from `      {/* 4 CLASSES */}` to the end of tabs with a clean reconstruction.
const startMarker = `      {/* 4 CLASSES */}`;
const endMarker = `      <Text style={[styles.subtitle, { marginTop: 24 }]}>History Trends</Text>`;

const i1 = c.indexOf(startMarker);
const i2 = c.indexOf(endMarker);

if (i1 !== -1 && i2 !== -1) {
  const replacement = `      {/* 4 CLASSES */}
      <Text style={[styles.subtitle, { marginTop: 0 }]}>Hero Archetypes</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
        {[
          { name: 'Juggernaut', xp: juggernautXP },
          { name: 'Aesthetic', xp: aestheticXP },
          { name: 'Ranger', xp: rangerXP },
          { name: 'Monk', xp: monkXP }
        ].map(cls => {
          const lData = getLevelData(cls.xp);
          return (
            <TouchableOpacity key={cls.name} onPress={() => setDetailNode({ type: 'class', name: cls.name, xp: cls.xp })} style={{ width: '48%', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12, alignItems: 'center' }}>
              <HeroClassIcon className={cls.name as any} tierColor={lData.rankColor} size={64} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginTop: 8 }}>{cls.name}</Text>
              <Text style={{ color: lData.rankColor, fontSize: 12, fontWeight: 'bold' }}>Lv {lData.level}</Text>
              <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, width: '100%' }}>
                <View style={{ height: 4, backgroundColor: lData.rankColor, borderRadius: 2, width: \`\${Math.min(100, (lData.progressXP / lData.neededXP) * 100)}%\` }} />
              </View>
              <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{Math.round(cls.xp)} XP</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ACHIEVEMENTS SECTION (Moved to Dashboard) */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.subtitle}>Achievements</Text>
        <TouchableOpacity onPress={() => setAchievementsExpanded(!achievementsExpanded)}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>{achievementsExpanded ? 'Show Less' : 'Show All'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.achievementsGrid}>
        {(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => {
          const isCompleted = ach.tier !== 'Locked';
          const tierColor = ach.tierColor;
          const progressPercent = ach.max > 0 ? (ach.progress / ach.max) * 100 : 0;

          return (
          <TouchableOpacity key={ach.id} onPress={() => setDetailNode({ type: 'achievement', name: ach.title, xp: ach.progress, thresholds: (ach as any).thresholds, desc: ach.description })} style={[styles.achievementBadge, { borderColor: isCompleted ? tierColor : '#333', backgroundColor: '#161618' }]}>
            <EmblemIcon icon={isCompleted ? (ach.icon || 'trophy') : 'lock'} color={isCompleted ? tierColor : '#333'} size={56} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.achTitle, { color: isCompleted ? tierColor : '#FFF' }]}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.description}</Text>
              <View style={styles.achProgressBg}>
                <View style={[styles.achProgressFill, { width: \`\${Math.min(100, progressPercent)}%\`, backgroundColor: isCompleted ? tierColor : '#00D2FF' }]} />
              </View>
            </View>
          </TouchableOpacity>
        )
        })}
      </View>
      </>)}

      {activeTab === 'Quests' && (<>
      {/* QUESTS SECTION */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.subtitle}>Bounty Board</Text>
        <TouchableOpacity onPress={generateQuests}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: '#888', marginBottom: 8 }}>Free Rerolls: {freeRerollsLeft} (Costs 20 🪙 after)</Text>
      <View style={{ gap: 8, marginBottom: 24 }}>
        {[...(quests?.daily || []), ...(quests?.weekly || [])].map(q => (
          <View key={q.id} style={{ backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: q.completed ? '#30D158' : '#333' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: q.completed ? '#30D158' : '#FFF', fontWeight: 'bold' }}>
                  {q.title} <Text style={{ color: '#888', fontSize: 10 }}>({q.type.toUpperCase()})</Text>
                </Text>
                <Text style={{ color: '#888', fontSize: 12 }}>{q.description}</Text>
                <Text style={{ color: '#00D2FF', fontSize: 12, marginTop: 4 }}>Reward: {q.rewardCoins} 🪙 | {q.rewardXP} XP</Text>
                <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, width: '80%' }}>
                  <View style={{ height: 4, backgroundColor: q.completed ? '#30D158' : '#00D2FF', borderRadius: 2, width: \`\${Math.min(100, (q.progress / q.goal) * 100)}%\` }} />
                </View>
              </View>
              {!q.completed && (
                <TouchableOpacity style={{ padding: 8, backgroundColor: '#333', borderRadius: 8 }} onPress={() => rerollQuest(q.id, q.type)}>
                  <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
      </>)}

      {activeTab === 'Legacy' && (<>
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 40, fontStyle: 'italic' }}>Legacy collections and vault items will appear here.</Text>
      </>)}

`;
  
  c = c.substring(0, i1) + replacement + c.substring(i2);
  fs.writeFileSync(p, c);
  console.log('Fixed tabs cleanly');
}
