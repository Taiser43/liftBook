const fs = require('fs');
const p = 'src/screens/HomeScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /const handleLogNextMeal = \(\) => \{\n\s*if \(nextScheduledMeal && nextRecipe\) \{/,
  `const handleLogNextMeal = () => {
    if (nextScheduledMeal && nextRecipe) {
      const servings = nextRecipe.totalServings || 1;`
);

c = c.replace(
  /addLoggedMeal\(\{\n\s*name: nextScheduledMeal\.customName \|\| nextRecipe\.name,\n\s*calories: nextRecipe\.calories,\n\s*protein: nextRecipe\.protein,\n\s*carbs: nextRecipe\.carbs,\n\s*fat: nextRecipe\.fat,/,
  `addLoggedMeal({
        name: nextScheduledMeal.customName || nextRecipe.name,
        calories: Math.round(nextRecipe.calories / servings),
        protein: Math.round(nextRecipe.protein / servings),
        carbs: Math.round(nextRecipe.carbs / servings),
        fat: Math.round(nextRecipe.fat / servings),`
);

c = c.replace(
  /<Text style=\{styles\.trainingPlanDetails\}>\n\s*\{nextRecipe\.calories\} kcal • \{nextRecipe\.protein\}g P • \{nextRecipe\.carbs\}g C • \{nextRecipe\.fat\}g F\n\s*<\/Text>/,
  `{(() => {
                      const s = nextRecipe.totalServings || 1;
                      const cal = Math.round(nextRecipe.calories / s);
                      const p = Math.round(nextRecipe.protein / s);
                      const cb = Math.round(nextRecipe.carbs / s);
                      const f = Math.round(nextRecipe.fat / s);
                      return (
                        <Text style={styles.trainingPlanDetails}>
                          {cal} kcal • {p}g P • {cb}g C • {f}g F (1 Portion)
                        </Text>
                      );
                    })()}`
);

fs.writeFileSync(p, c);
console.log('Patched HomeScreen for per-serving macros in Next Meal');
