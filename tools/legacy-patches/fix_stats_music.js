const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

const oldMusicBtn = `              
      <TouchableOpacity style={styles.collectionBtn} onPress={() => setMusicStatsModalVisible(true)}>
        <MaterialCommunityIcons name="music-box-multiple" size={28} color="#FFD60A" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Music Stats</Text>
          <Text style={styles.collectionBtnSub}>Your Top Tracks</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>
</ScrollView>`;

code = code.replace(oldMusicBtn, "\n</ScrollView>");

const insertTarget = `      <TouchableOpacity style={styles.collectionBtn} onPress={() => navigation.navigate('StretchingLibrary')}>
        <MaterialCommunityIcons name="yoga" size={28} color="#FF9500" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Stretching Library</Text>
          <Text style={styles.collectionBtnSub}>View Rehab Hero Exercises</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>`;

const newMusicBtn = `\n      <TouchableOpacity style={styles.collectionBtn} onPress={() => setMusicStatsModalVisible(true)}>
        <MaterialCommunityIcons name="music-box-multiple" size={28} color="#FFD60A" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Music Stats</Text>
          <Text style={styles.collectionBtnSub}>Your Top Tracks</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>`;

code = code.replace(insertTarget, insertTarget + newMusicBtn);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
console.log("Fixed Music Stats Button position");
