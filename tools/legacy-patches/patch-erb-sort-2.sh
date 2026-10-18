sed -i '' -e '102,107c\
  const sortedIngredients = [...ingredients].sort((a, b) => {\
    if (ingredientSort === '\''usage'\'') {\
      const usageA = a.usageCount || 0;\
      const usageB = b.usageCount || 0;\
      if (usageB !== usageA) return usageB - usageA;\
      return a.name.localeCompare(b.name);\
    }\
    if (ingredientSort === '\''name'\'') return a.name.localeCompare(b.name);\
    if (ingredientSort === '\''calories'\'') return b.calories - a.calories;\
    return b.protein - a.protein;\
  });\
' src/components/EnhancedRecipeBuilder.tsx
