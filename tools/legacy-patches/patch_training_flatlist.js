const fs = require('fs');
let content = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// 1. Update imports
if (!content.includes('KeyboardAwareFlatList')) {
  content = content.replace(
    "import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';",
    "import { KeyboardAwareScrollView as ScrollView, KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';"
  );
}

// 2. Extract the ScrollView content and replace with KeyboardAwareFlatList
const oldScrollViewStart = `<ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomSpacing }}>
            {liveExercises.map((ex, exIdx) => {
              const count = ex.sets || 3;
              return (`;

const newFlatListStart = `<KeyboardAwareFlatList
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomSpacing + 80 }}
            data={liveExercises}
            keyExtractor={(item) => item.id}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={5}
            removeClippedSubviews={true}
            renderItem={({ item: ex, index: exIdx }) => {
              const count = ex.sets || 3;
              return (`;

content = content.replace(oldScrollViewStart, newFlatListStart);

const oldScrollViewEnd = `                  })}
                </View>
              );
            })}

            <View style={{ height: 80 }} />
          </ScrollView>

          <TouchableOpacity 
              style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
              onPress={() => setSwapExerciseIndex(-1)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
              <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Add Exercise to Workout</Text>
            </TouchableOpacity>`;

const newFlatListEnd = `                  })}
                </View>
              );
            }}
            ListFooterComponent={() => (
              <TouchableOpacity 
                style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
                onPress={() => setSwapExerciseIndex(-1)}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
                <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Add Exercise to Workout</Text>
              </TouchableOpacity>
            )}
          />`;

content = content.replace(oldScrollViewEnd, newFlatListEnd);

fs.writeFileSync('src/screens/TrainingScreen.tsx', content);
