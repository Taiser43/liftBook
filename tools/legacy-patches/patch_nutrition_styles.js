const fs = require('fs');
let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

code = code.replace(
  `style={[styles.input, { fontSize: 24, textAlign: 'center', height: 70, fontWeight: '900' }]}`,
  `style={{ backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' }}`
);

code = code.replace(
  `style={[styles.saveBtn, { marginTop: 16, backgroundColor: '#30D158' }]}`,
  `style={{ backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' }}`
);

code = code.replace(
  `<Text style={styles.saveBtnText}>Log Food</Text>`,
  `<Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>Log Food</Text>`
);

fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
