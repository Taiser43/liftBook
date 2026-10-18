const fs = require('fs');
const p = 'src/navigation/AppNavigator.tsx';
let c = fs.readFileSync(p, 'utf8');

// Insert import if not exists
if (!c.includes('GlobalActivityBar')) {
  c = c.replace(
    /import \{ GlobalNotepad \} from '\.\.\/components\/GlobalNotepad';/,
    "import { GlobalNotepad } from '../components/GlobalNotepad';\nimport { GlobalActivityBar } from '../components/GlobalActivityBar';"
  );
}

// Remove old LIVE WORKOUT PLAYER
const startWorkout = c.indexOf('{/* GLOBAL MINIMIZED LIVE WORKOUT PLAYER */}');
const endWorkout = c.indexOf('<CardioTrackingScreen navigation={navigationRef} />');
if (startWorkout !== -1 && endWorkout !== -1) {
  c = c.slice(0, startWorkout) + c.slice(endWorkout);
}

// Remove old CARDIO PLAYER
const startCardio = c.indexOf('{/* GLOBAL MINIMIZED CARDIO PLAYER */}');
const endCardio = c.indexOf('</View>', startCardio); // This might be tricky. Let's find the specific end of Cardio Player.
if (startCardio !== -1) {
  const afterCardio = c.slice(startCardio);
  const closingViewIndex = afterCardio.indexOf('</View>\n  );\n}');
  if (closingViewIndex !== -1) {
    c = c.slice(0, startCardio) + "      <GlobalActivityBar navigationRef={navigationRef} />\n    " + afterCardio.slice(closingViewIndex);
  }
}

// Ensure the styles are completely stripped out for the old miniPlayerContainer to avoid unused style warnings (though not strictly necessary)
// I will just leave the styles as they are to avoid breaking anything else.

fs.writeFileSync(p, c);
console.log('Patched AppNavigator to use GlobalActivityBar');
