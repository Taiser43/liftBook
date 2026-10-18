const fs = require('fs');

// Fix TrainingScreen
let trainingCode = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');
trainingCode = trainingCode.replace(
  `  // Register finish to global store
  useEffect(() => {
    setFinishCurrentStrength(() => handleFinishLiveWorkout);
  });`,
  `  // Register finish to global store safely without infinite loops
  const finishStrengthRef = useRef(handleFinishLiveWorkout);
  finishStrengthRef.current = handleFinishLiveWorkout;
  
  useEffect(() => {
    setFinishCurrentStrength((skip) => finishStrengthRef.current(skip));
    return () => setFinishCurrentStrength(null);
  }, []);`
);
fs.writeFileSync('src/screens/TrainingScreen.tsx', trainingCode);

// Fix CardioTrackingScreen
let cardioCode = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');
cardioCode = cardioCode.replace(
  `  // ── Finish ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setFinishCurrentCardio(() => finishWorkout);
  }); // run on every render to keep it fresh`,
  `  // ── Finish ───────────────────────────────────────────────────────────────────
  const finishCardioRef = useRef(finishWorkout);
  finishCardioRef.current = finishWorkout;

  useEffect(() => {
    setFinishCurrentCardio((skip) => finishCardioRef.current(skip));
    return () => setFinishCurrentCardio(null);
  }, []);`
);
fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', cardioCode);

console.log('Done');
