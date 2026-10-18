const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  /            <TouchableOpacity \n\s*style=\{styles\.addPlanIconButton\}\n\s*activeOpacity=\{0\.8\}\n\s*onPress=\{\(\) => {\n\s*setNewProgramName\(''\);\n\s*setProgramEditorModalVisible\(true\);\n\s*}\}\n\s*>\n\s*<MaterialCommunityIcons name="folder-plus" size=\{20\} color="#00D2FF" \/>\n\s*<Text style=\{styles\.addPlanText\}>New Program<\/Text>\n\s*<\/TouchableOpacity>/g,
  `            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                style={{ marginRight: 12, backgroundColor: 'rgba(0, 210, 255, 0.1)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => navigation.navigate('WorkoutHistory' as never)}
              >
                <MaterialCommunityIcons name="history" size={24} color="#00D2FF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addPlanIconButton}
                activeOpacity={0.8}
                onPress={() => {
                  setNewProgramName('');
                  setProgramEditorModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="folder-plus" size={20} color="#00D2FF" />
                <Text style={styles.addPlanText}>New</Text>
              </TouchableOpacity>
            </View>`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('TrainingScreen patched');
