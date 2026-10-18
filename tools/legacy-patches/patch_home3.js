const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const target = `      <SwipeableModal 
        visible={mealModalVisible} 
        onClose={() => setRecipeModalVisible(false)}
      >
        {/* Scan Barcode Option */}
        </View>

        <Text style={styles.mealModalTitle}>Select a Saved Recipe</Text>`;

const replacement = `      <SwipeableModal 
        visible={mealModalVisible} 
        onClose={() => setRecipeModalVisible(false)}
      >
        <Text style={styles.mealModalTitle}>Select a Saved Recipe</Text>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
