sed -i '' -e '/if (ingredientSort === '\''name'\'')/i\
                if (ingredientSort === '\''usage'\'') {\
                  const ua = a.usageCount || 0;\
                  const ub = b.usageCount || 0;\
                  if (ua !== ub) return ub - ua;\
                  return a.name.localeCompare(b.name);\
                }\
' src/screens/NutritionScreen.tsx
