const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// Find start of Editor Modal
const startToken = '{/* Program Editor Modal */}';
const endToken = '{/* END OF WORKOUT CELEBRATION MODAL */}';
const startIndex = c.indexOf(startToken);
const endIndex = c.indexOf(endToken);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end token");
  process.exit(1);
}

const replacement = `{/* Program Editor Modal */}
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
                    {editorExercises.length > 0 && (
                      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                        <Text style={styles.formSectionLabel}>CURRENT EXERCISES IN PLAN ({editorExercises.length})</Text>
                      </View>
                    )}
                  </View>
                }
                renderItem={({ item: ex, drag, isActive, getIndex }) => {
                  const idx = getIndex() || 0;
                  return (
                    <ScaleDecorator>
                      <View style={[styles.editorExerciseRow, isActive && { backgroundColor: '#2C2C2E' }]}>
                        <TouchableOpacity 
                          onLongPress={drag} 
                          disabled={isActive} 
                          style={{ padding: 12, justifyContent: 'center' }}
                        >
                          <MaterialCommunityIcons name="drag" size={28} color={isActive ? "#00D2FF" : "#555"} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editorExName}>{idx + 1}. {ex.name}</Text>
                          <View style={styles.editorInputsRow}>
                            <View style={styles.editorInputItem}>
                              <Text style={styles.editorInputLabel}>Sets</Text>
                              <TextInput 
                                style={styles.editorNumInput}
                                keyboardType="numeric"
                                placeholder="3"
                                placeholderTextColor="#555555"
                                value={editorInputValues[ex.id]?.sets !== undefined ? editorInputValues[ex.id].sets : (ex.sets ?? 3).toString()}
                                onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'sets', val)}
                              />
                            </View>
                            <View style={styles.editorInputItem}>
                              <Text style={styles.editorInputLabel}>Reps</Text>
                              <TextInput 
                                style={styles.editorNumInput}
                                keyboardType="numeric"
                                placeholder="10"
                                placeholderTextColor="#555555"
                                value={editorInputValues[ex.id]?.reps !== undefined ? editorInputValues[ex.id].reps : (ex.reps ?? 10).toString()}
                                onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'reps', val)}
                              />
                            </View>
                            <View style={styles.editorInputItem}>
                              <Text style={styles.editorInputLabel}>Weight (kg)</Text>
                              <TextInput 
                                style={styles.editorNumInput}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#555555"
                                value={editorInputValues[ex.id]?.weight !== undefined ? editorInputValues[ex.id].weight : (ex.weight ?? 0).toString()}
                                onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'weight', val)}
                              />
                            </View>
                          </View>
                        </View>
                        <View style={styles.editorActionButtons}>
                          <View style={styles.moveButtons}>
                            <TouchableOpacity 
                              style={styles.moveBtn}
                              onPress={() => moveEditorExercise(idx, -1)}
                              disabled={idx === 0}
                            >
                              <Ionicons name="chevron-up" size={20} color={idx === 0 ? "#555" : "#0A84FF"} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.moveBtn}
                              onPress={() => moveEditorExercise(idx, 1)}
                              disabled={idx === editorExercises.length - 1}
                            >
                              <Ionicons name="chevron-down" size={20} color={idx === editorExercises.length - 1 ? "#555" : "#0A84FF"} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity 
                            style={styles.removeExBtn}
                            onPress={() => {
                              setEditorExercises(prev => prev.filter(e => e.id !== ex.id));
                              setEditorInputValues(prev => {
                                const newVals = { ...prev };
                                delete newVals[ex.id];
                                return newVals;
                              });
                            }}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF453A" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScaleDecorator>
                  );
                }}
                ListFooterComponent={
                  <View>
                    <View style={styles.formSection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.formSectionLabel}>ADD EXERCISES FROM LIBRARY</Text>
                      </View>

                      {/* Search Bar */}
                      <View style={[styles.formSection, { marginBottom: 16, marginTop: 8 }]}>
                        <TextInput 
                          style={styles.fullPageInput}
                          placeholder="Search exercises..."
                          placeholderTextColor="#666666"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                      </View>

                      {/* Filters */}
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
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
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

                      {/* Exercise List */}
                      <View style={styles.exerciseListCard}>
                        {displayedExercises.map(ex => {
                          const isChecked = editorExercises.some(e => e.name === ex.name);
                          return (
                            <TouchableOpacity 
                              key={ex.name}
                              style={[styles.exerciseSelectRow, isChecked && styles.exerciseSelectRowActive]}
                              activeOpacity={0.7}
                              onPress={() => handleToggleExerciseInEditor(ex.name)}
                            >
                              <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxActive]}>
                                {isChecked && (
                                  <MaterialCommunityIcons name="check" size={16} color="#000000" />
                                )}
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.exerciseSelectName, isChecked && { color: '#FFFFFF', fontWeight: '700' }]}>
                                  {ex.name}
                                </Text>
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
                          );
                        })}
                      </View>
                      
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

                    <View style={{ height: 60 }} />
                  </View>
                }
              />
            </View>
          </GestureHandlerRootView>
        </Modal>

        `;

c = c.slice(0, startIndex) + replacement + c.slice(endIndex);

fs.writeFileSync(p, c);
console.log('Completely rewrote Editor Modal');
