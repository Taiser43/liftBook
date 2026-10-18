const fs = require('fs');
let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

// Add history modal state
const stateTarget = `  // Nutrition Builder`;
const stateReplacement = `  // Nutrition History
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [quickScanModalVisible, setQuickScanModalVisible] = useState(false);

  // Nutrition Builder`;
code = code.replace(stateTarget, stateReplacement);

// Destructure nutritionHistory
const storeTarget = `    deleteIngredient
  } = useAppStore();`;
const storeReplacement = `    deleteIngredient,
    nutritionHistory
  } = useAppStore();`;
code = code.replace(storeTarget, storeReplacement);

// Inject buttons above "Today's Log"
const logTitleTarget = `      {/* Logged Meals */}
      <Text style={styles.subtitle}>Today's Log</Text>`;
const logTitleReplacement = `      {/* Global Actions */}
      <View style={styles.managerRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setQuickScanModalVisible(true)}>
          <MaterialCommunityIcons name="barcode-scan" size={20} color="#00D2FF" />
          <Text style={styles.actionBtnText}>Log EAN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setHistoryModalVisible(true)}>
          <MaterialCommunityIcons name="history" size={20} color="#BF5AF2" />
          <Text style={styles.actionBtnText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Logged Meals */}
      <Text style={styles.subtitle}>Today's Log</Text>`;
code = code.replace(logTitleTarget, logTitleReplacement);

// Add quick log logic and History Modal
const modalTarget = `      <BarcodeScannerModal 
        visible={barcodeModalVisible} 
        onClose={() => setBarcodeModalVisible(false)} 
        onIngredientFound={handleIngredientFound} 
      />
    </View>
  );
}`;
const modalReplacement = `      <BarcodeScannerModal 
        visible={barcodeModalVisible} 
        onClose={() => setBarcodeModalVisible(false)} 
        onIngredientFound={handleIngredientFound} 
      />

      <BarcodeScannerModal 
        visible={quickScanModalVisible} 
        onClose={() => setQuickScanModalVisible(false)} 
        onIngredientFound={(ing) => {
          // Add to pool so they don't have to scan it again next time
          addIngredient(ing);
          setQuickScanModalVisible(false);
          
          // Now prompt for amount!
          Alert.prompt(
            \`Log \${ing.name}\`,
            \`Enter grams/ml consumed:\`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Log", onPress: (val) => {
                  const amount = parseFloat(val || '0') || 0;
                  if (amount > 0) {
                    addLoggedMeal({
                      name: ing.name,
                      ingredients: [{ ingredient: ing, amount }],
                      calories: 0, protein: 0, carbs: 0, fat: 0 // Will auto calculate
                    });
                  }
                } 
              }
            ],
            'plain-text',
            '100',
            'numeric'
          );
        }} 
      />

      {/* HISTORY MODAL */}
      <Modal visible={historyModalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nutrition History</Text>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {nutritionHistory.length === 0 ? (
              <Text style={styles.emptyText}>No history available yet. Hit "Start New Day" at the end of the day to log today's result!</Text>
            ) : (
              [...nutritionHistory].reverse().map((day, idx) => (
                <View key={idx} style={[styles.poolItem, { borderColor: day.hitGoal ? '#30D158' : '#FF453A' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.poolName, { color: day.hitGoal ? '#30D158' : '#FF453A' }]}>
                      {day.date} {day.hitGoal ? '🎯 Goal Met' : '❌ Missed'}
                    </Text>
                    <Text style={styles.poolMacros}>{day.calories} kcal • {day.protein}g P • {day.carbs}g C • {day.fat}g F</Text>
                    <Text style={styles.poolSub}>{day.meals.length} Meals Logged</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}`;
code = code.replace(modalTarget, modalReplacement);

fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
