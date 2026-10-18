sed -i '' -e '/deleteIngredient: (id: string) => void;/a\
  incrementIngredientUsage: (id: string) => void;\
' src/store/store.ts
sed -i '' -e '/deleteIngredient: (id) =>/a\
      incrementIngredientUsage: (id) => set((state) => ({ ingredients: (state.ingredients || []).map(i => i.id === id ? { ...i, usageCount: (i.usageCount || 0) + 1 } : i) })),\
' src/store/store.ts
