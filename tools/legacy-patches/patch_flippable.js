const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

const flippableCode = `
const FlippableExerciseCard = ({ 
  item, 
  imageUri, 
  stats, 
  chartLabels, 
  chartData, 
  levelData, 
  borderColor,
  collectionType,
  screenWidth,
  styles
}: any) => {
  const [flipped, setFlipped] = React.useState(false);
  const flipAnim = React.useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 180,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg']
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg']
  });

  return (
    <TouchableOpacity activeOpacity={1} onPress={flipCard} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      
      {/* FRONT */}
      <Animated.View style={[
        styles.cardFull, 
        { borderColor: borderColor, borderWidth: 8, backgroundColor: '#1A1A1A', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: frontInterpolate }] }
      ]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8 }}>
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>{item.name}</Text>
          <View style={{ backgroundColor: borderColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>LVL {levelData.level}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 12, flex: 1, paddingBottom: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#000', borderWidth: 3, borderColor: '#555', borderRadius: 6, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 }}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
                <MaterialCommunityIcons name="camera-plus" size={48} color="#555" />
              </View>
            )}
          </View>
        </View>
        
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' }}>
          {collectionType === 'Exercises' && (
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.pr}kg</Text>
                <Text style={styles.cardStatLabel}>PR</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.totalSets}</Text>
                <Text style={styles.cardStatLabel}>SETS</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.totalReps}</Text>
                <Text style={styles.cardStatLabel}>REPS</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.totalVolume}</Text>
                <Text style={styles.cardStatLabel}>VOL</Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#DDD" style={{ marginRight: 6 }} />
            <Text style={{ color: '#DDD', fontSize: 14 }}>Tap to Flip for Chart</Text>
          </View>
        </View>
      </Animated.View>

      {/* BACK */}
      <Animated.View style={[
        styles.cardFull, 
        { borderColor: borderColor, borderWidth: 8, backgroundColor: '#1A1A1A', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: backInterpolate }] }
      ]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333' }}>
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>{item.name} - Stats</Text>
        </View>

        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          {collectionType === 'Exercises' && chartData.length > 1 ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12, alignSelf: 'flex-start' }}>Weight Progression</Text>
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartData }]
                }}
                width={screenWidth - 100}
                height={200}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#1A1A1A',
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientTo: '#1A1A1A',
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 0,
                  color: (opacity = 1) => \`rgba(255, 255, 255, \${opacity})\`,
                  labelColor: (opacity = 1) => \`rgba(255, 255, 255, \${opacity})\`,
                  propsForDots: { r: '4', strokeWidth: '2', stroke: borderColor }
                }}
                bezier
                style={{ borderRadius: 8 }}
                withHorizontalLines={false}
                withVerticalLines={false}
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="chart-line-variant" size={40} color="#555" />
              <Text style={{ color: '#888', marginTop: 12, textAlign: 'center' }}>No history found to generate chart.</Text>
            </View>
          )}
        </View>
      </Animated.View>

    </TouchableOpacity>
  );
};
`;

if (!c.includes('FlippableExerciseCard =')) {
  c = c.replace(/export default function StatsScreen/, flippableCode + '\nexport default function StatsScreen');
}

fs.writeFileSync(p, c);
console.log('Added component');
