const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('EmblemIcon')) {
  c = c.replace(
    /import \{ HeroClassIcon \} from '\.\.\/components\/HeroClassIcon';/,
    "import { HeroClassIcon } from '../components/HeroClassIcon';\nimport { EmblemIcon } from '../components/EmblemIcon';"
  );
  
  // The achievement rendering code:
  // <View style={styles.achTierCircle}><Text style={styles.achTierText}>...</Text></View>
  // We'll replace the whole row mapping.
  
  const oldCode = `        {(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => (
          <View key={ach.id} style={[styles.achievementBadge, { borderColor: ach.completed ? '#30D158' : '#333' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.achTitle, { color: ach.completed ? '#30D158' : '#FFF' }]}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.description}</Text>
              <View style={styles.achProgressBg}>
                <View style={[styles.achProgressFill, { width: \`\${Math.min(100, (ach.progress / ach.goal) * 100)}%\`, backgroundColor: ach.completed ? '#30D158' : '#00D2FF' }]} />
              </View>
            </View>
            <View style={styles.achTierCircle}>
              <Text style={[styles.achTierText, { color: ach.completed ? '#30D158' : '#888' }]}>{ach.tier}</Text>
            </View>
          </View>
        ))}`;
        
  const newCode = `        {(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => {
          let tierColor = '#CD7F32'; // Bronze
          if (ach.tier === 'II') tierColor = '#C0C0C0';
          if (ach.tier === 'III') tierColor = '#FFD700';
          if (ach.tier === 'IV') tierColor = '#50C878';
          if (ach.tier === 'V') tierColor = '#E51400';
          if (!ach.completed) tierColor = '#333333';

          return (
          <View key={ach.id} style={[styles.achievementBadge, { borderColor: ach.completed ? tierColor : '#333', backgroundColor: '#161618' }]}>
            <EmblemIcon icon={ach.completed ? 'trophy' : 'lock'} color={tierColor} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.achTitle, { color: ach.completed ? tierColor : '#FFF' }]}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.description}</Text>
              <View style={styles.achProgressBg}>
                <View style={[styles.achProgressFill, { width: \`\${Math.min(100, (ach.progress / ach.goal) * 100)}%\`, backgroundColor: ach.completed ? tierColor : '#00D2FF' }]} />
              </View>
            </View>
          </View>
        )
        })}`;
        
  // Need to be careful replacing this exact block.
  // We'll use a regex that matches from `{(achievementsExpanded` to `}))}`
  
  c = c.replace(/\{\(achievementsExpanded \? achievements : achievements\.slice\(0, 3\)\)\.map\(\(ach\) => \([\s\S]*?\}\)\)\}/, newCode);
  
  fs.writeFileSync(p, c);
  console.log('Patched achievements UI');
}
