const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
const c = fs.readFileSync(p, 'utf8').split('\\n');

const newComponent = `const FlippableExerciseCard = ({ 
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
  const recipe = item.recipeData;
  const [portions, setPortions] = React.useState(recipe?.totalServings || 1);
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

  // Calculate dynamic macros
  const displayKcal = recipe ? (recipe.calories / (recipe.totalServings || 1)) * portions : 0;
  const displayPro = recipe ? (recipe.protein / (recipe.totalServings || 1)) * portions : 0;
  const displayCarb = recipe ? (recipe.carbs / (recipe.totalServings || 1)) * portions : 0;
  const displayFat = recipe ? (recipe.fat / (recipe.totalServings || 1)) * portions : 0;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity activeOpacity={1} onPress={flipCard} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* FRONT */}
        <Animated.View style={[
          styles.cardFull, 
          { borderColor: borderColor, borderWidth: 8, backgroundColor: '#1A1A1A', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: frontInterpolate }] }
        ]} pointerEvents={flipped ? 'none' : 'auto'}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8 }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>{item.name}</Text>
            <View style={{ backgroundColor: borderColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>{collectionType === 'Recipes' ? 'MEAL' : \`LVL \${levelData.level}\`}</Text>
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
            {collectionType === 'Recipes' && recipe && (
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{Math.round(displayKcal)}</Text>
                  <Text style={styles.cardStatLabel}>KCAL</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: '#00D2FF', fontSize: 18 }]}>{Math.round(displayPro)}g</Text>
                  <Text style={styles.cardStatLabel}>PRO</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: '#FFD700', fontSize: 18 }]}>{Math.round(displayCarb)}g</Text>
                  <Text style={styles.cardStatLabel}>CARB</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: '#FF3B30', fontSize: 18 }]}>{Math.round(displayFat)}g</Text>
                  <Text style={styles.cardStatLabel}>FAT</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#DDD" style={{ marginRight: 6 }} />
              <Text style={{ color: '#DDD', fontSize: 14 }}>{collectionType === 'Recipes' ? 'Tap for Ingredients' : 'Tap for Chart'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[
          styles.cardFull, 
          { borderColor: borderColor, borderWidth: 8, backgroundColor: '#1A1A1A', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: backInterpolate }] }
        ]} pointerEvents={flipped ? 'auto' : 'none'}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333' }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>
              {collectionType === 'Recipes' ? 'Ingredients' : 'Weight Progression'}
            </Text>
          </View>

          <View style={{ flex: 1, padding: 16 }}>
            {collectionType === 'Exercises' && (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                {chartData.length > 0 ? (
                  <View style={{ alignItems: 'center' }}>
                    <LineChart
                      data={{
                        labels: chartLabels.length === 1 ? [chartLabels[0], chartLabels[0]] : chartLabels,
                        datasets: [{ data: chartData.length === 1 ? [chartData[0], chartData[0]] : chartData }]
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
            )}

            {collectionType === 'Recipes' && recipe && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Portions</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 20 }}>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setPortions(Math.max(1, portions - 1)); }} style={{ padding: 8, paddingHorizontal: 12 }}>
                      <MaterialCommunityIcons name="minus" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginHorizontal: 8, minWidth: 20, textAlign: 'center' }}>{portions}</Text>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setPortions(portions + 1); }} style={{ padding: 8, paddingHorizontal: 12 }}>
                      <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {recipe.ingredients && recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((ing: any, i: number) => {
                      const amount = (ing.amount / (recipe.totalServings || 1)) * portions;
                      return (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#252528' }}>
                          <Text style={{ color: '#FFF', fontSize: 14, flex: 1, paddingRight: 8 }} numberOfLines={2}>{ing.ingredient?.name || 'Unknown'}</Text>
                          <Text style={{ color: borderColor, fontSize: 14, fontWeight: '700' }}>
                            {Math.round(amount)} {ing.ingredient?.baseAmount === 100 ? 'g/ml' : 'pcs'}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No ingredients available.</Text>
                  )}
                </ScrollView>
              </View>
            )}

          </View>
        </Animated.View>

      </TouchableOpacity>
    </View>
  );
};
`;

const before = c.slice(0, 24).join('\\n'); // Lines 1 to 24 (index 0 to 23)
const after = c.slice(163).join('\\n'); // Line 164 onwards (index 163 onwards)

fs.writeFileSync(p, before + '\\n' + newComponent + '\\n\\n' + after);
console.log('Replaced FlippableExerciseCard correctly');
