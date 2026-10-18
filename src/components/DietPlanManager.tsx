import React, { useState, useMemo } from 'react';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, DietPlan, ScheduledMeal, Recipe } from '../store/store';
import SwipeableModal from './SwipeableModal';
import MacroDonut from './MacroDonut';
import ShoppingListModal from './ShoppingListModal';

interface DietPlanManagerProps {
  visible: boolean;
  onClose: () => void;
  initialPlanId?: string | null;
}

const DAYS_OF_WEEK = ["Everyday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const FILTER_DAYS = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DietPlanManager({ visible, onClose, initialPlanId }: DietPlanManagerProps) {
  const { dietPlans, addDietPlan, updateDietPlan, deleteDietPlan, toggleDietPlanActive, savedMeals } = useAppStore();
  
  const [editingPlan, setEditingPlan] = useState<DietPlan | null>(null);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [selectedFilterDay, setSelectedFilterDay] = useState<string>('All');

  // Shopping List Modal
  const [shoppingListModalVisible, setShoppingListModalVisible] = useState(false);
  const [shoppingListPlanId, setShoppingListPlanId] = useState<string | null>(null);

  // New Meal Form State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Everyday']);
  const [mealTime, setMealTime] = useState<string>('12:00');
  const [customMealName, setCustomMealName] = useState<string>('');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealServings, setMealServings] = useState<string>('1');
  const [isBalancerMeal, setIsBalancerMeal] = useState(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');

  React.useEffect(() => {
    if (visible && initialPlanId) {
      const plan = dietPlans.find(p => p.id === initialPlanId);
      if (plan) setEditingPlan(plan);
    }
  }, [visible, initialPlanId, dietPlans]);

  const handleCreatePlan = (goal: 'Cut' | 'Bulk' | 'Maintain') => {
    const newPlan: DietPlan = {
      id: Date.now().toString(),
      name: `New ${goal} Plan`,
      goal,
      isActive: false,
      scheduledMeals: []
    };
    addDietPlan(newPlan);
    setEditingPlan(newPlan);
  };

  const handleUpdatePlan = (updates: Partial<DietPlan>) => {
    if (!editingPlan) return;
    const updated = { ...editingPlan, ...updates };
    setEditingPlan(updated);
    updateDietPlan(updated);
  };

  const handleSaveMeal = () => {
    if (!selectedRecipe) return Alert.alert('Error', 'Please select a recipe.');
    if (!editingPlan) return;

    // Validate time format HH:MM
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(mealTime)) {
      return Alert.alert('Error', 'Time must be in HH:MM (24-hour) format.');
    }

    const s = parseFloat(mealServings) || 1;

    const newMeal: ScheduledMeal = {
      id: editingMealId || Date.now().toString(),
      dayOfWeek: selectedDays,
      time: mealTime,
      recipeId: selectedRecipe.id,
      customName: customMealName || selectedRecipe.name,
      servings: s,
      isBalancerMeal: isBalancerMeal
    };

    let updatedMeals = editingPlan.scheduledMeals;
    // If setting as balancer meal, unmark any other meal so there is at most one
    if (isBalancerMeal) {
      updatedMeals = updatedMeals.map(m => m.id === editingMealId ? m : { ...m, isBalancerMeal: false });
    }

    if (editingMealId) {
      updatedMeals = updatedMeals.map(m => m.id === editingMealId ? newMeal : m);
    } else {
      updatedMeals = [...updatedMeals, newMeal];
    }

    handleUpdatePlan({ scheduledMeals: updatedMeals });
    
    setIsAddingMeal(false);
    setSelectedRecipe(null);
    setCustomMealName('');
    setMealTime('12:00');
    setSelectedDays(['Everyday']);
    setEditingMealId(null);
    setMealServings('1');
    setIsBalancerMeal(false);
    setRecipeSearchQuery('');
  };

  const handleDeleteMeal = (mealId: string) => {
    if (!editingPlan) return;
    handleUpdatePlan({
      scheduledMeals: editingPlan.scheduledMeals.filter(m => m.id !== mealId)
    });
  };

  const toggleDaySelection = (day: string) => {
    if (day === 'Everyday') {
      setSelectedDays(['Everyday']);
      return;
    }
    
    let nextDays = selectedDays.includes('Everyday') ? [] : [...selectedDays];
    
    if (nextDays.includes(day)) {
      nextDays = nextDays.filter(d => d !== day);
      if (nextDays.length === 0) nextDays = ['Everyday'];
    } else {
      nextDays.push(day);
    }
    setSelectedDays(nextDays);
  };

  if (editingPlan) {
    const filteredMeals = editingPlan.scheduledMeals.filter(meal => 
      selectedFilterDay === 'All' || 
      meal.dayOfWeek.includes('Everyday') || 
      meal.dayOfWeek.includes(selectedFilterDay)
    );
    const sortedMeals = [...filteredMeals].sort((a, b) => a.time.localeCompare(b.time));

    let totalCal = 0, totalPro = 0, totalCar = 0, totalFat = 0;
    if (selectedFilterDay === 'All') {
      // Average daily macros over the week
      let weeklyCal = 0, weeklyPro = 0, weeklyCar = 0, weeklyFat = 0;
      editingPlan.scheduledMeals.forEach(meal => {
        const recipe = savedMeals.find(r => r.id === meal.recipeId);
        if (recipe) {
          const mult = meal.dayOfWeek.includes('Everyday') ? 7 : meal.dayOfWeek.length;
          const ratio = (meal.servings || 1) / (recipe.totalServings || 1);
          weeklyCal += (recipe.calories * ratio) * mult;
          weeklyPro += (recipe.protein * ratio) * mult;
          weeklyCar += (recipe.carbs * ratio) * mult;
          weeklyFat += (recipe.fat * ratio) * mult;
        }
      });
      totalCal = weeklyCal / 7;
      totalPro = weeklyPro / 7;
      totalCar = weeklyCar / 7;
      totalFat = weeklyFat / 7;
    } else {
      filteredMeals.forEach(meal => {
        const recipe = savedMeals.find(r => r.id === meal.recipeId);
        if (recipe) {
          const ratio = (meal.servings || 1) / (recipe.totalServings || 1);
          totalCal += recipe.calories * ratio;
          totalPro += recipe.protein * ratio;
          totalCar += recipe.carbs * ratio;
          totalFat += recipe.fat * ratio;
        }
      });
    }

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setEditingPlan(null); if(initialPlanId) onClose(); }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { setEditingPlan(null); if(initialPlanId) onClose(); }}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#00D2FF" />
            </TouchableOpacity>
            <TextInput
              style={styles.titleInput}
              value={editingPlan.name}
              onChangeText={(text) => handleUpdatePlan({ name: text })}
              placeholder="Plan Name"
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              onPress={() => {
                setShoppingListPlanId(editingPlan.id);
                setShoppingListModalVisible(true);
              }}
              style={{ padding: 4 }}
            >
              <MaterialCommunityIcons name="cart-outline" size={24} color="#30D158" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingVertical: 16 }}>
            <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {FILTER_DAYS.map(day => (
                <TouchableOpacity 
                  key={day}
                  style={[styles.dayChip, selectedFilterDay === day && styles.dayChipActive]}
                  onPress={() => setSelectedFilterDay(day)}
                >
                  <Text style={[styles.dayChipText, selectedFilterDay === day && styles.dayChipTextActive]}>
                    {day === 'All' ? day : day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 16 }}>
            <View style={styles.donutContainer}>
              <MacroDonut calories={totalCal} protein={totalPro} carbs={totalCar} fat={totalFat} size={200} />
              
              <View style={styles.macroLabelsRow}>
                 <View style={styles.macroLabelBox}>
                   <View style={[styles.macroDot, { backgroundColor: '#30D158' }]} />
                   <Text style={styles.macroLabelText}>{Math.round(totalPro)}g Pro</Text>
                 </View>
                 <View style={styles.macroLabelBox}>
                   <View style={[styles.macroDot, { backgroundColor: '#FFD60A' }]} />
                   <Text style={styles.macroLabelText}>{Math.round(totalCar)}g Carb</Text>
                 </View>
                 <View style={styles.macroLabelBox}>
                   <View style={[styles.macroDot, { backgroundColor: '#FF453A' }]} />
                   <Text style={styles.macroLabelText}>{Math.round(totalFat)}g Fat</Text>
                 </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Plan Targets</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={styles.label}>Calories</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editingPlan.targetCalories?.toString() || ''}
                  onChangeText={(val) => handleUpdatePlan({ targetCalories: val ? parseInt(val) : undefined })}
                  placeholder="e.g. 2500"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editingPlan.targetProtein?.toString() || ''}
                  onChangeText={(val) => handleUpdatePlan({ targetProtein: val ? parseInt(val) : undefined })}
                  placeholder="e.g. 160"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editingPlan.targetCarbs?.toString() || ''}
                  onChangeText={(val) => handleUpdatePlan({ targetCarbs: val ? parseInt(val) : undefined })}
                  placeholder="e.g. 250"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editingPlan.targetFat?.toString() || ''}
                  onChangeText={(val) => handleUpdatePlan({ targetFat: val ? parseInt(val) : undefined })}
                  placeholder="e.g. 70"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Scheduled Meals</Text>
              <TouchableOpacity onPress={() => {
                setIsAddingMeal(true);
                if (selectedFilterDay !== 'All') {
                  setSelectedDays([selectedFilterDay]);
                } else {
                  setSelectedDays(['Everyday']);
                }
              }}>
                <MaterialCommunityIcons name="plus-circle" size={24} color="#00D2FF" />
              </TouchableOpacity>
            </View>

            {sortedMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="food-apple-outline" size={48} color="#444" />
                <Text style={styles.emptyStateText}>No meals scheduled.</Text>
                <Text style={styles.emptyStateSubtext}>Tap + to schedule a saved recipe.</Text>
              </View>
            ) : (
              sortedMeals.map(meal => {
                const recipe = savedMeals.find(r => r.id === meal.recipeId);
                return (
                  <View key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealTime}>{meal.time}</Text>
                      <View style={styles.mealDaysContainer}>
                        {meal.dayOfWeek.includes('Everyday') ? (
                          <Text style={styles.mealDaysText}>Everyday</Text>
                        ) : (
                          meal.dayOfWeek.map(d => (
                            <Text key={d} style={styles.mealDaysText}>{d.substring(0,3)}</Text>
                          ))
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => {
                          setEditingMealId(meal.id);
                          setMealTime(meal.time);
                          setCustomMealName(meal.customName || '');
                          setSelectedDays(meal.dayOfWeek);
                          setMealServings(meal.servings?.toString() || '1');
                          setIsBalancerMeal(meal.isBalancerMeal || false);
                          setSelectedRecipe(savedMeals.find(r => r.id === meal.recipeId) || null);
                          setIsAddingMeal(true);
                        }}>
                          <MaterialCommunityIcons name="pencil" size={20} color="#00D2FF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteMeal(meal.id)}>
                          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={[styles.mealName, { flex: 1 }]}>{meal.customName || recipe?.name || 'Unknown Recipe'} {meal.servings && meal.servings !== 1 ? `(${meal.servings} servings)` : ''}</Text>
                      {meal.isBalancerMeal && (
                        <View style={styles.balancerMealBadge}>
                          <MaterialCommunityIcons name="scale-balance" size={12} color="#FF9500" />
                          <Text style={styles.balancerMealBadgeText}>Ausgleich</Text>
                        </View>
                      )}
                    </View>
                    {recipe && (() => {
                      const ratio = (meal.servings || 1) / (recipe.totalServings || 1);
                      return (
                        <Text style={styles.mealMacros}>
                          {Math.round(recipe.calories * ratio)} kcal • {Math.round(recipe.protein * ratio)}g P • {Math.round(recipe.carbs * ratio)}g C • {Math.round(recipe.fat * ratio)}g F
                        </Text>
                      );
                    })()}
                  </View>
                );
              })
            )}
            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Add Meal Bottom Sheet */}
          <SwipeableModal visible={isAddingMeal} onClose={() => {
            setIsAddingMeal(false);
            setEditingMealId(null);
            setMealServings('1');
            setRecipeSearchQuery('');
          }}>
            <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ padding: 16 }}>
              <Text style={styles.modalTitle}>Schedule Meal</Text>
              
              <Text style={styles.label}>Time (24h)</Text>
              <TextInput
                style={styles.input}
                value={mealTime}
                onChangeText={setMealTime}
                placeholder="12:00"
                placeholderTextColor="#666"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Custom Name (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={customMealName}
                    onChangeText={setCustomMealName}
                    placeholder="e.g. Pre-workout"
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.label}>Servings</Text>
                  <TextInput
                    style={styles.input}
                    value={mealServings}
                    onChangeText={setMealServings}
                    placeholder="1"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Balancer Meal Toggle */}
              <View style={styles.balancerToggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="scale-balance" size={18} color="#FF9500" />
                    <Text style={styles.balancerToggleTitle}>Als Ausgleichs-Mahlzeit festlegen</Text>
                  </View>
                  <Text style={styles.balancerToggleSub}>
                    Wird abends automatisch an verbleibende Kalorien angepasst.
                  </Text>
                </View>
                <Switch
                  value={isBalancerMeal}
                  onValueChange={setIsBalancerMeal}
                  trackColor={{ false: '#333', true: '#FF9500' }}
                />
              </View>

              <Text style={styles.label}>Days</Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, selectedDays.includes(day) && styles.dayChipActive]}
                    onPress={() => toggleDaySelection(day)}
                  >
                    <Text style={[styles.dayChipText, selectedDays.includes(day) && styles.dayChipTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Recipe</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                value={recipeSearchQuery}
                onChangeText={setRecipeSearchQuery}
                placeholder="Search saved recipes..."
                placeholderTextColor="#666"
              />
              {savedMeals.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>No saved recipes. Create one in Nutrition tab first!</Text>
              ) : (
                savedMeals.filter(r => r.name.toLowerCase().includes(recipeSearchQuery.toLowerCase())).map(recipe => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[styles.recipeRow, selectedRecipe?.id === recipe.id && styles.recipeRowActive]}
                    onPress={() => setSelectedRecipe(recipe)}
                  >
                    <View>
                      <Text style={[styles.recipeName, selectedRecipe?.id === recipe.id && { color: '#00D2FF' }]}>{recipe.name}</Text>
                      <Text style={styles.recipeMacros}>{recipe.calories} kcal • {recipe.protein}g Pro</Text>
                    </View>
                    {selectedRecipe?.id === recipe.id && <MaterialCommunityIcons name="check-circle" size={20} color="#00D2FF" />}
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMeal}>
                <Text style={styles.saveBtnText}>Add to Schedule</Text>
              </TouchableOpacity>
              <View style={{ height: 100 }} />
            </ScrollView>
          </SwipeableModal>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titleInput}>Diet Plans</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ padding: 16 }}>
          {dietPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#444" />
              <Text style={styles.emptyStateText}>No Diet Plans yet</Text>
            </View>
          ) : (
            dietPlans.map(plan => (
              <View key={plan.id} style={[styles.planCard, plan.isActive && styles.planCardActive]}>
                <View style={styles.planHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planGoal}>{plan.goal} • {plan.scheduledMeals.length} Meals</Text>
                  </View>
                  <Switch
                    value={plan.isActive}
                    onValueChange={() => toggleDietPlanActive(plan.id)}
                    trackColor={{ false: '#333', true: '#30D158' }}
                  />
                </View>
                <View style={styles.planActions}>
                  <TouchableOpacity 
                    style={styles.planBtn} 
                    onPress={() => {
                      setShoppingListPlanId(plan.id);
                      setShoppingListModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="cart-outline" size={16} color="#30D158" />
                    <Text style={[styles.planBtnText, { color: '#30D158' }]}>Einkaufsliste</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.planBtn} onPress={() => setEditingPlan(plan)}>
                    <MaterialCommunityIcons name="pencil" size={16} color="#00D2FF" />
                    <Text style={styles.planBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.planBtn} onPress={() => deleteDietPlan(plan.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF453A" />
                    <Text style={[styles.planBtnText, { color: '#FF453A' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.createRow}>
          <Text style={{ color: '#888', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Create New Plan</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#FF453A20' }]} onPress={() => handleCreatePlan('Cut')}>
              <Text style={[styles.createBtnText, { color: '#FF453A' }]}>CUT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#30D15820' }]} onPress={() => handleCreatePlan('Maintain')}>
              <Text style={[styles.createBtnText, { color: '#30D158' }]}>MAINTAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#00D2FF20' }]} onPress={() => handleCreatePlan('Bulk')}>
              <Text style={[styles.createBtnText, { color: '#00D2FF' }]}>BULK</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ShoppingListModal
          visible={shoppingListModalVisible}
          onClose={() => setShoppingListModalVisible(false)}
          targetPlanId={shoppingListPlanId}
        />
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333', paddingTop: 20 },
  titleInput: { flex: 1, color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  goalRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  goalBtn: { flex: 1, padding: 12, backgroundColor: '#1E1E1E', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  goalBtnActive: { backgroundColor: '#00D2FF20', borderColor: '#00D2FF' },
  goalBtnText: { color: '#888', fontWeight: '700' },
  goalBtnTextActive: { color: '#00D2FF' },
  donutContainer: { alignItems: 'center', marginVertical: 16 },
  macroLabelsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  macroLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabelText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyStateSubtext: { color: '#888', fontSize: 14, marginTop: 4 },
  
  mealCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTime: { color: '#00D2FF', fontSize: 16, fontWeight: '800' },
  mealDaysContainer: { flexDirection: 'row', gap: 4, flex: 1, marginHorizontal: 12, flexWrap: 'wrap' },
  mealDaysText: { color: '#888', fontSize: 10, backgroundColor: '#333', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', marginBottom: 2 },
  mealName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  mealMacros: { color: '#888', fontSize: 12, marginTop: 4 },

  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  label: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1E1E1E', color: '#FFF', padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { backgroundColor: '#1E1E1E', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  dayChipActive: { backgroundColor: '#00D2FF20', borderColor: '#00D2FF' },
  dayChipText: { color: '#888', fontSize: 12, fontWeight: '600' },
  dayChipTextActive: { color: '#00D2FF' },
  
  recipeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  recipeRowActive: { borderColor: '#00D2FF', backgroundColor: '#00D2FF10' },
  recipeName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  recipeMacros: { color: '#888', fontSize: 12, marginTop: 2 },
  
  saveBtn: { backgroundColor: '#00D2FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },

  planCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#333' },
  planCardActive: { borderColor: '#30D158' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  planGoal: { color: '#888', fontSize: 14, marginTop: 4 },
  planActions: { flexDirection: 'row', gap: 12 },
  planBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#121212', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  planBtnText: { color: '#00D2FF', fontSize: 14, fontWeight: '700' },
  
  createRow: { padding: 16, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: '#1E1E1E' },
  createBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  createBtnText: { fontWeight: '800' },

  balancerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#FF950040',
    borderRadius: 12,
    padding: 12,
    marginTop: 16
  },
  balancerToggleTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  balancerToggleSub: { color: '#888', fontSize: 11, marginTop: 2 },
  balancerMealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF950020',
    borderWidth: 1,
    borderColor: '#FF950040',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  balancerMealBadgeText: { color: '#FF9500', fontSize: 10, fontWeight: '800' }
});

