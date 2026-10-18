const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let text = fs.readFileSync(p, 'utf8');

// 1. Find the last occurrence of FlippableExerciseCard (the one we appended)
const lastIndex = text.lastIndexOf('const FlippableExerciseCard = ({');

// 2. The new component is everything from lastIndex to the end (minus trailing whitespace)
const newComponent = text.slice(lastIndex).trim();

// 3. Remove the appended component from the text
text = text.slice(0, lastIndex);

// 4. Now find the FIRST occurrence of FlippableExerciseCard (the old one)
const firstIndex = text.indexOf('const FlippableExerciseCard = ({');

// 5. Find where it ends. It ends right before "export default function StatsScreen"
const endIndex = text.indexOf('export default function StatsScreen');

// 6. Replace the old component with the new component
text = text.slice(0, firstIndex) + newComponent + '\n\n' + text.slice(endIndex);

fs.writeFileSync(p, text);
console.log('Fixed the mess!');
