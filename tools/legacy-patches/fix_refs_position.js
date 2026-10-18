const fs = require('fs');

// Fix TrainingScreen
let trainingCode = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');
const trainingBlock = `  // Register finish to global store safely without infinite loops
  const finishStrengthRef = useRef(handleFinishLiveWorkout);
  finishStrengthRef.current = handleFinishLiveWorkout;
  
  useEffect(() => {
    setFinishCurrentStrength((skip) => finishStrengthRef.current(skip));
    return () => setFinishCurrentStrength(null);
  }, []);`;
trainingCode = trainingCode.replace(trainingBlock, '');
trainingCode = trainingCode.replace(
  `  // ── Render ───────────────────────────────────────────────────────────────────`,
  `${trainingBlock}\n\n  // ── Render ───────────────────────────────────────────────────────────────────`
);
fs.writeFileSync('src/screens/TrainingScreen.tsx', trainingCode);

// Fix CardioTrackingScreen
let cardioCode = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');
const cardioBlock = `  // ── Finish ───────────────────────────────────────────────────────────────────
  const finishCardioRef = useRef(finishWorkout);
  finishCardioRef.current = finishWorkout;

  useEffect(() => {
    setFinishCurrentCardio((skip) => finishCardioRef.current(skip));
    return () => setFinishCurrentCardio(null);
  }, []);`;
cardioCode = cardioCode.replace(cardioBlock, '');
cardioCode = cardioCode.replace(
  `  // ── Render ───────────────────────────────────────────────────────────────────`,
  `${cardioBlock}\n\n  // ── Render ───────────────────────────────────────────────────────────────────`
);
fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', cardioCode);

console.log('Done');
