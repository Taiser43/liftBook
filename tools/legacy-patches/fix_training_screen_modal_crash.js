const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

const brokenRegex = /\{\/\* Open Exercise Manager Button \*\/\}[\s\S]*?\{\/\* Configured Exercises Target Values \*\/\}/;

const replacement = `{/* Open Exercise Manager Button */}
                  <TouchableOpacity 
                    style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
                    onPress={() => {
                      setEditingExercise(null);
                      setManagerVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
                    <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Create New Exercise</Text>
                  </TouchableOpacity>

              </ScrollView>
            </View>
          </Modal>

          {/* Program Editor Modal */}
          <Modal
            visible={editorModalVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setEditorModalVisible(false)}
          >
            <View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>
              <View style={styles.fullPageHeader}>
                <TouchableOpacity onPress={() => setEditorModalVisible(false)}>
                  <Text style={styles.navCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.navHeaderTitle}>Edit Program</Text>
                <TouchableOpacity onPress={handleSaveProgram}>
                  <Text style={styles.navSaveText}>Save</Text>
                </TouchableOpacity>
              </View>

              <DraggableFlatList
                data={editorExercises}
                onDragEnd={({ data }) => setEditorExercises(data)}
                keyExtractor={(item) => item.id}
                containerStyle={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListHeaderComponent={
                  <View style={{ paddingBottom: 20 }}>
                    <View style={styles.formSection}>
                      <Text style={styles.formSectionLabel}>PROGRAM NAME</Text>
                      <TextInput 
                        style={styles.fullPageInput}
                        placeholder="e.g. Push, Pull, Legs"
                        placeholderTextColor="#666"
                        value={activePlan?.name || ''}
                        onChangeText={(val) => {
                          if (activePlan) {
                            useAppStore.getState().updateWorkoutProgram(activePlan.id, { name: val });
                          }
                        }}
                      />
                    </View>

                    <View style={styles.formSection}>
                      <Text style={styles.formSectionLabel}>ADD EXERCISES</Text>
                      <TextInput 
                        style={styles.fullPageInput}
                        placeholder="Search exercises..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                    </View>

                    {/* Filters */}
                    <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, paddingHorizontal: 16 }}>
                      {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => (
                        <TouchableOpacity 
                          key={cat}
                          style={[styles.categoryPill, filterCategory === cat && styles.categoryPillActive]}
                          onPress={() => setFilterCategory(cat as BodyPart)}
                        >
                          <Text style={[styles.categoryPillText, filterCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </GHScrollView>
                    <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, { paddingHorizontal: 16, marginBottom: 16 }]}>
                      {['All', ...(useAppStore.getState().equipmentTypes || ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'])].map(eq => (
                        <TouchableOpacity 
                          key={eq}
                          style={[styles.categoryPill, filterEquip === eq && styles.categoryPillActive]}
                          onPress={() => setFilterEquip(eq)}
                        >
                          <Text style={[styles.categoryPillText, filterEquip === eq && styles.categoryPillTextActive]}>{eq}</Text>
                        </TouchableOpacity>
                      ))}
                    </GHScrollView>

                    {/* Displayed exercises to add */}
                    <View style={{ paddingHorizontal: 16 }}>
                      {displayedExercises.map((ex, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.exerciseSelectRow}
                          onPress={() => {
                            const newId = \`\${Date.now()}_\${Math.random().toString(36).substr(2, 5)}\`;
                            const newEx = {
                              id: newId,
                              name: ex.name,
                              sets: 3,
                              reps: 10,
                              weight: 0
                            };
                            setEditorExercises(prev => [...prev, newEx]);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exerciseSelectName}>{ex.name}</Text>
                            {((ex as any).equipmentType || (ex as any).brand) && (
                              <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                                {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity 
                            style={{ padding: 8, marginRight: 8 }}
                            onPress={(e) => {
                               e.stopPropagation();
                               setEditingExercise(ex);
                               setManagerVisible(true);
                            }}
                          >
                            <MaterialCommunityIcons name="pencil" size={18} color="#888" />
                          </TouchableOpacity>
                          <View style={styles.categoryBadgeSmall}>
                            <Text style={styles.categoryBadgeSmallText}>{ex.category}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* Open Exercise Manager Button */}
                      <TouchableOpacity 
                        style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
                        onPress={() => {
                          setEditingExercise(null);
                          setManagerVisible(true);
                        }}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
                        <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Create New Exercise</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Configured Exercises Target Values */}`;

c = c.replace(brokenRegex, replacement);

fs.writeFileSync(p, c);
console.log('Restored the missing middle chunk of TrainingScreen.tsx');
