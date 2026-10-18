const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `  useEffect(() => {
    setFinishCurrentCardio(finishWorkout);
    return () => setFinishCurrentCardio(null);
  }, [finishWorkout]);`,
  `  useEffect(() => {
    setFinishCurrentCardio(() => finishWorkout);
  }); // run on every render to keep it fresh`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
