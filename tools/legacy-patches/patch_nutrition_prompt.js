const fs = require('fs');
let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

// Replace state
code = code.replace(
  `  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [quickScanModalVisible, setQuickScanModalVisible] = useState(false);`,
  `  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [quickScanModalVisible, setQuickScanModalVisible] = useState(false);
  const [scannedIngredient, setScannedIngredient] = useState<any>(null);
  const [portionGrams, setPortionGrams] = useState('100');`
);

// We need to import SwipeableModal if it isn't imported
if (!code.includes('import SwipeableModal')) {
  code = code.replace(
    `import BarcodeScannerModal from '../components/BarcodeScannerModal';`,
    `import BarcodeScannerModal from '../components/BarcodeScannerModal';\nimport SwipeableModal from '../components/SwipeableModal';`
  );
}

// Replace the quick scan logic
const targetLogic = `      <BarcodeScannerModal 
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
              { text: "Log", onPress: (val: string | undefined) => {
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
      />`;

const replacementLogic = `      <BarcodeScannerModal 
        visible={quickScanModalVisible} 
        onClose={() => setQuickScanModalVisible(false)} 
        onIngredientFound={(ing) => {
          addIngredient(ing);
          setQuickScanModalVisible(false);
          setScannedIngredient(ing);
          setPortionGrams('100');
        }} 
      />

      <SwipeableModal visible={!!scannedIngredient} onClose={() => setScannedIngredient(null)}>
        {scannedIngredient && (
          <View>
            <Text style={styles.modalTitle}>Log {scannedIngredient.name}</Text>
            <Text style={{ color: '#888', marginBottom: 16 }}>How many grams/ml did you consume?</Text>
            <TextInput 
              style={[styles.input, { fontSize: 24, textAlign: 'center', height: 70, fontWeight: '900' }]}
              keyboardType="numeric"
              value={portionGrams}
              onChangeText={setPortionGrams}
              autoFocus
            />
            <TouchableOpacity 
              style={[styles.saveBtn, { marginTop: 16, backgroundColor: '#30D158' }]}
              onPress={() => {
                const amount = parseFloat(portionGrams) || 0;
                if (amount > 0) {
                  addLoggedMeal({
                    name: scannedIngredient.name,
                    ingredients: [{ ingredient: scannedIngredient, amount }],
                    calories: 0, protein: 0, carbs: 0, fat: 0 
                  });
                }
                setScannedIngredient(null);
              }}
            >
              <Text style={styles.saveBtnText}>Log Food</Text>
            </TouchableOpacity>
          </View>
        )}
      </SwipeableModal>`;

code = code.replace(targetLogic, replacementLogic);

fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
