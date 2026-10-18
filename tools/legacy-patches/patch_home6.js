const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const target = `  const todaysPlan = currentWorkouts.find(plan => {
    if (Array.isArray(plan.daysOfWeek)) {
      return plan.daysOfWeek.some(d => d.toLowerCase() === today.toLowerCase());
    }
    return false;
  
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333333' },
  dividerText: { color: '#666666', fontSize: 11, fontWeight: '800', marginHorizontal: 12, letterSpacing: 0.5 },
  portionInput: { backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' },
  logPillFull: { backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' },
  logPillTextFull: { color: '#000', fontSize: 16, fontWeight: '900' }
});`;

const replacement = `  const todaysPlan = currentWorkouts.find(plan => {
    if (Array.isArray(plan.daysOfWeek)) {
      return plan.daysOfWeek.some(d => d.toLowerCase() === today.toLowerCase());
    }
    return false;
  });`;

code = code.replace(target, replacement);

const styleAppend = `
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333333' },
  dividerText: { color: '#666666', fontSize: 11, fontWeight: '800', marginHorizontal: 12, letterSpacing: 0.5 },
  portionInput: { backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' },
  logPillFull: { backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' },
  logPillTextFull: { color: '#000', fontSize: 16, fontWeight: '900' }
});`;

// Replace the LAST instance of });
const lastIndex = code.lastIndexOf('});');
code = code.substring(0, lastIndex) + styleAppend + code.substring(lastIndex + 3);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
