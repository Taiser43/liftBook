const fs = require('fs');
const p = 'src/screens/HomeScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /const handleAddRecipeFromRecipe = \(meal: Recipe\) => \{\n\s*addLoggedMeal\(\{\n\s*name: meal\.name,\n\s*calories: meal\.calories,\n\s*protein: meal\.protein,\n\s*carbs: meal\.carbs,\n\s*fat: meal\.fat,\n\s*\}\);/,
  `const handleAddRecipeFromRecipe = (meal: Recipe) => {
    const s = meal.totalServings || 1;
    addLoggedMeal({
      name: meal.name,
      calories: Math.round(meal.calories / s),
      protein: Math.round(meal.protein / s),
      carbs: Math.round(meal.carbs / s),
      fat: Math.round(meal.fat / s),
    });`
);

c = c.replace(
  /<Text style=\{styles\.mealOptionMacros\}>\n\s*\{meal\.calories\} kcal • \{meal\.protein\}g P • \{meal\.carbs\}g C • \{meal\.fat\}g F\n\s*<\/Text>/,
  `{(() => {
                    const s = meal.totalServings || 1;
                    return (
                      <Text style={styles.mealOptionMacros}>
                        {Math.round(meal.calories / s)} kcal • {Math.round(meal.protein / s)}g P • {Math.round(meal.carbs / s)}g C • {Math.round(meal.fat / s)}g F
                      </Text>
                    );
                  })()}`
);

fs.writeFileSync(p, c);
console.log('Patched HomeScreen for per-serving macros in Quick Recipe Modal');
