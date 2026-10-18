const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /import \{ MaterialCommunityIcons, Ionicons \} from '@expo\/vector-icons';/,
  "import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';\nimport { AdminPanelModal } from '../components/AdminPanelModal';"
);

c = c.replace(
  /const streaks = calculateStreaks\(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets\);/,
  "const [adminModalVisible, setAdminModalVisible] = useState(false);\n  const adminStreakOverride = useAppStore(state => state.adminStreakOverride);\n  const _streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);\n  const streaks = adminStreakOverride !== null ? { ..._streaks, overall: adminStreakOverride } : _streaks;"
);

c = c.replace(
  /<TouchableOpacity style=\{\{ padding: 8, backgroundColor: '#333', borderRadius: 8 \}\}>\n\s*<MaterialCommunityIcons name="store" size=\{20\} color="#FFD700" \/>\n\s*<\/TouchableOpacity>/,
  "<View style={{ flexDirection: 'row', gap: 8 }}>\n        <TouchableOpacity onPress={() => setAdminModalVisible(true)} style={{ padding: 8, backgroundColor: '#333', borderRadius: 8 }}>\n          <MaterialCommunityIcons name=\"shield-account\" size={20} color=\"#00D2FF\" />\n        </TouchableOpacity>\n        <TouchableOpacity style={{ padding: 8, backgroundColor: '#333', borderRadius: 8 }}>\n          <MaterialCommunityIcons name=\"store\" size={20} color=\"#FFD700\" />\n        </TouchableOpacity>\n      </View>"
);

c = c.replace(
  /<\/ScrollView>/,
  "</ScrollView>\n      <AdminPanelModal visible={adminModalVisible} onClose={() => setAdminModalVisible(false)} />"
);

fs.writeFileSync(p, c);
console.log('Integrated AdminPanelModal into StatsScreen');
