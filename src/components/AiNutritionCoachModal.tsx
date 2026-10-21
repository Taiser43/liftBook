import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Recipe, showCustomAlert } from '../store/store';
import { triggerSuccess, triggerLight } from '../utils/haptics';
import { getAppTheme } from '../utils/theme';
import {
  getCoachMealSuggestions,
  CoachRecipeSuggestion,
  MacroCoachRequest,
} from '../services/aiNutritionCoachService';

interface AiNutritionCoachModalProps {
  visible: boolean;
  onClose: () => void;
  remainingCal: number;
  remainingPro: number;
  remainingCar: number;
  remainingFat: number;
}

export default function AiNutritionCoachModal({
  visible,
  onClose,
  remainingCal,
  remainingPro,
  remainingCar,
  remainingFat,
}: AiNutritionCoachModalProps) {
  const insets = useSafeAreaInsets();
  const { accentThemeId, addLoggedMeal, addSavedMeal, geminiApiKey, setGeminiApiKey } = useAppStore();
  const theme = getAppTheme(accentThemeId);

  const [activeCategory, setActiveCategory] = useState<'all' | 'shake' | 'bowl' | 'savory' | 'snack'>('all');
  const [recipes, setRecipes] = useState<CoachRecipeSuggestion[]>([]);
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(geminiApiKey || '');

  // Lade Vorschläge
  const fetchSuggestions = useCallback(async (forcedCategory?: string) => {
    setIsLoading(true);
    try {
      const cat = (forcedCategory || activeCategory) as any;
      const request: MacroCoachRequest = {
        remainingCalories: remainingCal,
        remainingProtein: remainingPro,
        remainingCarbs: remainingCar,
        remainingFat: remainingFat,
        category: cat,
        apiKey: geminiApiKey,
      };

      const results = await getCoachMealSuggestions(request);
      setRecipes(results);

      // Erstes Rezept per Default aufklappen
      if (results.length > 0) {
        setExpandedRecipeIds({ [results[0].id]: true });
      }
    } catch (err) {
      console.warn('Fehler beim Laden der Coach-Vorschläge:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, remainingCal, remainingPro, remainingCar, remainingFat, geminiApiKey]);

  useEffect(() => {
    if (visible) {
      fetchSuggestions();
    }
  }, [visible, fetchSuggestions]);

  // Umschalten einzelner Rezepte
  const toggleRecipeExpanded = (id: string) => {
    triggerLight();
    setExpandedRecipeIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Alle aufklappen / einklappen
  const toggleAllExpanded = () => {
    triggerLight();
    const allExpanded = recipes.every((r) => expandedRecipeIds[r.id]);
    if (allExpanded) {
      setExpandedRecipeIds({});
    } else {
      const nextState: Record<string, boolean> = {};
      recipes.forEach((r) => {
        nextState[r.id] = true;
      });
      setExpandedRecipeIds(nextState);
    }
  };

  const handleLogMeal = (recipe: CoachRecipeSuggestion) => {
    triggerSuccess();
    addLoggedMeal({
      name: `✨ ${recipe.title}`,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    });
    showCustomAlert('Eingebucht!', `"${recipe.title}" (${recipe.calories} kcal) wurde zu deinen heutigen Mahlzeiten hinzugefügt.`);
    onClose();
  };

  const handleSaveAsRecipe = (recipe: CoachRecipeSuggestion) => {
    triggerLight();
    const newRecipe: Recipe = {
      id: `ai_recipe_${Date.now()}`,
      name: recipe.title,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      totalServings: 1,
    };
    addSavedMeal(newRecipe);
    showCustomAlert('Rezept gemerkt', `"${recipe.title}" wurde in deinen Rezepten gespeichert.`);
  };

  const handleSaveApiKey = () => {
    triggerLight();
    setGeminiApiKey(apiKeyDraft.trim());
    setShowApiKeyInput(false);
    showCustomAlert('Gespeichert', 'Dein Gemini API-Key wurde hinterlegt.');
    fetchSuggestions();
  };

  const allAreExpanded = recipes.length > 0 && recipes.every((r) => expandedRecipeIds[r.id]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 12 }]}>
        {/* MODAL HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.subtleBorder }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.aiBadgeRow}>
              <View style={[styles.aiPill, { backgroundColor: 'rgba(192, 132, 252, 0.15)', borderColor: 'rgba(192, 132, 252, 0.4)' }]}>
                <MaterialCommunityIcons name="auto-fix" size={13} color="#C084FC" />
                <Text style={styles.aiPillText}>AI MACRO COACH</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowApiKeyInput(!showApiKeyInput)}
                style={[styles.apiKeyToggleBtn, { backgroundColor: theme.subCardBg }]}
              >
                <MaterialCommunityIcons name="key-outline" size={11} color={geminiApiKey ? '#30D158' : '#AAA'} />
                <Text style={[styles.apiKeyToggleText, geminiApiKey ? { color: '#30D158' } : { color: '#AAA' }]}>
                  {geminiApiKey ? 'Gemini Key aktiv' : 'Key eintragen'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Offene Makros füllen</Text>
          </View>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.subCardBg }]} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* OPTIONAL GEMINI API KEY INPUT DRAWER */}
        {showApiKeyInput && (
          <View style={[styles.apiKeyDrawer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={styles.apiKeyLabel}>Google Gemini API Key (optional für unbegrenzt Live-KI-Ideen):</Text>
            <View style={styles.apiKeyInputRow}>
              <TextInput
                style={[styles.apiKeyTextInput, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                placeholder="AIzaSy..."
                placeholderTextColor="#666"
                value={apiKeyDraft}
                onChangeText={setApiKeyDraft}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity style={[styles.apiKeySaveBtn, { backgroundColor: theme.accent }]} onPress={handleSaveApiKey}>
                <Text style={styles.apiKeySaveBtnText}>Speichern</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.apiKeyHint}>Ohne Key nutzt der Coach die integrierte Smart-Scaling Fitness-Engine.</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {/* MACRO DEFICIT HERO CARD */}
          <View style={[styles.deficitCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.deficitHeader}>
              <Text style={styles.deficitCardLabel}>DEINE LÜCKE FÜR HEUTE</Text>
              <Text style={[styles.deficitCardRemaining, { color: theme.accent }]}>
                {remainingCal > 0 ? `${remainingCal} kcal offen` : 'Ziel erreicht!'}
              </Text>
            </View>

            <View style={styles.macroPillsRow}>
              <View style={[styles.macroPillBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.macroPillLabel}>PROTEIN</Text>
                <Text style={[styles.macroPillValue, { color: '#30D158' }]}>{remainingPro}g</Text>
              </View>
              <View style={[styles.macroPillBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.macroPillLabel}>CARBS</Text>
                <Text style={[styles.macroPillValue, { color: '#FFD60A' }]}>{remainingCar}g</Text>
              </View>
              <View style={[styles.macroPillBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.macroPillLabel}>FETT</Text>
                <Text style={[styles.macroPillValue, { color: '#FF453A' }]}>{remainingFat}g</Text>
              </View>
            </View>
            <Text style={styles.coachInsightText}>
              💡 Jedes Menü zeigt grammgenaue Zutaten & eine Express-Zubereitung passend zu deiner Lücke.
            </Text>
          </View>

          {/* CATEGORY FILTER CHIPS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
            {[
              { id: 'all', label: 'Alle Ideen' },
              { id: 'shake', label: '🥤 Shakes' },
              { id: 'bowl', label: '🥣 Bowls & Fluffs' },
              { id: 'savory', label: '🍳 Herzhaft' },
              { id: 'snack', label: '🥨 Snacks' },
            ].map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                    active && { backgroundColor: theme.accentBgSoft, borderColor: theme.accent },
                  ]}
                  onPress={() => {
                    triggerLight();
                    setActiveCategory(cat.id as any);
                    fetchSuggestions(cat.id);
                  }}
                >
                  <Text style={[styles.chipText, active && { color: theme.accent, fontWeight: '800' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* LIST CONTROLS HEADER */}
          <View style={styles.listControlRow}>
            <Text style={styles.listSectionTitle}>PASSENDE MENÜS ({recipes.length})</Text>
            <TouchableOpacity onPress={toggleAllExpanded} style={styles.toggleAllBtn}>
              <MaterialCommunityIcons
                name={allAreExpanded ? 'unfold-less-horizontal' : 'unfold-more-horizontal'}
                size={14}
                color={theme.accent}
              />
              <Text style={[styles.toggleAllText, { color: theme.accent }]}>
                {allAreExpanded ? 'Alle einklappen' : 'Alle Details zeigen'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* REZEPT-VORSCHLÄGE */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>Kalkuliere Zutaten & Makros...</Text>
            </View>
          ) : (
            recipes.map((recipe, index) => {
              const isExpanded = !!expandedRecipeIds[recipe.id];

              return (
                <View
                  key={recipe.id}
                  style={[
                    styles.recipeCard,
                    { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                    isExpanded && { borderColor: '#C084FC', borderWidth: 1.5 },
                  ]}
                >
                  {/* Card Header (Tippen öffnet / schließt das Menü) */}
                  <TouchableOpacity
                    style={styles.cardHeaderPressable}
                    activeOpacity={0.8}
                    onPress={() => toggleRecipeExpanded(recipe.id)}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTitleBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.indexPill, { backgroundColor: theme.subCardBg }]}>
                            <Text style={styles.indexPillText}>#{index + 1}</Text>
                          </View>
                          <MaterialCommunityIcons name={recipe.icon as any} size={18} color="#C084FC" />
                          <Text style={styles.cardTitle} numberOfLines={1}>{recipe.title}</Text>
                        </View>
                        <Text style={styles.cardReasonText}>{recipe.reasonWhy}</Text>
                      </View>

                      <View style={styles.cardBadgeMeta}>
                        <Text style={styles.prepTimeText}>⏱️ {recipe.prepTimeMinutes} Min</Text>
                        <View style={[styles.chevronBadge, isExpanded && { backgroundColor: 'rgba(192, 132, 252, 0.2)' }]}>
                          <MaterialCommunityIcons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={isExpanded ? '#C084FC' : '#888'}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Macro Badges Bar */}
                    <View style={styles.cardMacroRow}>
                      <View style={[styles.macroBadge, { backgroundColor: 'rgba(0, 210, 255, 0.12)' }]}>
                        <Text style={[styles.macroBadgeVal, { color: theme.accent }]}>{recipe.calories}</Text>
                        <Text style={styles.macroBadgeUnit}>kcal</Text>
                      </View>
                      <View style={[styles.macroBadge, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                        <Text style={[styles.macroBadgeVal, { color: '#30D158' }]}>{recipe.protein}g</Text>
                        <Text style={styles.macroBadgeUnit}>Protein</Text>
                      </View>
                      <View style={[styles.macroBadge, { backgroundColor: 'rgba(255, 214, 10, 0.12)' }]}>
                        <Text style={[styles.macroBadgeVal, { color: '#FFD60A' }]}>{recipe.carbs}g</Text>
                        <Text style={styles.macroBadgeUnit}>Carbs</Text>
                      </View>
                      <View style={[styles.macroBadge, { backgroundColor: 'rgba(255, 69, 58, 0.12)' }]}>
                        <Text style={[styles.macroBadgeVal, { color: '#FF453A' }]}>{recipe.fat}g</Text>
                        <Text style={styles.macroBadgeUnit}>Fett</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Aufgeklappter Bereich: ZUTATEN & ZUBEREITUNG FÜR JEDES MENÜ */}
                  {isExpanded && (
                    <View style={[styles.cardExpandedContent, { borderTopColor: theme.subtleBorder }]}>
                      {/* ZUTATEN */}
                      <View style={styles.sectionHeaderRow}>
                        <MaterialCommunityIcons name="format-list-checks" size={14} color={theme.accent} />
                        <Text style={styles.sectionSubHeader}>ZUTATEN (EXAKT ABGEMESSEN):</Text>
                      </View>

                      <View style={styles.ingredientsBox}>
                        {recipe.ingredients.map((ing, idx) => (
                          <View key={idx} style={[styles.ingredientRow, { borderBottomColor: theme.subtleBorder }]}>
                            <Text style={styles.ingredientName}>• {ing.name}</Text>
                            <View style={styles.ingredientRightCol}>
                              <Text style={[styles.ingredientAmount, { color: theme.accent }]}>{ing.amount}</Text>
                              <Text style={styles.ingredientSubMacro}>({ing.calories} kcal • {ing.protein}g P)</Text>
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* ZUBEREITUNG */}
                      <View style={styles.sectionHeaderRow}>
                        <MaterialCommunityIcons name="chef-hat" size={14} color="#FFD60A" />
                        <Text style={styles.sectionSubHeader}>SCHNELLE ZUBEREITUNG:</Text>
                      </View>

                      <View style={styles.stepsBox}>
                        {recipe.instructions.map((step, idx) => (
                          <View key={idx} style={styles.stepItemRow}>
                            <View style={styles.stepNumberBadge}>
                              <Text style={styles.stepNumberText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>

                      {/* PRO-TIPP */}
                      {recipe.proTip ? (
                        <View style={[styles.proTipBox, { backgroundColor: 'rgba(192, 132, 252, 0.08)', borderColor: 'rgba(192, 132, 252, 0.25)' }]}>
                          <MaterialCommunityIcons name="lightbulb-on" size={16} color="#C084FC" />
                          <Text style={styles.proTipText}>{recipe.proTip}</Text>
                        </View>
                      ) : null}

                      {/* ACTION BUTTONS (IN TAG BUCHEN / MERKEN) */}
                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={[styles.primaryLogBtn, { backgroundColor: '#30D158' }]}
                          onPress={() => handleLogMeal(recipe)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="plus-circle" size={18} color="#000" />
                          <Text style={styles.primaryLogBtnText}>In Tag einbuchen ({recipe.calories} kcal)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.secondarySaveBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
                          onPress={() => handleSaveAsRecipe(recipe)}
                        >
                          <MaterialCommunityIcons name="bookmark-outline" size={17} color="#FFF" />
                          <Text style={styles.secondarySaveBtnText}>Merken</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* REFRESH / SHUFFLE BUTTON */}
          <TouchableOpacity
            style={[styles.shuffleBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
            onPress={() => {
              triggerLight();
              fetchSuggestions();
            }}
          >
            <MaterialCommunityIcons name="cached" size={18} color={theme.accent} />
            <Text style={[styles.shuffleBtnText, { color: theme.accent }]}>Andere Vorschläge berechnen</Text>
          </TouchableOpacity>
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
  },
  aiBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiPillText: { color: '#C084FC', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  apiKeyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  apiKeyToggleText: { fontSize: 10, fontWeight: '700' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiKeyDrawer: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  apiKeyLabel: { color: '#AAA', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  apiKeyInputRow: { flexDirection: 'row', gap: 8 },
  apiKeyTextInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    color: '#FFF',
    fontSize: 12,
  },
  apiKeySaveBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiKeySaveBtnText: { color: '#000', fontSize: 12, fontWeight: '800' },
  apiKeyHint: { color: '#666', fontSize: 10, marginTop: 4 },
  deficitCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  deficitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deficitCardLabel: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  deficitCardRemaining: { fontSize: 13, fontWeight: '800' },
  macroPillsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  macroPillBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  macroPillLabel: { color: '#777', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  macroPillValue: { fontSize: 15, fontWeight: '900' },
  coachInsightText: { color: '#999', fontSize: 11, lineHeight: 15 },
  chipsScroll: { marginBottom: 12 },
  chipsContent: { gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { color: '#AAA', fontSize: 12, fontWeight: '600' },
  listControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  listSectionTitle: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  toggleAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleAllText: { fontSize: 11, fontWeight: '700' },
  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingText: { color: '#888', fontSize: 13, fontWeight: '600' },
  recipeCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeaderPressable: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleBox: { flex: 1, marginRight: 8 },
  indexPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  indexPillText: { color: '#AAA', fontSize: 10, fontWeight: '800' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', flexShrink: 1 },
  cardReasonText: { color: '#999', fontSize: 11, marginTop: 4, lineHeight: 15 },
  cardBadgeMeta: { alignItems: 'flex-end', gap: 4 },
  prepTimeText: { color: '#AAA', fontSize: 11, fontWeight: '700' },
  chevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMacroRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  macroBadge: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  macroBadgeVal: { fontSize: 13, fontWeight: '900' },
  macroBadgeUnit: { color: '#888', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  cardExpandedContent: {
    padding: 14,
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionSubHeader: { color: '#AAA', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  ingredientsBox: { marginBottom: 12 },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ingredientName: { color: '#EEE', fontSize: 12, flex: 1, marginRight: 8 },
  ingredientRightCol: { alignItems: 'flex-end' },
  ingredientAmount: { fontSize: 12, fontWeight: '700' },
  ingredientSubMacro: { color: '#666', fontSize: 9, marginTop: 1 },
  stepsBox: { marginBottom: 12, gap: 8 },
  stepItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNumberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { color: '#FFD60A', fontSize: 10, fontWeight: '900' },
  stepText: { color: '#CCC', fontSize: 12, flex: 1, lineHeight: 17 },
  proTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  proTipText: { color: '#DDD', fontSize: 11, flex: 1, fontStyle: 'italic', lineHeight: 15 },
  actionBtnRow: { flexDirection: 'row', gap: 10 },
  primaryLogBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryLogBtnText: { color: '#000', fontSize: 13, fontWeight: '900' },
  secondarySaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondarySaveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  shuffleBtnText: { fontSize: 13, fontWeight: '800' },
});
