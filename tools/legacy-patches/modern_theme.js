const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// 1. App Background
code = code.replace(/backgroundColor: '#121212'/g, "backgroundColor: '#050505'");

// 2. Cards (Frosted glass effect)
code = code.replace(/backgroundColor: '#1E1E1E'/g, "backgroundColor: '#111214'");
code = code.replace(/borderColor: '#2A2A2A'/g, "borderColor: '#1E2024'");
code = code.replace(/borderColor: '#2E2E32'/g, "borderColor: '#1E2024'");
code = code.replace(/borderRadius: 16/g, "borderRadius: 24");
code = code.replace(/borderRadius: 18/g, "borderRadius: 24");
code = code.replace(/padding: 16/g, "padding: 20");
code = code.replace(/padding: 18/g, "padding: 20");

// 3. Edit Buttons & Pills
code = code.replace(/backgroundColor: 'rgba\(0, 210, 255, 0.12\)'/g, "backgroundColor: 'rgba(48, 209, 88, 0.12)'"); // Switch to Emerald
code = code.replace(/color: '#00D2FF'/g, "color: '#30D158'");
code = code.replace(/borderColor: '#00D2FF'/g, "borderColor: '#30D158'");

// Save Weight Btn
code = code.replace(/backgroundColor: '#00D2FF'/g, "backgroundColor: '#30D158'");

// Chart config (if any)
code = code.replace(/color: \(opacity = 1\) => `rgba\(0, 210, 255, \$\{opacity\}\)`/g, "color: (opacity = 1) => `rgba(48, 209, 88, ${opacity})`");
code = code.replace(/color: \(opacity = 1\) => `rgba\(255, 255, 255, \$\{opacity\}\)`/g, "color: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`");

// 4. Macro progress bars
// We can change the colors in the renderWidget 'nutrition' block
// Protein: #30D158 (Emerald), Carbs: #00D2FF (Cyan), Fat: #BF5AF2 (Purple)
code = code.replace(/#FF453A/g, "#00D2FF"); // Carbs to Cyan
code = code.replace(/#FF9F0A/g, "#BF5AF2"); // Fat to Purple
// Protein is already #30D158

// 5. Streak Icon
code = code.replace(/color=\{\(streaks.workedOutToday && streaks.hitNutritionToday\) \? "\#FFD60A" : "\#666"\}/g, 
  "color={(streaks.workedOutToday && streaks.hitNutritionToday) ? \"#00D2FF\" : \"#333\"}");

// Master Streak Text Color
code = code.replace(/color: '#FF9500'/g, "color: '#00D2FF'");
code = code.replace(/backgroundColor: 'rgba\(255, 149, 0, 0.12\)'/g, "backgroundColor: 'rgba(0, 210, 255, 0.12)'");

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
console.log('Applied modern theme overrides to HomeScreen.tsx');
