const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

if (!code.includes('Linking')) {
  code = code.replace(
    `Vibration 
} from 'react-native';`,
    `Vibration,
  Linking
} from 'react-native';`
  );
}

const target = `<View style={styles.headerIconBadge}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
        </View>`;

const replacement = `<View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.headerIconBadge, { backgroundColor: '#FF000020', marginRight: 8 }]} 
            onPress={() => Linking.openURL('https://music.youtube.com').catch(() => {})}
          >
            <MaterialCommunityIcons name="youtube" size={20} color="#FF0000" />
          </TouchableOpacity>
          <View style={styles.headerIconBadge}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
          </View>
        </View>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/screens/HomeScreen.tsx', code);
