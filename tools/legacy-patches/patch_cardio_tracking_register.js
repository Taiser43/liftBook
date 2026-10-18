const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);`,
  `  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);
  const setFinishCurrentCardio = useAppStore(state => state.setFinishCurrentCardio);`
);

code = code.replace(
  `  // ── Finish ───────────────────────────────────────────────────────────────────`,
  `  // ── Finish ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setFinishCurrentCardio(finishWorkout);
    return () => setFinishCurrentCardio(null);
  }, [finishWorkout]);`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
