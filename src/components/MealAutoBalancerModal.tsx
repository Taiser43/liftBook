import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Vibration
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, RecipeIngredient, showCustomAlert } from '../store/store';
import { triggerSuccess, triggerLight } from '../utils/haptics';
import { resolveActiveNutritionTargets, calculateAusgleichsMeal } from '../utils/dietPlanEngine';

interface MealAutoBalancerModalProps {
  visible: boolean;
  onClose: () => void;
  targetMealId?: string | null;
}

export default function MealAutoBalancerModal({ visible, onClose, targetMealId }: MealAutoBalancerModalProps) {
  const insets = useSafeAreaInsets();
  const {
    dietPlans,
    savedMeals,
    targets,
    consumedToday,
    dailyTargetExtra,
    loggedMealsToday,
    skippedMealsToday,
    addLoggedMeal
  } = useAppStore();

  const activeDietPlan = dietPlans?.find(p => p.isActive);

  // Today's Day Name
  const todayName = useMemo(() => {
    const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return daysList[new Date().getDay()];
  }, []);

  // Reliable Active Targets from Diet Plan (explicit targetCalories or sum of scheduled meals)
  const activeTargets = useMemo(() => {
    return resolveActiveNutritionTargets(dietPlans, targets, dailyTargetExtra, savedMeals, todayName);
  }, [dietPlans, targets, dailyTargetExtra, savedMeals, todayName]);

  // Today's Scheduled Meals from Active Diet Plan
  const todaysScheduledMeals = useMemo(() => {
    if (!activeDietPlan || !activeDietPlan.scheduledMeals) return [];
    return activeDietPlan.scheduledMeals.filter(m =>
      m.dayOfWeek.includes('Everyday') || m.dayOfWeek.includes(todayName)
    ).sort((a, b) => a.time.localeCompare(b.time));
  }, [activeDietPlan, todayName]);

  // Pending / Remaining Meals
  const pendingMeals = useMemo(() => {
    return todaysScheduledMeals.filter(m =>
      !(skippedMealsToday || []).includes(m.id) &&
      !(loggedMealsToday || []).some(logged => logged.scheduledMealId === m.id)
    );
  }, [todaysScheduledMeals, skippedMealsToday, loggedMealsToday]);

  // Selected Meal State
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [balanceMode, setBalanceMode] = useState<'fullDay' | 'deductPending'>('fullDay');
  const [sliderRatio, setSliderRatio] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setSliderRatio(null); // Reset custom slider to auto-calculated ideal ratio
      if (targetMealId) {
        setSelectedMealId(targetMealId);
      } else {
        const designated = todaysScheduledMeals.find(m => m.isBalancerMeal);
        if (designated) {
          setSelectedMealId(designated.id);
        } else if (pendingMeals.length > 0) {
          setSelectedMealId(pendingMeals[pendingMeals.length - 1].id);
        } else if (todaysScheduledMeals.length > 0) {
          setSelectedMealId(todaysScheduledMeals[todaysScheduledMeals.length - 1].id);
        } else {
          setSelectedMealId(null);
        }
      }
    }
  }, [visible, targetMealId, pendingMeals, todaysScheduledMeals]);

  // Selected meal object (look in all today's meals so already logged/designated meals can be re-balanced)
  const currentMeal = useMemo(() => {
    if (selectedMealId) {
      const found = todaysScheduledMeals.find(m => m.id === selectedMealId);
      if (found) return found;
    }
    return pendingMeals.find(m => m.isBalancerMeal) ||
           todaysScheduledMeals.find(m => m.isBalancerMeal) ||
           pendingMeals[0] ||
           todaysScheduledMeals[0] ||
           null;
  }, [selectedMealId, todaysScheduledMeals, pendingMeals]);

  const currentRecipe = useMemo(() => {
    if (!currentMeal) return null;
    return savedMeals.find(r => r.id === currentMeal.recipeId) || null;
  }, [currentMeal, savedMeals]);

  // Sum of other pending plan meals (excluding current meal)
  const otherPendingCal = useMemo(() => {
    let sum = 0;
    pendingMeals.forEach(m => {
      if (currentMeal && m.id !== currentMeal.id) {
        const rec = savedMeals.find(r => r.id === m.recipeId);
        if (rec) {
          const s = rec.totalServings || 1;
          sum += Math.round((rec.calories / s) * (m.servings || 1));
        }
      }
    });
    return sum;
  }, [pendingMeals, currentMeal, savedMeals]);

  // Calculate Ausgleichsmahlzeit values
  const balanceCalculation = useMemo(() => {
    if (!currentMeal || !currentRecipe) return null;

    return calculateAusgleichsMeal({
      meal: currentMeal,
      recipe: currentRecipe,
      activeTargets,
      consumedToday,
      otherPendingCal,
      mode: balanceMode,
      customRatio: sliderRatio
    });
  }, [currentMeal, currentRecipe, activeTargets, consumedToday, otherPendingCal, balanceMode, sliderRatio]);

  // Handle Log Balanced Meal
  const handleLogBalancedMeal = () => {
    if (!currentMeal || !currentRecipe || !balanceCalculation) return;

    if (balanceCalculation.isOverBudget && balanceCalculation.remTotal <= 0 && balanceCalculation.scaledCal > 0) {
      showCustomAlert(
        'Tagesziel bereits voll',
        'Du hast dein Tagesziel für heute bereits erreicht oder überschritten.'
      );
      return;
    }

    const scaledIngs: RecipeIngredient[] = balanceCalculation.scaledIngredients.map(si => ({
      ingredient: si.ingredient,
      amount: si.scaledAmount
    }));

    addLoggedMeal({
      name: `${currentMeal.customName || currentRecipe.name} (Ausgleich)`,
      calories: balanceCalculation.scaledCal,
      protein: balanceCalculation.scaledPro,
      carbs: balanceCalculation.scaledCar,
      fat: balanceCalculation.scaledFat,
      ingredients: scaledIngs,
      scheduledMealId: currentMeal.id,
      recipeId: currentRecipe.id,
      servingsLogged: parseFloat(balanceCalculation.effectiveRatio.toFixed(2))
    });

    triggerSuccess();
    Vibration.vibrate(50);
    showCustomAlert('Ziel erreicht! ⭐', `Das Gericht wurde mit ${balanceCalculation.scaledCal} kcal geloggt.`);
    onClose();
  };

  const remTotal = activeTargets.calories - consumedToday.calories;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.planBadge}>
              <MaterialCommunityIcons name="scale-balance" size={14} color="#FF9500" />
              <Text style={styles.planBadgeText}>
                {activeTargets.isFromPlan ? `DIET PLAN: ${activeTargets.planName || 'AKTIV'}` : 'SMARTER PLAN-AUSGLEICH'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>Ausgleichs-Mahlzeit</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {/* Situation Card */}
          <View style={styles.situationCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.situationLabel}>NOCH OFFEN BIS ZUM TAGESZIEL:</Text>
                <Text style={[styles.situationValue, remTotal < 0 && { color: '#FF453A' }]}>
                  {remTotal >= 0 ? `${remTotal} kcal` : `+${Math.abs(remTotal)} kcal Überschuss`}
                </Text>
              </View>
              <View style={styles.targetsBadge}>
                <Text style={styles.targetsBadgeTitle}>Plan-Tagesziel</Text>
                <Text style={styles.targetsBadgeVal}>{activeTargets.calories} kcal</Text>
              </View>
            </View>
            <Text style={styles.situationSub}>
              Bereits gegessen: {consumedToday.calories} kcal • {activeTargets.source === 'dietPlanSum' ? 'Aus Mahlzeiten berechnet' : 'Aus Plan-Zielvorgabe'}
            </Text>
          </View>

          {/* Meal Selector if multiple meals exist today */}
          {todaysScheduledMeals.length > 1 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Mahlzeit im Plan auswählen:</Text>
              <View style={styles.mealsSelectorRow}>
                {todaysScheduledMeals.map(m => {
                  const isSel = m.id === (currentMeal?.id || selectedMealId);
                  const rec = savedMeals.find(r => r.id === m.recipeId);
                  const isLogged = (loggedMealsToday || []).some(l => l.scheduledMealId === m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.mealSelectChip, isSel && styles.mealSelectChipActive]}
                      onPress={() => {
                        setSelectedMealId(m.id);
                        setSliderRatio(null);
                        triggerLight();
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {m.isBalancerMeal ? (
                          <MaterialCommunityIcons name="scale-balance" size={14} color={isSel ? '#000' : '#FF9500'} />
                        ) : isLogged ? (
                          <MaterialCommunityIcons name="check" size={12} color={isSel ? '#000' : '#30D158'} />
                        ) : null}
                        <Text style={[styles.mealSelectChipText, isSel && styles.mealSelectChipTextActive]}>
                          {m.time} • {m.customName || rec?.name || 'Mahlzeit'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {!currentMeal || !currentRecipe || !balanceCalculation ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="calendar-alert" size={48} color="#FF9500" />
              <Text style={styles.emptyTitle}>Keine Plan-Mahlzeit gefunden</Text>
              <Text style={styles.emptySub}>
                Füge im aktiven Diet Plan Mahlzeiten für heute hinzu oder markiere eine als Ausgleichs-Mahlzeit.
              </Text>
            </View>
          ) : (
            <View>
              {/* Mode Toggle: Full Day vs Deduct Pending */}
              {otherPendingCal > 0 && remTotal > 0 && (
                <View style={styles.modeContainer}>
                  <Text style={styles.modeLabel}>BERECHNUNGS-MODUS:</Text>
                  <View style={styles.modeToggleRow}>
                    <TouchableOpacity
                      style={[styles.modeToggleBtn, balanceMode === 'fullDay' && styles.modeToggleBtnActive]}
                      onPress={() => {
                        setBalanceMode('fullDay');
                        setSliderRatio(null);
                        triggerLight();
                      }}
                    >
                      <MaterialCommunityIcons
                        name="bullseye-arrow"
                        size={14}
                        color={balanceMode === 'fullDay' ? '#000' : '#00D2FF'}
                      />
                      <Text style={[styles.modeToggleText, balanceMode === 'fullDay' && styles.modeToggleTextActive]}>
                        Voller Ausgleich ({remTotal} kcal)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modeToggleBtn, balanceMode === 'deductPending' && styles.modeToggleBtnActive]}
                      onPress={() => {
                        setBalanceMode('deductPending');
                        setSliderRatio(null);
                        triggerLight();
                      }}
                    >
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={14}
                        color={balanceMode === 'deductPending' ? '#000' : '#AAA'}
                      />
                      <Text style={[styles.modeToggleText, balanceMode === 'deductPending' && styles.modeToggleTextActive]}>
                        Spätere freihalten (-{otherPendingCal} kcal)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Dynamic Calculation Hero Banner */}
              <View style={[styles.balancerHeroCard, balanceCalculation.isOverBudget && styles.balancerHeroCardOver]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={styles.calcBadge}>
                      <Text style={styles.calcBadgeText}>
                        {currentMeal.isBalancerMeal ? '⚖️ FESTGELEGTE AUSGLEICHS-MAHLZEIT' : 'GEWÄHLTE MAHLZEIT'}
                      </Text>
                    </View>
                    <Text style={styles.recipeTitle}>{currentMeal.customName || currentRecipe.name}</Text>
                    <Text style={styles.recipeSub}>
                      Im Diet Plan: {balanceCalculation.origMealCal} kcal • {currentMeal.servings || 1} Portion(en)
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ratioTag, balanceCalculation.isOverBudget && { color: '#FF453A' }]}>
                      {balanceCalculation.effectiveRatio.toFixed(2)}x
                    </Text>
                    <Text style={styles.ratioPct}>
                      {balanceCalculation.pct}% der Portion
                    </Text>
                  </View>
                </View>

                {/* Macro Adjustment Pills */}
                <View style={styles.macroPillsRow}>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillLabel}>KALORIEN</Text>
                    <Text style={[styles.macroPillVal, { color: '#00D2FF' }]}>{balanceCalculation.scaledCal} kcal</Text>
                    <Text style={styles.macroPillDiff}>
                      {balanceCalculation.scaledCal - balanceCalculation.origMealCal >= 0 ? '+' : ''}
                      {balanceCalculation.scaledCal - balanceCalculation.origMealCal} kcal
                    </Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillLabel}>PROTEIN</Text>
                    <Text style={[styles.macroPillVal, { color: '#30D158' }]}>{balanceCalculation.scaledPro}g</Text>
                    <Text style={styles.macroPillDiff}>von {balanceCalculation.origMealPro}g</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillLabel}>CARBS</Text>
                    <Text style={[styles.macroPillVal, { color: '#FFD60A' }]}>{balanceCalculation.scaledCar}g</Text>
                    <Text style={styles.macroPillDiff}>von {balanceCalculation.origMealCar}g</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillLabel}>FETT</Text>
                    <Text style={[styles.macroPillVal, { color: '#FF453A' }]}>{balanceCalculation.scaledFat}g</Text>
                    <Text style={styles.macroPillDiff}>von {balanceCalculation.origMealFat}g</Text>
                  </View>
                </View>

                {/* Status Message */}
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationText}>
                    {balanceCalculation.statusMessage}
                  </Text>
                </View>
              </View>

              {/* INTERACTIVE SLIDER / REGLER */}
              <View style={styles.sliderCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.sliderCardTitle}>PORTIONS-REGLER (INTERAKTIV)</Text>
                  <Text style={styles.sliderCurrentText}>
                    {balanceCalculation.effectiveRatio.toFixed(2)}x ({balanceCalculation.scaledCal} kcal)
                  </Text>
                </View>

                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0.2}
                  maximumValue={Math.max(2.5, Math.ceil(balanceCalculation.idealRatio * 1.3 * 10) / 10)}
                  step={0.02}
                  value={balanceCalculation.effectiveRatio}
                  onValueChange={(val) => {
                    setSliderRatio(val);
                  }}
                  minimumTrackTintColor="#00D2FF"
                  maximumTrackTintColor="#333333"
                  thumbTintColor="#00D2FF"
                />

                {/* Quick Selection Buttons */}
                <View style={styles.quickChipsRow}>
                  {remTotal > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.quickChip,
                        Math.abs(balanceCalculation.effectiveRatio - balanceCalculation.idealRatio) < 0.03 && styles.quickChipActive
                      ]}
                      onPress={() => {
                        setSliderRatio(null);
                        triggerLight();
                      }}
                    >
                      <Text style={[
                        styles.quickChipText,
                        Math.abs(balanceCalculation.effectiveRatio - balanceCalculation.idealRatio) < 0.03 && styles.quickChipTextActive
                      ]}>
                        🎯 Perfekter Ausgleich ({balanceCalculation.budget} kcal)
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.quickChip,
                      Math.abs(balanceCalculation.effectiveRatio - 1.0) < 0.03 && styles.quickChipActive
                    ]}
                    onPress={() => {
                      setSliderRatio(1.0);
                      triggerLight();
                    }}
                  >
                    <Text style={[
                      styles.quickChipText,
                      Math.abs(balanceCalculation.effectiveRatio - 1.0) < 0.03 && styles.quickChipTextActive
                    ]}>
                      1.0x Plan ({balanceCalculation.origMealCal} kcal)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickChipSmall}
                    onPress={() => {
                      setSliderRatio(Math.max(0.2, parseFloat((balanceCalculation.effectiveRatio - 0.2).toFixed(2))));
                      triggerLight();
                    }}
                  >
                    <Text style={styles.quickChipText}>-20%</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickChipSmall}
                    onPress={() => {
                      setSliderRatio(parseFloat((balanceCalculation.effectiveRatio + 0.2).toFixed(2)));
                      triggerLight();
                    }}
                  >
                    <Text style={styles.quickChipText}>+20%</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exact Ingredients in Grams for Cooking */}
              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.sectionTitle}>Zutatenmengen zum Kochen (grammgenau):</Text>
                  <Text style={styles.subHint}>Auf Küchenwaage abwiegen</Text>
                </View>

                {balanceCalculation.scaledIngredients.map((ing, idx) => (
                  <View key={ing.ingredient.id || idx} style={styles.ingredientRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ingName}>{ing.ingredient.name}</Text>
                      <Text style={styles.ingOrigText}>Plan-Original: {ing.originalAmount}g</Text>
                    </View>
                    <View style={styles.scaledGramBadge}>
                      <Text style={styles.scaledGramText}>{ing.scaledAmount} g</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* One-Tap Action Button */}
              <TouchableOpacity
                style={[
                  styles.logBtn,
                  balanceCalculation.isOverBudget && remTotal <= 0 && styles.logBtnDisabled
                ]}
                onPress={handleLogBalancedMeal}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="check" size={20} color="#000" />
                <Text style={styles.logBtnText}>
                  Als ausgeglichene Portion ({balanceCalculation.scaledCal} kcal) loggen
                </Text>
              </TouchableOpacity>
              <Text style={styles.logSubtext}>
                Trägt das Gericht mit den berechneten Makros & grammgenauen Zutaten direkt in den Tages-Log ein.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828'
  },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  planBadgeText: { color: '#FF9500', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },

  situationCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginBottom: 16
  },
  situationLabel: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  situationValue: { color: '#00D2FF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  situationSub: { color: '#AAA', fontSize: 11, marginTop: 6 },
  targetsBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'flex-end'
  },
  targetsBadgeTitle: { color: '#888', fontSize: 9, fontWeight: '700' },
  targetsBadgeVal: { color: '#FFF', fontSize: 13, fontWeight: '900' },

  sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  subHint: { color: '#00D2FF', fontSize: 11, fontWeight: '600' },
  mealsSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mealSelectChip: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E'
  },
  mealSelectChipActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  mealSelectChipText: { color: '#888', fontSize: 12, fontWeight: '700' },
  mealSelectChipTextActive: { color: '#000', fontWeight: '900' },

  modeContainer: {
    backgroundColor: '#18181A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginBottom: 14
  },
  modeLabel: { color: '#777', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  modeToggleRow: { flexDirection: 'row', gap: 8 },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#242426',
    borderWidth: 1,
    borderColor: '#333'
  },
  modeToggleBtnActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF'
  },
  modeToggleText: { color: '#AAA', fontSize: 11, fontWeight: '700' },
  modeToggleTextActive: { color: '#000', fontWeight: '900' },

  balancerHeroCard: {
    backgroundColor: '#161F24',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#00D2FF'
  },
  balancerHeroCardOver: {
    backgroundColor: '#241616',
    borderColor: '#FF453A'
  },
  calcBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00D2FF20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6
  },
  calcBadgeText: { color: '#00D2FF', fontSize: 10, fontWeight: '900' },
  recipeTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  recipeSub: { color: '#888', fontSize: 12, marginTop: 2 },
  ratioTag: { color: '#00D2FF', fontSize: 24, fontWeight: '900' },
  ratioPct: { color: '#888', fontSize: 11, fontWeight: '700' },

  macroPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#00D2FF25'
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center'
  },
  macroPillLabel: { color: '#777', fontSize: 9, fontWeight: '700' },
  macroPillVal: { color: '#FFF', fontSize: 13, fontWeight: '900', marginTop: 2 },
  macroPillDiff: { color: '#888', fontSize: 9, marginTop: 1 },

  explanationBox: {
    backgroundColor: '#12121280',
    borderRadius: 10,
    padding: 10,
    marginTop: 12
  },
  explanationText: { color: '#DDD', fontSize: 11, lineHeight: 16 },

  sliderCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E'
  },
  sliderCardTitle: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sliderCurrentText: { color: '#00D2FF', fontSize: 12, fontWeight: '800' },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  quickChip: {
    backgroundColor: '#282828',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#383838'
  },
  quickChipSmall: {
    backgroundColor: '#282828',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#383838'
  },
  quickChipActive: {
    backgroundColor: '#00D2FF25',
    borderColor: '#00D2FF'
  },
  quickChipText: { color: '#AAA', fontSize: 11, fontWeight: '700' },
  quickChipTextActive: { color: '#00D2FF', fontWeight: '900' },

  ingredientRow: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ingName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  ingOrigText: { color: '#777', fontSize: 11, marginTop: 2 },
  scaledGramBadge: {
    backgroundColor: '#00D2FF20',
    borderWidth: 1,
    borderColor: '#00D2FF40',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  scaledGramText: { color: '#00D2FF', fontSize: 14, fontWeight: '900' },

  logBtn: {
    backgroundColor: '#00D2FF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  logBtnDisabled: { backgroundColor: '#444', shadowOpacity: 0 },
  logBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },
  logSubtext: { color: '#777', fontSize: 11, textAlign: 'center', marginTop: 8 },

  emptyBox: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E'
  },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySub: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'center' }
});
