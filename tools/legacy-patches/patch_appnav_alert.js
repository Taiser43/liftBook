const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

if (!code.includes('import CustomAlert from')) {
  code = code.replace(
    `import CardioHistoryScreen from '../screens/CardioHistoryScreen';`,
    `import CardioHistoryScreen from '../screens/CardioHistoryScreen';\nimport CustomAlert from '../components/CustomAlert';`
  );
}

if (!code.includes('<CustomAlert />')) {
  code = code.replace(
    `    <View style={{ flex: 1 }}>`,
    `    <View style={{ flex: 1 }}>\n      <CustomAlert />`
  );
}

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
console.log('Done');
