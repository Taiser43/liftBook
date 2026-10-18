const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

content = content.replace(
  "navigationRef.navigate('MainTabs', { screen: 'Music' });",
  "navigationRef.navigate('MainTabs', { screen: 'Home' });"
);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
