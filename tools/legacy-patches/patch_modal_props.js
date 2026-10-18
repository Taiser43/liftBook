const fs = require('fs');
const p = 'src/components/LevelProgressionModal.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('children?: React.ReactNode')) {
  c = c.replace(
    /thresholds\?: number\[\];\n\}/,
    "thresholds?: number[];\n  description?: string;\n  children?: React.ReactNode;\n}"
  );
  
  c = c.replace(
    /thresholds \}\) => \{/,
    "thresholds, description, children }) => {"
  );
  
  // Custom hero descriptions
  const heroDescCode = `
  const getHeroDescription = (name: string) => {
    if (name === 'Juggernaut') return 'Earn XP through heavy lifting (Bench Press, Squat, Deadlift) and pure strength training.';
    if (name === 'Aesthetic') return 'Earn XP through high volume, hypertrophy training, and isolation exercises.';
    if (name === 'Ranger') return 'Earn XP through bodyweight exercises, callisthenics, and agility training.';
    if (name === 'Monk') return 'Earn XP through consistent daily activity, stretching, and martial arts.';
    return 'Earn XP by completing workouts focusing on this archetype.';
  };
  `;
  
  c = c.replace(
    /const tiers = \[/,
    heroDescCode + "\n  const tiers = ["
  );
  
  // Replace the info text
  c = c.replace(
    /\{type === 'cardio' && 'Earn XP through distance, duration, and high heart rate zones \(Intensity\)\.'\}\n\s*\{type === 'class' && 'Earn XP by completing workouts focusing on this archetype\.'\}\n\s*\{type === 'achievement' && 'Complete the required goals to upgrade this badge tier\.'\}/,
    `{type === 'cardio' && 'Earn XP through distance, duration, and high heart rate zones (Intensity).'}
                {type === 'class' && getHeroDescription(title)}
                {type === 'achievement' && (description || 'Complete the required goals to upgrade this badge tier.')}`
  );
  
  // Render children at the top of scroll
  c = c.replace(
    /<View style=\{styles\.infoBox\}>/,
    `{children}\n            <View style={styles.infoBox}>`
  );
  
  // Fix rounding numbers (already using Math.floor in reqXP calculation, but let's ensure toLocaleString() is clean)
  // `Math.floor(base * Math.pow(t.startLevel - 1, 1.5))` is already whole number.
  // We'll round progressPercent.
  
  fs.writeFileSync(p, c);
  console.log('Patched modal props and descriptions');
}
