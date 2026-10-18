const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

const startStr = '{(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => (';
const endStr = '))}\n      </View>';

const startIndex = c.indexOf(startStr);
const endIndex = c.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newCode = `{(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => {
          let tierColor = '#CD7F32'; // Bronze
          if (ach.tier === 'II') tierColor = '#C0C0C0';
          if (ach.tier === 'III') tierColor = '#FFD700';
          if (ach.tier === 'IV') tierColor = '#50C878';
          if (ach.tier === 'V') tierColor = '#E51400';
          if (ach.tier === 'Locked') tierColor = '#333333';

          const isCompleted = ach.tier !== 'Locked';
          const progressPercent = ach.max > 0 ? (ach.progress / ach.max) * 100 : 0;

          return (
          <View key={ach.id} style={[styles.achievementBadge, { borderColor: isCompleted ? tierColor : '#333', backgroundColor: '#161618' }]}>
            <EmblemIcon icon={isCompleted ? (ach.icon || 'trophy') : 'lock'} color={tierColor} size={56} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.achTitle, { color: isCompleted ? tierColor : '#FFF' }]}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.description}</Text>
              <View style={styles.achProgressBg}>
                <View style={[styles.achProgressFill, { width: \`\${Math.min(100, progressPercent)}%\`, backgroundColor: isCompleted ? tierColor : '#00D2FF' }]} />
              </View>
            </View>
          </View>
        )
        })}`;
        
  c = c.substring(0, startIndex) + newCode + c.substring(endIndex + 3);
  fs.writeFileSync(p, c);
  console.log('Successfully replaced achievements block');
} else {
  console.log('Could not find start or end index', startIndex, endIndex);
}
