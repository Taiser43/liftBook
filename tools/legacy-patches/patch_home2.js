const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const target = `        {/* Scan Barcode Option */}
        <TouchableOpacity 
          style={styles.scanBarcodeModalBtn}
          activeOpacity={0.8}
          onPress={() => {
            setRecipeModalVisible(false);
            setBarcodeModalVisible(true);
            Vibration.vibrate(30);
          }}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.scanBarcodeModalBtnText}>📷 Scan Food Barcode (EAN)</Text>
        </TouchableOpacity>

        <View style={styles.orDividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR PICK SAVED RECIPE</Text>
          <View style={styles.dividerLine} />
        </View>`;

code = code.replace(target, '');

fs.writeFileSync('src/screens/HomeScreen.tsx', code);

let barcode = fs.readFileSync('src/components/BarcodeScannerModal.tsx', 'utf8');
barcode = barcode.replace('StyleSheet.absoluteFillObject', 'StyleSheet.absoluteFill');
fs.writeFileSync('src/components/BarcodeScannerModal.tsx', barcode);
