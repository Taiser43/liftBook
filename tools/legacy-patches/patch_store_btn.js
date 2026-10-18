const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<Text style=\{styles\.title\}>Player Profile<\/Text>/,
  `<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={styles.title}>Player Profile</Text>
      <TouchableOpacity style={{ padding: 8, backgroundColor: '#333', borderRadius: 8 }}>
        <MaterialCommunityIcons name="store" size={20} color="#FFD700" />
      </TouchableOpacity>
    </View>`
);

fs.writeFileSync(p, c);
console.log('Added Store button');
