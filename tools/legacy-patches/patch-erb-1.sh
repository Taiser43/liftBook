sed -i '' -e '/const \[imageUri, setImageUri\] = useState<string | null>(null);/a\
  const [ingredientSearch, setIngredientSearch] = useState('\'''\'');\
' src/components/EnhancedRecipeBuilder.tsx
