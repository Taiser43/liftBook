const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

// 1. Modify startTracking to handle resume
code = code.replace(
  `    setIsTracking(true);
    setCoordinates([]);
    setDistance(0);
    setDuration(0);
    setCalories(0);
    startTimestampRef.current = Date.now();
    pausedDurationRef.current = 0;`,
  `    setIsTracking(true);
    if (duration === 0) {
      setCoordinates([]);
      setDistance(0);
      setDuration(0);
      setCalories(0);
      pausedDurationRef.current = 0;
    }
    startTimestampRef.current = Date.now();`
);

// 2. Fix the timer interval to use absolute time + pausedDuration
code = code.replace(
  `    timerRef.current = setInterval(() => {
      setDuration(prev => {
        const newDur = prev + 1;
        // Compute live speed from last 2 coords
        setDistance(d => {
          const spd = newDur > 0 ? (d / 1000) / (newDur / 3600) : 0;
          setGlobalCardioSession(true, newDur, d, spd);
          return d;
        });
        return newDur;
      });
      setCalories(prev => prev + ((currentHR > 80 ? currentHR * 0.05 : 10) / 60));
    }, 1000);`,
  `    timerRef.current = setInterval(() => {
      const now = Date.now();
      const newDur = Math.floor((now - startTimestampRef.current) / 1000) + pausedDurationRef.current;
      setDuration(newDur);
      
      setDistance(d => {
        const spd = newDur > 0 ? (d / 1000) / (newDur / 3600) : 0;
        setGlobalCardioSession(true, newDur, d, spd);
        return d;
      });
      
      setCalories(prev => prev + ((currentHR > 80 ? currentHR * 0.05 : 10) / 60));
    }, 1000);`
);

// 3. Fix pauseTracking to update pausedDurationRef
code = code.replace(
  `  const pauseTracking = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fgSubRef.current) { fgSubRef.current.remove(); fgSubRef.current = null; }
    // Note: background task keeps running so GPS coords still accumulate
    setIsTracking(false);
  };`,
  `  const pauseTracking = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fgSubRef.current) { fgSubRef.current.remove(); fgSubRef.current = null; }
    if (startTimestampRef.current) {
      pausedDurationRef.current += Math.floor((Date.now() - startTimestampRef.current) / 1000);
      startTimestampRef.current = null;
    }
    // Note: background task keeps running so GPS coords still accumulate
    setIsTracking(false);
  };`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
