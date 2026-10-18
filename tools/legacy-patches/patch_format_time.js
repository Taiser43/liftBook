const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `  const connectToHRMonitor = toggleConnection;
    const m = Math.floor((secs % 3600) / 60);`,
  `  const connectToHRMonitor = toggleConnection;
  
  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
