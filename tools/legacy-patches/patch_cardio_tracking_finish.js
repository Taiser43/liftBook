const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `    addSession(session);
    setGlobalCardioSession(false, 0, 0, 0); // clear mini-player
    setGlobalCardioModalVisible(false);`,
  `    addSession(session);
    setGlobalCardioSession(false, 0, 0, 0); // clear mini-player
    setGlobalCardioModalVisible(false);
    
    // Reset local state completely so next launch is a fresh workout
    setIsTracking(false);
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setCoordinates([]);
    setCurrentHR(0);
    setHrHistory([]);
    setIsWatchConnected(false);
    startTimestampRef.current = null;
    pausedDurationRef.current = 0;`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
