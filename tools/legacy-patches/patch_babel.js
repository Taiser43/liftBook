const fs = require('fs');
let code = fs.readFileSync('babel.config.js', 'utf8');

if (!code.includes('react-native-worklets/plugin')) {
  code = code.replace(
    `plugins: [`,
    `plugins: [
      'react-native-worklets/plugin',`
  );
  fs.writeFileSync('babel.config.js', code);
}
