import os
import re

files_with_textinput = [
    "src/screens/SupplementsScreen.tsx",
    "src/screens/StretchingLibraryScreen.tsx",
    "src/screens/NutritionScreen.tsx",
    "src/screens/TrainingScreen.tsx",
    "src/screens/HomeScreen.tsx",
    "src/components/EnhancedRecipeBuilder.tsx",
    "src/components/AdminPanelModal.tsx",
    "src/components/PowerSongConfigModal.tsx",
    "src/components/PlaylistModal.tsx",
    "src/components/BarcodeScannerModal.tsx",
    "src/components/DietPlanManager.tsx"
]

for filepath in files_with_textinput:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()
        
    # Check if ScrollView is imported from react-native
    if 'ScrollView' in content and 'react-native-keyboard-aware-scroll-view' not in content:
        # Remove ScrollView from react-native imports
        content = re.sub(r'\bScrollView\b\s*,?\s*', '', content, count=1) # naive but might leave a trailing comma, let's do a better regex
        
        # Better: find the react-native import block and replace ScrollView
        # Since imports can span multiple lines, let's just do a string replace of "ScrollView," and ", ScrollView"
        content = content.replace('ScrollView,', '').replace(', ScrollView', '').replace('{ ScrollView }', '{}')
        
        # Add the new import after the first import statement
        new_import = "import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';\n"
        
        # find first import
        first_import_idx = content.find('import ')
        if first_import_idx != -1:
            newline_after = content.find('\n', first_import_idx)
            content = content[:newline_after+1] + new_import + content[newline_after+1:]
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

