import re

with open('src/screens/NutritionScreen.tsx', 'r') as f:
    content = f.read()

pattern = r'      <SwipeableModal visible={!!actionMealId} onClose={\(\) => setActionMealId\(null\)}>\n        <Text style={styles\.modalTitle}>Meal Options</Text>\n        <View style={{ marginTop: 24 }}>\n          <TouchableOpacity style={styles\.actionMenuBtn} onPress={\(\) => {\n            if \(actionMealId\) {\n               moveMealToYesterday\(actionMealId\);\n               setActionMealId\(null\);\n            }\n          }}>\n            <MaterialCommunityIcons name="calendar-arrow-left" size={24} color="#00D2FF" />\n            <Text style={styles\.actionMenuBtnText}>Log for Yesterday</Text>\n          </TouchableOpacity>\n          <TouchableOpacity style={\[styles\.actionMenuBtn, { marginTop: 12 }\]} onPress={\(\) => {\n            if \(actionMealId\) {\n               deleteLoggedMeal\(actionMealId\);\n               setActionMealId\(null\);\n            }\n          }}>\n            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF453A" />\n            <Text style={\[styles\.actionMenuBtnText, { color: \'#FF453A\' }\]}>Delete Meal</Text>\n          </TouchableOpacity>\n          <TouchableOpacity style={\[styles\.actionMenuBtn, { marginTop: 24, backgroundColor: \'#2A2A2A\' }\]} onPress={\(\) => setActionMealId\(null\)}>\n            <Text style={\[styles\.actionMenuBtnText, { flex: 1, textAlign: \'center\', marginLeft: 0 }\]}>Cancel</Text>\n          </TouchableOpacity>\n        </View>\n      </SwipeableModal>\n'

new_content = re.sub(pattern, '', content)

with open('src/screens/NutritionScreen.tsx', 'w') as f:
    f.write(new_content)
