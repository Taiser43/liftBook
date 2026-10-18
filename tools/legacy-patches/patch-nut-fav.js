const fs = require('fs');
let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

const replacement = `
              const isFavorite = ingredients.some(ing => ing.name.toLowerCase() === prod.product_name.toLowerCase());
              return (
                <View key={prod.id || idx} style={styles.poolItem}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.poolName}>{prod.product_name}</Text>
                    {prod.brands ? <Text style={{ color: '#666', fontSize: 12 }}>{prod.brands}</Text> : null}
                    <Text style={styles.poolMacros}>Per 100g: {kcal}kcal • {pro}P • {car}C • {fat}F</Text>
                  </View>
                  <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={() => {
                    if (isFavorite) {
                      Alert.alert("Bereits gespeichert", "Dieses Lebensmittel ist bereits in deiner Zutatenliste.");
                    } else {
                      addIngredient({
                        id: Date.now().toString() + Math.random().toString(36).substring(7),
                        name: prod.product_name,
                        baseAmount: 100,
                        calories: kcal,
                        protein: pro,
                        carbs: car,
                        fat: fat,
                        usageCount: 0
                      });
                    }
                  }}>
                    <MaterialCommunityIcons name={isFavorite ? "star" : "star-outline"} size={26} color={isFavorite ? "#FFD60A" : "#888"} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.logPill} onPress={() => {
                    setSelectedOnlineFood({ ...prod, parsedKcal: kcal, parsedPro: pro, parsedCar: car, parsedFat: fat });
                    setOnlineFoodPortion('100');
                    setOnlineSearchVisible(false); // Close the search
                  }}>
                    <Text style={styles.logPillText}>Select</Text>
                  </TouchableOpacity>
                </View>
              );
`;

// use regex to replace from `return (` inside map up to `);` of map return
code = code.replace(/return \(\s*<View key=\{prod\.id \|\| idx\} style=\{styles\.poolItem\}>[\s\S]*?<\/View>\s*\);/, replacement.trim());

fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
