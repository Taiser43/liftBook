const fs = require('fs');
const p = 'src/data/exercises.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /export interface PreloadedExercise \{/,
  `export interface PreloadedExercise {
  equipmentType?: string;
  brand?: string;`
);

// We'll write a quick function to auto-categorize based on string matching.
const autoCategorize = (code) => {
  return code.replace(/\{ name: '([^']+)', category: '([^']+)' \}/g, (match, name, category) => {
    let eq = "Sonstiges";
    if (name.includes('Barbell') || name.includes('Dumbbell') || name.includes('Deadlift') || name.includes('Curl') && !name.includes('Machine') && !name.includes('Cable')) eq = 'Freie Übung';
    if (name.includes('Machine') || name.includes('Press') && !name.includes('Barbell') && !name.includes('Dumbbell') && !name.includes('Cable')) eq = 'Maschine';
    if (name.includes('Cable') || name.includes('Pushdown')) eq = 'Kabelturm';
    if (name.includes('Smith')) eq = 'Multipresse';
    if (name.includes('Push-Up') || name.includes('Pull-Up') || name.includes('Dip') || name.includes('Bodyweight') || name.includes('Plank') || name.includes('Crunch')) eq = 'Bodyweight';
    
    // Some overrides
    if (name.includes('Lat Pulldown') || name.includes('Seated Row')) eq = 'Kabelturm';
    if (name.includes('Leg Press') || name.includes('Leg Extension') || name.includes('Leg Curl') || name.includes('Calf Raise Machine')) eq = 'Maschine';
    if (name.includes('Squat') && !name.includes('Smith') && !name.includes('Machine')) eq = 'Freie Übung';
    if (name.includes('Shrug') && !name.includes('Machine') && !name.includes('Smith')) eq = 'Freie Übung';

    return `{ name: '${name}', category: '${category}', equipmentType: '${eq}', brand: 'Keine' }`;
  });
};

c = autoCategorize(c);

fs.writeFileSync(p, c);
console.log('Patched preloaded exercises with auto-categorization');
