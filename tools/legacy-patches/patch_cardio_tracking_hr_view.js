const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `            <Text style={styles.metricValue}>
              {currentHR > 0 ? (
                <>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <MaterialCommunityIcons name="heart" color="#FF3B30" size={22} />
                  </Animated.View>
                  {' '}{currentHR}
                </>
              ) : '--'}
            </Text>`,
  `            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {currentHR > 0 ? (
                <>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <MaterialCommunityIcons name="heart" color="#FF3B30" size={22} />
                  </Animated.View>
                  <Text style={styles.metricValue}>{' '}{currentHR}</Text>
                </>
              ) : <Text style={styles.metricValue}>--</Text>}
            </View>`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
