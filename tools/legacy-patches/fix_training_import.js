const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `  Dimensions
} from 'react-native';`,
  `  Dimensions,
  AppState
} from 'react-native';`
);

code = code.replace(
  `const appStateSub = AppState.addEventListener('change', nextAppState => {`,
  `const appStateSub = AppState.addEventListener('change', (nextAppState: any) => {`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
