const fs = require('fs');

let code = fs.readFileSync('src/screens/CardioSessionDetailScreen.tsx', 'utf8');

code = code.replace(
  /          <\/View>\n        \)}\n\n        <View style=\{\{ marginTop: 30 \}\}>/,
  `          </View>
        )}

        {isStepSport && (
          <View style={styles.gridRow}>
            <TouchableOpacity style={[styles.gridBox, styles.gridBoxTranslucent]} onPress={() => setStepMode(p => p === 'steps' ? 'km' : 'steps')}>
              <Text style={styles.gridLabel}>{stepMode === 'steps' ? 'Steps' : 'Distance'}</Text>
              <Text style={[styles.gridValue, { color: '#30D158' }]}>
                {stepMode === 'steps' ? Math.round(session.distanceMeters / 0.762) : (session.distanceMeters / 1000).toFixed(2)} <Text style={{fontSize: 14}}>{stepMode === 'steps' ? '' : 'km'}</Text>
              </Text>
            </TouchableOpacity>
            <View style={[styles.gridBox, { backgroundColor: 'transparent' }]} />
          </View>
        )}

        <View style={{ marginTop: 30 }}>`
);

fs.writeFileSync('src/screens/CardioSessionDetailScreen.tsx', code);
