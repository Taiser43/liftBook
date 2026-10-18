const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Add activeTab state
if (!c.includes('activeTab')) {
  c = c.replace(
    /const \[profileModalVisible, setProfileModalVisible\] = useState\(false\);/,
    "const [profileModalVisible, setProfileModalVisible] = useState(false);\n  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Quests' | 'Legacy'>('Dashboard');"
  );
}

// 2. Add imports
if (!c.includes('StreakGlow')) {
  c = c.replace(
    /import \{ useBottomSpacing \} from '\.\.\/hooks\/useBottomSpacing';/,
    "import { useBottomSpacing } from '../hooks/useBottomSpacing';\nimport { StreakGlow } from '../components/StreakGlow';\nimport { HeroClassIcon } from '../components/HeroClassIcon';\nimport { getLevelData } from '../utils/gamification';"
  );
}

// 3. Tab Navigation UI
const tabUI = `
      {/* TABS */}
      <View style={{ flexDirection: 'row', backgroundColor: '#1E1E20', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {['Dashboard', 'Quests', 'Legacy'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === tab ? '#333' : 'transparent', borderRadius: 8 }}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={{ color: activeTab === tab ? '#FFF' : '#888', fontWeight: 'bold' }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
`;

c = c.replace(/<Text style=\{styles\.title\}>Player Profile<\/Text>/, '<Text style={styles.title}>Player Profile</Text>\n' + tabUI);

fs.writeFileSync(p, c);
console.log('Added tabs to StatsScreen');
