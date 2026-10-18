const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

// 1. Add global cardio hooks after workout hooks
code = code.replace(
  `  const setGlobalActivePlan = useAppStore(state => state.setGlobalActivePlan);`,
  `  const setGlobalActivePlan = useAppStore(state => state.setGlobalActivePlan);

  // Global Cardio Mini-Player
  const globalCardioActive = useAppStore(state => state.globalCardioActive);
  const globalCardioDuration = useAppStore(state => state.globalCardioDuration);
  const globalCardioDistance = useAppStore(state => state.globalCardioDistance);
  const globalCardioSpeed = useAppStore(state => state.globalCardioSpeed);
  const setGlobalCardioSession = useAppStore(state => state.setGlobalCardioSession);`
);

// 2. Add cardio mini-player BELOW the workout mini-player block (before closing </View>)
code = code.replace(
  `    </View>
  );
}

const styles = StyleSheet.create({`,
  `      {/* GLOBAL MINIMIZED CARDIO PLAYER */}
      {globalCardioActive && (
        <TouchableOpacity
          style={[styles.miniPlayerContainer, { borderColor: '#30D158' }]}
          activeOpacity={0.9}
          onPress={() => {
            if (navigationRef.isReady()) {
              (navigationRef as any).navigate('CardioTracking');
            }
          }}
        >
          <View style={styles.miniPlayerContent}>
            <View style={styles.miniPlayerLeft}>
              <View style={[styles.miniPlayerIconBg, { backgroundColor: '#0A2A0A' }]}>
                <MaterialCommunityIcons name="run-fast" size={20} color="#30D158" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.pulsingDot, { width: 6, height: 6, borderRadius: 3, marginRight: 4, backgroundColor: '#30D158' }]} />
                  <Text style={[styles.miniPlayerTitle, { color: '#30D158' }]}>Cardio Active</Text>
                </View>
                <Text style={styles.miniPlayerTime}>
                  {Math.floor(globalCardioDuration / 60)}:{globalCardioDuration % 60 < 10 ? '0' : ''}{globalCardioDuration % 60}
                  {'  ·  '}
                  {(globalCardioDistance / 1000).toFixed(2)} km
                  {'  ·  '}
                  {globalCardioSpeed.toFixed(1)} km/h
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-up" size={24} color="#888" />
          </View>
        </TouchableOpacity>
      )}

    </View>
  );
}

const styles = StyleSheet.create({`
);

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
