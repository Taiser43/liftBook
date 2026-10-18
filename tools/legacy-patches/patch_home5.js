const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// Fix imports
if (!code.includes('import { Ingredient }')) {
  code = code.replace(
    `import { useAppStore, `,
    `import { Ingredient } from '../store/store';\nimport { useAppStore, `
  );
}
if (!code.includes('import BarcodeScannerModal')) {
  code = code.replace(
    `import SwipeableModal from '../components/SwipeableModal';`,
    `import SwipeableModal from '../components/SwipeableModal';\nimport BarcodeScannerModal from '../components/BarcodeScannerModal';`
  );
}

// Fix styles
const styleAppend = `
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333333' },
  dividerText: { color: '#666666', fontSize: 11, fontWeight: '800', marginHorizontal: 12, letterSpacing: 0.5 },
  portionInput: { backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' },
  logPillFull: { backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' },
  logPillTextFull: { color: '#000', fontSize: 16, fontWeight: '900' }
});`;
code = code.replace('});', styleAppend);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
