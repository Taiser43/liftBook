import os

files_with_textinput = [
    "src/screens/SupplementsScreen.tsx",
    "src/screens/NutritionScreen.tsx",
    "src/screens/TrainingScreen.tsx",
    "src/screens/HomeScreen.tsx",
    "src/components/EnhancedRecipeBuilder.tsx",
    "src/components/AdminPanelModal.tsx",
    "src/components/DietPlanManager.tsx"
]

for filepath in files_with_textinput:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()
        
    # Replace <ScrollView with <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
    # But only if it doesn't already have enableOnAndroid
    if '<ScrollView' in content and 'enableOnAndroid={true}' not in content:
        content = content.replace('<ScrollView', '<ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"')
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched props in {filepath}")

