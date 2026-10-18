const fs = require('fs');

let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

// 1. Add State
const stateToAdd = `
  const [onlineSearchVisible, setOnlineSearchVisible] = useState(false);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [onlineSearchResults, setOnlineSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOnlineFood, setSelectedOnlineFood] = useState<any>(null);
  const [onlineFoodPortion, setOnlineFoodPortion] = useState('100');
  
  const searchOnlineFood = async () => {
    if (!onlineSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(\`https://world.openfoodfacts.org/cgi/search.pl?search_terms=\${encodeURIComponent(onlineSearchQuery)}&search_simple=1&action=process&json=1&page_size=30\`);
      const data = await res.json();
      if (data && data.products) {
        // filter products that have a name and some basic macros
        const validProducts = data.products.filter((p: any) => 
          p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] !== undefined || p.nutriments.energy_100g !== undefined)
        );
        setOnlineSearchResults(validProducts);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to search online database.');
    } finally {
      setIsSearching(false);
    }
  };
`;

code = code.replace(
  "const [globalTargetsEditorVisible, setGlobalTargetsEditorVisible] = useState(false);",
  "const [globalTargetsEditorVisible, setGlobalTargetsEditorVisible] = useState(false);\n" + stateToAdd
);

// 2. Add Search button to Global Actions
const newGlobalActions = `      {/* Global Actions */}
      <View style={[styles.managerRow, { marginHorizontal: -4 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setQuickScanModalVisible(true)}>
          <MaterialCommunityIcons name="barcode-scan" size={20} color="#00D2FF" />
          <Text style={styles.actionBtnText}>EAN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setOnlineSearchVisible(true)}>
          <MaterialCommunityIcons name="magnify" size={20} color="#FFD60A" />
          <Text style={styles.actionBtnText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setHistoryModalVisible(true)}>
          <MaterialCommunityIcons name="history" size={20} color="#BF5AF2" />
          <Text style={styles.actionBtnText}>History</Text>
        </TouchableOpacity>
      </View>`;

code = code.replace(
  /\{\/\* Global Actions \*\/\}.*?\{\/\* Logged Meals \*\/\}/s,
  newGlobalActions + "\n\n      {/* Logged Meals */}"
);

// 3. Modals
const onlineSearchModal = `
      {/* ONLINE SEARCH MODAL */}
      <Modal visible={onlineSearchVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Database</Text>
            <TouchableOpacity onPress={() => setOnlineSearchVisible(false)}><MaterialCommunityIcons name="close" size={28} color="#FFF" /></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.textInputFull, { flex: 1, marginTop: 0, marginHorizontal: 0 }]}
                placeholder="Search e.g. Döner, Pizza..."
                placeholderTextColor="#666"
                value={onlineSearchQuery}
                onChangeText={setOnlineSearchQuery}
                onSubmitEditing={searchOnlineFood}
                returnKeyType="search"
                autoFocus
              />
              <TouchableOpacity 
                style={{ backgroundColor: '#00D2FF', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 }}
                onPress={searchOnlineFood}
                disabled={isSearching}
              >
                <Text style={{ color: '#000', fontWeight: '800' }}>{isSearching ? '...' : 'Go'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            {onlineSearchResults.map((prod, idx) => {
              const kcal = Math.round(prod.nutriments['energy-kcal_100g'] || (prod.nutriments.energy_100g ? prod.nutriments.energy_100g / 4.184 : 0));
              const pro = Math.round(prod.nutriments.proteins_100g || 0);
              const car = Math.round(prod.nutriments.carbohydrates_100g || 0);
              const fat = Math.round(prod.nutriments.fat_100g || 0);
              
              return (
                <View key={prod.id || idx} style={styles.poolItem}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.poolName}>{prod.product_name}</Text>
                    {prod.brands ? <Text style={{ color: '#666', fontSize: 12 }}>{prod.brands}</Text> : null}
                    <Text style={styles.poolMacros}>Per 100g: {kcal}kcal • {pro}P • {car}C • {fat}F</Text>
                  </View>
                  <TouchableOpacity style={styles.logPill} onPress={() => {
                    setSelectedOnlineFood({ ...prod, parsedKcal: kcal, parsedPro: pro, parsedCar: car, parsedFat: fat });
                    setOnlineFoodPortion('100');
                    setOnlineSearchVisible(false); // Close the search
                  }}>
                    <Text style={styles.logPillText}>Select</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {onlineSearchResults.length === 0 && !isSearching && onlineSearchQuery.length > 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No results or press Go.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ONLINE FOOD PORTION MODAL */}
      <SwipeableModal visible={!!selectedOnlineFood} onClose={() => setSelectedOnlineFood(null)}>
        {selectedOnlineFood && (
          <View>
            <Text style={styles.modalTitle}>Log {selectedOnlineFood.product_name}</Text>
            <Text style={{ color: '#888', marginBottom: 16 }}>How many grams did you consume? (Standard portion for e.g. Döner is ~350g, Pizza ~400g)</Text>
            <TextInput 
              style={{ backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' }}
              keyboardType="numeric"
              value={onlineFoodPortion}
              onChangeText={setOnlineFoodPortion}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
               {['100', '250', '350', '400', '500'].map(p => (
                 <TouchableOpacity key={p} style={{ backgroundColor: '#1E1E1E', padding: 10, borderRadius: 8 }} onPress={() => setOnlineFoodPortion(p)}>
                   <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>{p}g</Text>
                 </TouchableOpacity>
               ))}
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                const amount = parseFloat(onlineFoodPortion) || 0;
                if (amount > 0) {
                  const factor = amount / 100;
                  // Add as an ingredient to their pool as well so they can reuse it
                  const newIng = {
                    id: Date.now().toString(),
                    name: selectedOnlineFood.product_name,
                    baseAmount: 100,
                    calories: selectedOnlineFood.parsedKcal,
                    protein: selectedOnlineFood.parsedPro,
                    carbs: selectedOnlineFood.parsedCar,
                    fat: selectedOnlineFood.parsedFat
                  };
                  addIngredient(newIng);
                  
                  addLoggedMeal({
                    name: selectedOnlineFood.product_name,
                    ingredients: [{ ingredient: newIng, amount }],
                    calories: selectedOnlineFood.parsedKcal * factor, 
                    protein: selectedOnlineFood.parsedPro * factor, 
                    carbs: selectedOnlineFood.parsedCar * factor, 
                    fat: selectedOnlineFood.parsedFat * factor 
                  });
                  triggerSuccess();
                }
                setSelectedOnlineFood(null);
              }}
            >
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>Log {Math.round((parseFloat(onlineFoodPortion)||0)/100 * selectedOnlineFood.parsedKcal)} kcal</Text>
            </TouchableOpacity>
          </View>
        )}
      </SwipeableModal>
`;

code = code.replace(
  "      <BarcodeScannerModal \n        visible={barcodeModalVisible}",
  onlineSearchModal + "\n      <BarcodeScannerModal \n        visible={barcodeModalVisible}"
);

code = code.replace(
  "actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' , marginBottom: 12 },",
  "actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333' , marginHorizontal: 4, marginBottom: 12 },"
);

fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
console.log('Patched successfully!');
