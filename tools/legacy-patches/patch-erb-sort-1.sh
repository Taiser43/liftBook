sed -i '' -e '/const \[ingredientSearch/a\
  const [ingredientSort, setIngredientSort] = useState<'\''usage'\'' | '\''name'\'' | '\''calories'\'' | '\''protein'\''>('\''usage'\'');\
' src/components/EnhancedRecipeBuilder.tsx
