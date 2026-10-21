import React, { useState, useEffect } from 'react';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  Image,
  Keyboard,
  Platform,
  StatusBar,
  ScrollView as RNScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore, Ingredient, Recipe, RecipeIngredient, LoggedMeal, ScheduledMeal, showCustomAlert } from '../store/store';
import SwipeableModal from '../components/SwipeableModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import DietPlanManager from '../components/DietPlanManager';
import MacroProgressBar from '../components/MacroProgressBar';
import EnhancedRecipeBuilder from '../components/EnhancedRecipeBuilder';
import ShoppingListModal from '../components/ShoppingListModal';
import MealAutoBalancerModal from '../components/MealAutoBalancerModal';
import AiNutritionCoachModal from '../components/AiNutritionCoachModal';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { triggerSuccess, triggerLight } from '../utils/haptics';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
import { BottomSheetWrapper } from '../components/BottomSheetWrapper';
import { getResolvedUri } from '../utils/uriResolver';
import { resolveActiveNutritionTargets } from '../utils/dietPlanEngine';
import { getAppTheme } from '../utils/theme';
import AccentThemePickerModal from '../components/AccentThemePickerModal';

export default function NutritionScreen() {
  const bottomSpacing = useBottomSpacing();
  const insets = useSafeAreaInsets();
  
  const { 
    targets, 
    setTargets,
    consumedToday, 
    loggedMealsToday, 
    skippedMealsToday,
    resetConsumed, 
    addLoggedMeal, 
    deleteLoggedMeal,
    moveMealToYesterday, 
    updateLoggedMealIngredientAmount,
    savedMeals, 
    addSavedMeal, 
    updateSavedMeal,
    deleteSavedMeal,
    collectibleImages,
    ingredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    incrementIngredientUsage,
    nutritionHistory,
    addDailyTargetExtra,
    dailyTargetExtra,
    accentThemeId
  } = useAppStore();

  const theme = getAppTheme(accentThemeId);
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  const pickRecipeImage = async (recipe: Recipe) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        updateSavedMeal({
          ...recipe,
          imageUri: result.assets[0].uri
        });
        triggerSuccess();
      }
    } catch (err) {
      console.warn('Error picking recipe image:', err);
    }
  };

  // Navigation Modals
  const [managerVisible, setManagerVisible] = useState<'recipes' | 'ingredients' | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [expandedHistoryDate, setExpandedHistoryDate] = useState<string | null>(null);
  const [quickScanModalVisible, setQuickScanModalVisible] = useState(false);
  const [scannedIngredient, setScannedIngredient] = useState<any>(null);
  const [actionMealId, setActionMealId] = useState<string | null>(null);

  const [portionGrams, setPortionGrams] = useState('100');
  const [globalTargetsEditorVisible, setGlobalTargetsEditorVisible] = useState(false);

  const [onlineSearchVisible, setOnlineSearchVisible] = useState(false);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [onlineSearchResults, setOnlineSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOnlineFood, setSelectedOnlineFood] = useState<any>(null);
  const [onlineFoodPortion, setOnlineFoodPortion] = useState('100');
  
  const searchOnlineFood = async () => {
    if (!onlineSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const q = encodeURIComponent(onlineSearchQuery.trim());
      
      const fetchWithRetry = async (url: string, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('API Error');
            return await res.json();
          } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      };

      const data = await fetchWithRetry(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=50`);
      
      if (data && data.products) {
        let validProducts = data.products.filter((p: any) => 
          p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] !== undefined || p.nutriments.energy_100g !== undefined)
        );
        
        const searchLower = onlineSearchQuery.trim().toLowerCase();
        
        validProducts.sort((a: any, b: any) => {
          const nameA = a.product_name.toLowerCase();
          const nameB = b.product_name.toLowerCase();
          let scoreA = 2; let scoreB = 2;
          if (nameA === searchLower) scoreA = 0;
          else if (nameA.includes(searchLower)) scoreA = 1;
          if (nameB === searchLower) scoreB = 0;
          else if (nameB.includes(searchLower)) scoreB = 1;
          
          if (scoreA !== scoreB) return scoreA - scoreB;
          return nameA.length - nameB.length;
        });

        const seenNames = new Set();
        validProducts = validProducts.filter((p: any) => {
          const n = p.product_name.toLowerCase();
          if (seenNames.has(n)) return false;
          seenNames.add(n);
          return true;
        });

        setOnlineSearchResults(validProducts.slice(0, 30));
      }
    } catch (e) {
      console.warn("OpenFoodFacts search failed:", e);
      Alert.alert('Fehler', 'Die Online-Datenbank konnte nicht erreicht werden. Bitte überprüfe deine Verbindung oder versuche es gleich noch einmal.');
    } finally {
      setIsSearching(false);
    }
  };

  
  // Diet Plans
  const [dietPlanManagerVisible, setDietPlanManagerVisible] = useState(false);
  const [initialPlanIdToEdit, setInitialPlanIdToEdit] = useState<string | null>(null);
  const { dietPlans, updateDietPlan } = useAppStore();
  const activeDietPlan = dietPlans?.find(p => p.isActive);

  // Today's Plan Meals & Balancer Meal Logic
  const todayDayName = React.useMemo(() => {
    const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return daysList[new Date().getDay()];
  }, []);

  // Reliable Active Targets from Diet Plan (explicit targetCalories or sum of scheduled meals)
  const activeTargets = React.useMemo(() => {
    return resolveActiveNutritionTargets(dietPlans, targets, dailyTargetExtra, savedMeals, todayDayName);
  }, [dietPlans, targets, dailyTargetExtra, savedMeals, todayDayName]);

  // Shopping List & Balancer Modals
  const [shoppingListVisible, setShoppingListVisible] = useState(false);
  const [balancerModalVisible, setBalancerModalVisible] = useState(false);
  const [aiCoachModalVisible, setAiCoachModalVisible] = useState(false);
  const [selectedBalancerTargetId, setSelectedBalancerTargetId] = useState<string | null>(null);
  const [showBalancerGramRow, setShowBalancerGramRow] = useState(false);

  // Remaining Calories & Macros
  const remainingCal = activeTargets.calories - consumedToday.calories;
  const remainingPro = Math.max(0, activeTargets.protein - consumedToday.protein);
  const remainingCar = Math.max(0, activeTargets.carbs - consumedToday.carbs);
  const remainingFat = Math.max(0, activeTargets.fat - consumedToday.fat);
  const pctLogged = activeTargets.calories > 0
    ? Math.min(100, Math.round((consumedToday.calories / activeTargets.calories) * 100))
    : 0;

  const todaysPlanMeals = React.useMemo(() => {
    if (!activeDietPlan || !activeDietPlan.scheduledMeals) return [];
    return activeDietPlan.scheduledMeals.filter(m =>
      m.dayOfWeek.includes('Everyday') || m.dayOfWeek.includes(todayDayName)
    ).sort((a, b) => a.time.localeCompare(b.time));
  }, [activeDietPlan, todayDayName]);

  interface PlannedMealStatus {
    scheduledMeal: ScheduledMeal;
    recipe: Recipe | null;
    name: string;
    plannedCal: number;
    plannedPro: number;
    plannedCar: number;
    plannedFat: number;
    isEaten: boolean;
    matchedLoggedMealId: string | null;
    imageUri?: string;
  }

  const plannedMealsWithStatus = React.useMemo<PlannedMealStatus[]>(() => {
    if (!todaysPlanMeals || todaysPlanMeals.length === 0) return [];

    const claimedLoggedIds = new Set<string>();
    const result: PlannedMealStatus[] = [];

    for (const sm of todaysPlanMeals) {
      const rec = savedMeals.find(r => r.id === sm.recipeId) || null;
      const s = rec?.totalServings || 1;
      const mealServings = sm.servings || 1;
      const plannedCal = Math.round((rec ? rec.calories / s : 0) * mealServings);
      const plannedPro = Math.round((rec ? rec.protein / s : 0) * mealServings);
      const plannedCar = Math.round((rec ? rec.carbs / s : 0) * mealServings);
      const plannedFat = Math.round((rec ? rec.fat / s : 0) * mealServings);
      const displayName = sm.customName || rec?.name || 'Plan-Mahlzeit';
      const img = rec?.imageUri || (rec?.name ? collectibleImages[`recipe_${rec.name}`] : undefined);
      const resolvedImg = img ? getResolvedUri(img) : undefined;

      // 1. Exact scheduledMealId match
      let match = (loggedMealsToday || []).find(l => !claimedLoggedIds.has(l.id) && l.scheduledMealId === sm.id);

      // 2. Fallback: match by recipeId or name (if logged from elsewhere)
      if (!match) {
        match = (loggedMealsToday || []).find(l => 
          !claimedLoggedIds.has(l.id) && (
            (sm.recipeId && l.recipeId === sm.recipeId) ||
            (displayName && l.name && l.name.trim().toLowerCase() === displayName.trim().toLowerCase()) ||
            (rec?.name && l.name && l.name.trim().toLowerCase() === rec.name.trim().toLowerCase())
          )
        );
      }

      if (match) {
        claimedLoggedIds.add(match.id);
      }

      result.push({
        scheduledMeal: sm,
        recipe: rec,
        name: displayName,
        plannedCal,
        plannedPro,
        plannedCar,
        plannedFat,
        isEaten: !!match,
        matchedLoggedMealId: match ? match.id : null,
        imageUri: resolvedImg,
      });
    }

    return result;
  }, [todaysPlanMeals, savedMeals, loggedMealsToday, collectibleImages]);

  const planCalStats = React.useMemo(() => {
    let totalPlanned = 0;
    let remainingPlanned = 0;
    let eatenCount = 0;

    plannedMealsWithStatus.forEach(m => {
      totalPlanned += m.plannedCal;
      if (m.isEaten) {
        eatenCount += 1;
      } else {
        remainingPlanned += m.plannedCal;
      }
    });

    return {
      totalPlanned,
      remainingPlanned,
      eatenCount,
      totalCount: plannedMealsWithStatus.length,
    };
  }, [plannedMealsWithStatus]);

  const pendingPlanMeals = React.useMemo(() => {
    return plannedMealsWithStatus
      .filter(m => !m.isEaten && !(skippedMealsToday || []).includes(m.scheduledMeal.id))
      .map(m => m.scheduledMeal);
  }, [plannedMealsWithStatus, skippedMealsToday]);

  const currentBalancerMeal = React.useMemo(() => {
    if (!activeDietPlan) return null;
    const designated = todaysPlanMeals.find(m => m.isBalancerMeal);
    if (designated) return designated;
    if (pendingPlanMeals.length > 0) return pendingPlanMeals[pendingPlanMeals.length - 1];
    if (todaysPlanMeals.length > 0) return todaysPlanMeals[todaysPlanMeals.length - 1];
    return null;
  }, [activeDietPlan, todaysPlanMeals, pendingPlanMeals]);

  const isBalancerLoggedToday = React.useMemo(() => {
    if (!currentBalancerMeal) return false;
    const statusMatch = plannedMealsWithStatus.find(m => m.scheduledMeal.id === currentBalancerMeal.id);
    if (statusMatch) return statusMatch.isEaten;
    return (loggedMealsToday || []).some(l => l.scheduledMealId === currentBalancerMeal.id);
  }, [currentBalancerMeal, plannedMealsWithStatus, loggedMealsToday]);

  const balancerRecipe = React.useMemo(() => {
    if (!currentBalancerMeal) return null;
    return savedMeals.find(r => r.id === currentBalancerMeal.recipeId) || null;
  }, [currentBalancerMeal, savedMeals]);

  const balancerCalculation = React.useMemo(() => {
    if (!currentBalancerMeal || !balancerRecipe) return null;

    const s = balancerRecipe.totalServings || 1;
    const planServings = currentBalancerMeal.servings || 1;
    const origCal = Math.round((balancerRecipe.calories / s) * planServings);
    const origPro = Math.round((balancerRecipe.protein / s) * planServings);
    const origCar = Math.round((balancerRecipe.carbs / s) * planServings);
    const origFat = Math.round((balancerRecipe.fat / s) * planServings);

    // Other pending meals calories today (excluding the balancer meal itself)
    const otherPendingCal = plannedMealsWithStatus
      .filter(m => !m.isEaten && m.scheduledMeal.id !== currentBalancerMeal.id && !(skippedMealsToday || []).includes(m.scheduledMeal.id))
      .reduce((sum, m) => sum + m.plannedCal, 0);

    // Target Ausgleich Budget: fill remaining daily calories after accounting for other pending meals
    const remTotal = activeTargets.calories - consumedToday.calories;
    const budget = Math.max(0, remTotal - otherPendingCal);
    const ratio = origCal > 0 ? budget / origCal : 1;

    const scaledIngs = (balancerRecipe.ingredients || []).map(ri => {
      const origAmount = (ri.amount / s) * planServings;
      const scaledAmount = Math.max(1, Math.round(origAmount * Math.max(0, ratio)));
      return {
        name: ri.ingredient.name,
        amount: scaledAmount,
        originalAmount: Math.round(origAmount),
        ingredient: ri.ingredient
      };
    });

    return {
      origCal,
      origPro,
      origCar,
      origFat,
      budget: Math.round(budget),
      ratio: Math.max(0, ratio),
      scaledPro: Math.round(origPro * Math.max(0, ratio)),
      scaledCar: Math.round(origCar * Math.max(0, ratio)),
      scaledFat: Math.round(origFat * Math.max(0, ratio)),
      scaledIngs
    };
  }, [currentBalancerMeal, balancerRecipe, activeTargets, consumedToday, plannedMealsWithStatus, skippedMealsToday]);

  const handleQuickLogBalancer = () => {
    if (!currentBalancerMeal || !balancerRecipe || !balancerCalculation) return;
    if (balancerCalculation.budget <= 0) {
      showCustomAlert('Budget voll', 'Dein Tagesziel ist bereits aufgebraucht.');
      return;
    }

    addLoggedMeal({
      name: `${currentBalancerMeal.customName || balancerRecipe.name} (Ausgleich)`,
      calories: balancerCalculation.budget,
      protein: balancerCalculation.scaledPro,
      carbs: balancerCalculation.scaledCar,
      fat: balancerCalculation.scaledFat,
      ingredients: balancerCalculation.scaledIngs.map(i => ({
        ingredient: i.ingredient,
        amount: i.amount
      })),
      scheduledMealId: currentBalancerMeal.id,
      recipeId: balancerRecipe.id,
      servingsLogged: parseFloat(balancerCalculation.ratio.toFixed(2))
    });
    triggerSuccess();
  };

  const handleTogglePlannedMeal = (item: PlannedMealStatus) => {
    if (!item.isEaten) {
      if (item.scheduledMeal.isBalancerMeal && balancerCalculation && balancerCalculation.budget > 0) {
        handleQuickLogBalancer();
        return;
      }

      const servings = item.scheduledMeal.servings || 1;
      const recipeServings = item.recipe?.totalServings || 1;
      const ratio = servings / recipeServings;
      const scaledIngredients = (item.recipe?.ingredients || []).map(req => ({
        ...req,
        amount: Math.round(req.amount * ratio)
      }));

      addLoggedMeal({
        name: item.name,
        ingredients: scaledIngredients,
        calories: item.plannedCal,
        protein: item.plannedPro,
        carbs: item.plannedCar,
        fat: item.plannedFat,
        servingsLogged: servings,
        scheduledMealId: item.scheduledMeal.id,
        recipeId: item.recipe?.id,
      });
      triggerSuccess();
    } else {
      Alert.alert(
        "Mahlzeit zurücksetzen?",
        `Möchtest du "${item.name}" wieder als noch offen markieren und aus dem heutigen Log entfernen?`,
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Als offen markieren",
            style: "destructive",
            onPress: () => {
              if (item.matchedLoggedMealId) {
                deleteLoggedMeal(item.matchedLoggedMealId);
                triggerLight();
              }
            }
          }
        ]
      );
    }
  };
  
  // Ingredients Modals
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const openBarcodeScannerOnMount = useAppStore(state => state.openBarcodeScannerOnMount);
  const setOpenBarcodeScannerOnMount = useAppStore(state => state.setOpenBarcodeScannerOnMount);

  useEffect(() => {
    if (openBarcodeScannerOnMount) {
      setBarcodeModalVisible(true);
      setOpenBarcodeScannerOnMount(false);
    }
  }, [openBarcodeScannerOnMount, setOpenBarcodeScannerOnMount]);
  const [manualIngredientVisible, setManualIngredientVisible] = useState(false);
  const [ingredientEditor, setIngredientEditor] = useState<Ingredient | null>(null);
  const [editIngName, setEditIngName] = useState('');
  const [editIngCal, setEditIngCal] = useState('');
  const [editIngPro, setEditIngPro] = useState('');
  const [editIngCar, setEditIngCar] = useState('');
  const [editIngFat, setEditIngFat] = useState('');
  
  const handleQuickAddCalories = (kcal: number) => {
    // Distribute macro proportionally: ~50% carbs, ~25% protein, ~25% fat
    const extraCarbs = Math.round((kcal * 0.5) / 4);
    const extraPro = Math.round((kcal * 0.25) / 4);
    const extraFat = Math.round((kcal * 0.25) / 9);

    addDailyTargetExtra({
      calories: kcal,
      protein: extraPro,
      carbs: extraCarbs,
      fat: extraFat
    });
  };
  
  // Recipe Builder
  const [recipeBuilderVisible, setRecipeBuilderVisible] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);
  const [servingsToLog, setServingsToLog] = useState('1');

  // Editor for Logged Meal
  const [loggedMealEditor, setLoggedMealEditor] = useState<LoggedMeal | null>(null);

  // Manual Ingredient State
  const [manIngName, setManIngName] = useState('');
  const [manIngCal, setManIngCal] = useState('');
  const [manIngPro, setManIngPro] = useState('');
  const [manIngCar, setManIngCar] = useState('');
  const [manIngFat, setManIngFat] = useState('');

  const handleSaveManualIngredient = () => {
    if (!manIngName.trim()) return showCustomAlert('Error', 'Ingredient name is required.');
    addIngredient({
      id: Date.now().toString(),
      name: manIngName,
      baseAmount: 100,
      calories: parseFloat(manIngCal) || 0,
      protein: parseFloat(manIngPro) || 0,
      carbs: parseFloat(manIngCar) || 0,
      fat: parseFloat(manIngFat) || 0
    });
    setManualIngredientVisible(false);
    setManIngName('');
    setManIngCal(''); setManIngPro(''); setManIngCar(''); setManIngFat('');
  };

  const handleIngredientFound = (ingredient: Ingredient) => {
    addIngredient(ingredient);
    setBarcodeModalVisible(false);
    setIngredientEditor(ingredient);
    setEditIngName(ingredient.name);
    setEditIngCal(ingredient.calories.toString());
    setEditIngPro(ingredient.protein.toString());
    setEditIngCar(ingredient.carbs.toString());
    setEditIngFat(ingredient.fat.toString());
  };

  const [targetCal, setTargetCal] = useState(targets.calories.toString());
  const [targetPro, setTargetPro] = useState(targets.protein.toString());
  const [targetCar, setTargetCar] = useState(targets.carbs.toString());
  const [targetFat, setTargetFat] = useState(targets.fat.toString());

  // Search & Sort States
  const [recipeSearch, setRecipeSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [recipeSort, setRecipeSort] = useState<'usage' | 'name' | 'calories' | 'protein'>('usage');
  const [ingredientSort, setIngredientSort] = useState<'usage' | 'name' | 'calories' | 'protein'>('usage');


  const getDayLabel = (offset: number) => {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Yesterday';
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString('de-DE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: bottomSpacing }}>
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.accentBorderSoft }]} 
              onPress={() => setThemePickerVisible(true)}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} 
              onPress={() => setShoppingListVisible(true)}
            >
              <MaterialCommunityIcons name="cart-outline" size={20} color="#30D158" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} 
              onPress={() => setDietPlanManagerVisible(true)}
            >
              <MaterialCommunityIcons name="calendar-month" size={20} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} 
              onPress={() => setHistoryModalVisible(true)}
            >
              <MaterialCommunityIcons name="history" size={20} color="#BF5AF2" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} 
              onPress={() => setQuickScanModalVisible(true)}
            >
              <MaterialCommunityIcons name="barcode-scan" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {activeDietPlan && (
          <View style={styles.activePlanRow}>
            <TouchableOpacity 
              style={[styles.activePlanPill, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }]} 
              onPress={() => {
                setInitialPlanIdToEdit(activeDietPlan.id);
                setDietPlanManagerVisible(true);
              }}
            >
              <MaterialCommunityIcons name="calendar-check" size={18} color={theme.accent} />
              <Text style={[styles.activePlanText, { color: theme.accent }]}>Plan: {activeDietPlan.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.activePlanShoppingBtn}
              onPress={() => setShoppingListVisible(true)}
            >
              <MaterialCommunityIcons name="cart-outline" size={18} color="#30D158" />
              <Text style={styles.activePlanShoppingBtnText}>Einkaufsliste</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HERO CARD: ALL-IN-ONE OFFENE NÄHRWERTE, PLAN-KARUSSELL, SLIM AUSGLEICH & QUICK-ADD */}
        <View style={[styles.remainingHeroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          {/* A) Top: Offene Kalorien & Fortschritts-Ring */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.remainingLabel}>NOCH OFFEN HEUTE:</Text>
                {!activeDietPlan && (
                  <TouchableOpacity
                    onPress={() => {
                      setTargetCal(targets.calories.toString());
                      setTargetPro(targets.protein.toString());
                      setTargetCar(targets.carbs.toString());
                      setTargetFat(targets.fat.toString());
                      setGlobalTargetsEditorVisible(true);
                    }}
                    style={[styles.inlineTargetEditBtn, { backgroundColor: theme.accentBgSoft }]}
                  >
                    <MaterialCommunityIcons name="pencil" size={11} color={theme.accent} />
                    <Text style={[styles.inlineTargetEditText, { color: theme.accent }]}>Ziel</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
                <Text style={[styles.remainingCalVal, { color: theme.accent }, remainingCal < 0 && { color: '#FF453A' }]}>
                  {remainingCal >= 0 ? remainingCal : `+${Math.abs(remainingCal)}`}
                </Text>
                <Text style={styles.remainingCalUnit}>
                  {remainingCal >= 0 ? `kcal / ${activeTargets.calories} kcal` : 'kcal Überschuss'}
                </Text>
              </View>
              <Text style={[styles.remainingStatusText, remainingCal < 0 ? { color: '#FF453A' } : { color: '#30D158' }]}>
                {remainingCal >= 0
                  ? `${pctLogged}% verzehrt • ${consumedToday.calories} kcal gegessen`
                  : `${consumedToday.calories} kcal gegessen • +${Math.abs(remainingCal)} kcal über Budget`}
              </Text>
            </View>
            <View style={[styles.progressCircleBox, { backgroundColor: theme.subCardBg, borderColor: theme.accentBorderSoft }, remainingCal < 0 && { borderColor: 'rgba(255, 69, 58, 0.55)' }]}>
              <Text style={styles.progressCircleText}>{pctLogged}%</Text>
            </View>
          </View>

          {/* Dezente Kalorien-Fortschrittslinie */}
          <View style={styles.remainingCalBarTrack}>
            <View
              style={[
                styles.remainingCalBarFill,
                {
                  width: `${Math.min(100, pctLogged)}%`,
                  backgroundColor: remainingCal < 0 ? '#FF453A' : theme.accent,
                },
              ]}
            />
          </View>

          {/* B) Remaining Macro Pills MIT integrierten Mini-Progressbars */}
          <View style={styles.remainingMacroRow}>
            <View style={[styles.remainingMacroPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.remMacroHeaderRow}>
                <Text style={styles.remMacroLabel}>PROTEIN</Text>
                <Text style={styles.remMacroSub}>{consumedToday.protein}/{activeTargets.protein}g</Text>
              </View>
              <Text style={[styles.remMacroVal, { color: '#30D158' }]}>{remainingPro}g</Text>
              <View style={styles.remMacroMiniBarTrack}>
                <View 
                  style={[
                    styles.remMacroMiniBarFill, 
                    { 
                      backgroundColor: '#30D158', 
                      width: `${Math.min(100, Math.round((consumedToday.protein / Math.max(1, activeTargets.protein)) * 100))}%` 
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={[styles.remainingMacroPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.remMacroHeaderRow}>
                <Text style={styles.remMacroLabel}>CARBS</Text>
                <Text style={styles.remMacroSub}>{consumedToday.carbs}/{activeTargets.carbs}g</Text>
              </View>
              <Text style={[styles.remMacroVal, { color: '#FFD60A' }]}>{remainingCar}g</Text>
              <View style={styles.remMacroMiniBarTrack}>
                <View 
                  style={[
                    styles.remMacroMiniBarFill, 
                    { 
                      backgroundColor: '#FFD60A', 
                      width: `${Math.min(100, Math.round((consumedToday.carbs / Math.max(1, activeTargets.carbs)) * 100))}%` 
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={[styles.remainingMacroPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.remMacroHeaderRow}>
                <Text style={styles.remMacroLabel}>FETT</Text>
                <Text style={styles.remMacroSub}>{consumedToday.fat}/{activeTargets.fat}g</Text>
              </View>
              <Text style={[styles.remMacroVal, { color: '#FF453A' }]}>{remainingFat}g</Text>
              <View style={styles.remMacroMiniBarTrack}>
                <View 
                  style={[
                    styles.remMacroMiniBarFill, 
                    { 
                      backgroundColor: '#FF453A', 
                      width: `${Math.min(100, Math.round((consumedToday.fat / Math.max(1, activeTargets.fat)) * 100))}%` 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* AI MACRO COACH HERO TRIGGER */}
          <TouchableOpacity
            style={[
              styles.aiCoachHeroBanner,
              {
                backgroundColor: 'rgba(192, 132, 252, 0.09)',
                borderColor: 'rgba(192, 132, 252, 0.32)',
              },
            ]}
            onPress={() => {
              triggerLight();
              setAiCoachModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.aiCoachBannerLeft}>
              <View style={[styles.aiCoachIconCircle, { backgroundColor: 'rgba(192, 132, 252, 0.20)' }]}>
                <MaterialCommunityIcons name="auto-fix" size={17} color="#C084FC" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.aiCoachTitle}>AI Macro Coach</Text>
                  <View style={styles.aiCoachBadge}>
                    <Text style={styles.aiCoachBadgeText}>LÜCKE FÜLLEN</Text>
                  </View>
                </View>
                <Text style={styles.aiCoachSubtitle} numberOfLines={1}>
                  {remainingCal > 0
                    ? `3 Blitz-Ideen für ${remainingCal} kcal & ${remainingPro}g Protein`
                    : 'Ziele erreicht! Ideen für Feintuning & Snacks'}
                </Text>
              </View>
            </View>
            <View style={styles.aiCoachActionBtn}>
              <Text style={styles.aiCoachActionText}>Öffnen</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#C084FC" />
            </View>
          </TouchableOpacity>

          {/* C) SUB-WIDGET: HEUTIGE EINGEPLANTE MAHLZEITEN (Horizontales Karussell) */}
          {activeDietPlan ? (
            <View style={[styles.planSubSection, { borderTopColor: theme.subtleBorder }]}>
              <View style={styles.planSubHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 6 }}>
                  <MaterialCommunityIcons name="calendar-clock" size={14} color={theme.accent} />
                  <Text style={[styles.planSubTitle, { color: theme.accent }]}>PLAN HEUTE</Text>
                  {plannedMealsWithStatus.length > 0 && (
                    <View style={[styles.planSubBadge, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }, planCalStats.eatenCount === planCalStats.totalCount && styles.planSubBadgeDone]}>
                      <Text style={[styles.planSubBadgeText, { color: theme.accent }, planCalStats.eatenCount === planCalStats.totalCount && { color: '#30D158' }]}>
                        {planCalStats.eatenCount}/{planCalStats.totalCount} gegessen
                      </Text>
                    </View>
                  )}
                </View>

                {plannedMealsWithStatus.length > 0 && (
                  <Text style={styles.planSubRemainingText}>
                    Laut Plan noch: <Text style={{ color: theme.accent, fontWeight: '800' }}>{planCalStats.remainingPlanned} kcal</Text>
                    <Text style={styles.planSubTotalText}> ({planCalStats.totalPlanned})</Text>
                  </Text>
                )}
              </View>

              {plannedMealsWithStatus.length > 0 ? (
                <RNScrollView 
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={styles.plannedMealsScroll}
                  contentContainerStyle={styles.plannedMealsScrollContent}
                >
                  {plannedMealsWithStatus.map((item, index) => {
                    return (
                      <TouchableOpacity
                        key={`${item.scheduledMeal.id}_${index}`}
                        style={[styles.plannedMealCard, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, item.isEaten && styles.plannedMealCardEaten]}
                        activeOpacity={0.75}
                        onPress={() => handleTogglePlannedMeal(item)}
                      >
                        <View style={styles.plannedMealThumbContainer}>
                          {item.imageUri ? (
                            <Image 
                              source={{ uri: item.imageUri }} 
                              style={[styles.plannedMealThumb, item.isEaten && styles.plannedMealThumbDimmed]} 
                            />
                          ) : (
                            <View style={[styles.plannedMealThumbPlaceholder, item.isEaten && styles.plannedMealThumbPlaceholderDimmed]}>
                              <MaterialCommunityIcons 
                                name={item.scheduledMeal.isBalancerMeal ? "scale-balance" : "food-variant"} 
                                size={22} 
                                color={item.isEaten ? '#555' : (item.scheduledMeal.isBalancerMeal ? '#FF9500' : theme.accent)} 
                              />
                            </View>
                          )}

                          <View style={styles.plannedMealTimeOverlay}>
                            <Text style={[styles.plannedMealTime, { color: theme.accent }, item.isEaten && styles.textDimmed]}>
                              {item.scheduledMeal.time || '--:--'}
                            </Text>
                          </View>

                          {item.scheduledMeal.isBalancerMeal && !item.isEaten && (
                            <View style={styles.balancerMiniTagOverlay}>
                              <Text style={styles.balancerMiniTagText}>Ausgleich</Text>
                            </View>
                          )}

                          {item.isEaten ? (
                            <View style={styles.plannedMealThumbCheck}>
                              <View style={styles.plannedMealCheckCircle}>
                                <MaterialCommunityIcons name="check-bold" size={15} color="#000" />
                              </View>
                            </View>
                          ) : (
                            !item.scheduledMeal.isBalancerMeal && (
                              <View style={[styles.plannedMealAddCorner, { borderColor: theme.accentBorderSoft }]}>
                                <MaterialCommunityIcons name="plus" size={13} color={theme.accent} />
                              </View>
                            )
                          )}
                        </View>

                        <View style={styles.plannedMealCardBody}>
                          <Text 
                            style={[styles.plannedMealName, item.isEaten && styles.plannedMealNameEaten]} 
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={[styles.plannedMealMacros, item.isEaten && styles.textDimmed]} numberOfLines={1}>
                            <Text style={{ color: item.isEaten ? '#777' : theme.accent, fontWeight: '800' }}>
                              {item.plannedCal} kcal
                            </Text>
                            {' • '}{item.plannedPro}g P
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </RNScrollView>
              ) : (
                <View style={styles.plannedMealsEmpty}>
                  <Text style={styles.plannedMealsEmptyText}>
                    Heute ({todayDayName}) sind keine Mahlzeiten im aktiven Plan eingetragen.
                  </Text>
                </View>
              )}

              {/* D) KOMFORTABLE INTEGRIERTE AUSGLEICHS-LEISTE */}
              {currentBalancerMeal && (
                <View style={{ marginTop: 10 }}>
                  <View style={[styles.slimBalancerBar, { backgroundColor: theme.subCardBg }]}>
                    <TouchableOpacity 
                      style={styles.slimBalancerLeft}
                      activeOpacity={0.7}
                      onPress={() => setShowBalancerGramRow(prev => !prev)}
                    >
                      <View style={styles.slimBalancerIconBox}>
                        <MaterialCommunityIcons name="scale-balance" size={18} color="#FF9500" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slimBalancerLabel} numberOfLines={1}>
                          AUSGLEICH: <Text style={styles.slimBalancerMealTitle}>{currentBalancerMeal.customName || balancerRecipe?.name}</Text>
                        </Text>
                        <Text style={styles.slimBalancerInfo} numberOfLines={1}>
                          {isBalancerLoggedToday ? (
                            <Text style={{ color: '#30D158', fontWeight: '800' }}>Bereits geloggt ✓</Text>
                          ) : balancerCalculation && balancerCalculation.budget <= 0 ? (
                            <Text style={{ color: '#FF453A', fontWeight: '800' }}>Budget voll (0 kcal übrig)</Text>
                          ) : (
                            <Text style={{ color: theme.accent, fontWeight: '800' }}>
                              {balancerCalculation?.ratio.toFixed(2)}x Portion • {balancerCalculation?.budget} kcal
                            </Text>
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.slimBalancerActions}>
                      <TouchableOpacity 
                        style={[styles.slimBalancerGramBtn, showBalancerGramRow && { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]}
                        onPress={() => setShowBalancerGramRow(prev => !prev)}
                      >
                        <Text style={[styles.slimBalancerGramBtnText, showBalancerGramRow && { color: theme.accent }]}>
                          Gramm {showBalancerGramRow ? '▴' : '▾'}
                        </Text>
                      </TouchableOpacity>

                      {!isBalancerLoggedToday && balancerCalculation && balancerCalculation.budget > 0 ? (
                        <TouchableOpacity 
                          style={styles.slimBalancerLogBtn}
                          onPress={handleQuickLogBalancer}
                        >
                          <Text style={styles.slimBalancerLogBtnText}>+ Loggen</Text>
                        </TouchableOpacity>
                      ) : isBalancerLoggedToday ? (
                        <View style={styles.slimBalancerDonePill}>
                          <MaterialCommunityIcons name="check-bold" size={14} color="#30D158" />
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {showBalancerGramRow && (
                    <View style={[styles.slimBalancerGramPopup, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                      <View style={styles.slimGramChipsWrap}>
                        {balancerCalculation && balancerCalculation.scaledIngs.length > 0 ? (
                          balancerCalculation.scaledIngs.map((ing, idx) => (
                            <View key={idx} style={styles.slimGramChipPill}>
                              <Text style={styles.slimGramChipText}>
                                {ing.name}: <Text style={{ color: theme.accent, fontWeight: '800' }}>{ing.amount}g</Text>
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.slimGramChipText}>Keine Zutaten hinterlegt</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedBalancerTargetId(currentBalancerMeal.id);
                          setBalancerModalVisible(true);
                        }}
                        style={[styles.slimModalLinkBtn, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]}
                      >
                        <Text style={[styles.slimModalLinkText, { color: theme.accent }]}>Anpassen ›</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.planSubSection, { borderTopColor: theme.subtleBorder }]}>
              <TouchableOpacity 
                style={styles.plannedMealsNoPlanBtn}
                onPress={() => setDietPlanManagerVisible(true)}
              >
                <MaterialCommunityIcons name="calendar-plus" size={16} color={theme.accent} />
                <Text style={[styles.plannedMealsNoPlanText, { color: theme.accent }]}>Kein aktiver Ernährungsplan • Jetzt Plan auswählen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* E) SCHLANKER QUICK-ADD (CARDIO) FOOTER DIREKT IM WIDGET */}
          <View style={[styles.compactQuickAddFooter, { borderTopColor: theme.subtleBorder }]}>
            <Text style={styles.compactQuickAddLabel}>⚡ QUICK-ADD (CARDIO):</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={[styles.compactQuickAddPill, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]} onPress={() => handleQuickAddCalories(150)}>
                <Text style={[styles.compactQuickAddPillText, { color: theme.accent }]}>+150 kcal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.compactQuickAddPill, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]} onPress={() => handleQuickAddCalories(300)}>
                <Text style={[styles.compactQuickAddPillText, { color: theme.accent }]}>+300 kcal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.compactQuickAddPill, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]} onPress={() => handleQuickAddCalories(500)}>
                <Text style={[styles.compactQuickAddPillText, { color: theme.accent }]}>+500 kcal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* KOMPAKTES 4ER ACTION- & MANAGER-GRID */}
        <View style={styles.compactToolsGrid}>
          <TouchableOpacity style={[styles.compactToolCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={() => setManagerVisible('ingredients')}>
            <MaterialCommunityIcons name="food-apple" size={20} color="#30D158" />
            <Text style={styles.compactToolText} numberOfLines={1}>Zutaten ({ingredients.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.compactToolCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={() => setManagerVisible('recipes')}>
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={theme.accent} />
            <Text style={styles.compactToolText} numberOfLines={1}>Rezepte ({savedMeals.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.compactToolCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={() => setQuickScanModalVisible(true)}>
            <MaterialCommunityIcons name="barcode-scan" size={20} color={theme.accent} />
            <Text style={[styles.compactToolText, { color: theme.accent }]} numberOfLines={1}>EAN Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.compactToolCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={() => setOnlineSearchVisible(true)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#FFD60A" />
            <Text style={[styles.compactToolText, { color: '#FFD60A' }]} numberOfLines={1}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Logged Meals (Today's Log) */}
        <View style={styles.todayLogHeaderRow}>
          <Text style={[styles.subtitle, { marginTop: 0, marginBottom: 0 }]}>Today's Log ({loggedMealsToday.length})</Text>
          <Text style={styles.todayLogHintText}>Tippen = Bearbeiten</Text>
        </View>
        <View style={{ flex: 1, paddingBottom: 20 }}>
          {loggedMealsToday.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged today. Create a recipe to start logging!</Text>
          ) : (
            loggedMealsToday.map(meal => {
              const match = savedMeals.find(r => r.id === meal.recipeId || r.name.toLowerCase() === meal.name.toLowerCase());
              const mealImg = getResolvedUri(match?.imageUri || collectibleImages[`recipe_${meal.name}`]);

              return (
                <TouchableOpacity key={meal.id} style={[styles.loggedMealItem, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} 
                  onLongPress={() => {
                    setActionMealId(meal.id);
                  }}
                  onPress={() => {
                    if (meal.ingredients && meal.ingredients.length > 0) {
                      setLoggedMealEditor(meal);
                    } else {
                      showCustomAlert("Legacy Meal", "This meal was created before ingredients were supported, so it cannot be edited.");
                    }
                  }}>
                  {mealImg ? (
                    <Image source={{ uri: mealImg }} style={styles.loggedMealThumb} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealTime, { color: theme.accent }]}>{meal.time}</Text>
                    <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                    <Text style={styles.mealMacros}>{meal.calories} kcal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F</Text>
                  </View>

                  <TouchableOpacity onPress={() => deleteLoggedMeal(meal.id)} style={{ padding: 6 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={19} color="#FF453A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* INGREDIENTS MANAGER */}
      <Modal visible={managerVisible === 'ingredients'} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ingredient Pool</Text>
            <TouchableOpacity onPress={() => setManagerVisible(null)}><MaterialCommunityIcons name="close" size={28} color="#FFF" /></TouchableOpacity>

          </View>

          <View style={styles.addActionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setBarcodeModalVisible(true)}>
              <MaterialCommunityIcons name="barcode-scan" size={20} color={theme.accent || "#00D2FF"} />
              <Text style={styles.actionBtnText}>Scan EAN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setManualIngredientVisible(true)}>
              <MaterialCommunityIcons name="pencil-plus" size={20} color="#30D158" />
              <Text style={styles.actionBtnText}>Add Manual</Text>
            </TouchableOpacity>

          </View>

          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <TextInput
              style={styles.textInputFull}
              placeholder="Search ingredients..."
              placeholderTextColor="#666"
              value={ingredientSearch}
              onChangeText={setIngredientSearch}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['usage', 'name', 'calories', 'protein'] as const).map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.sortChip, ingredientSort === s && styles.sortChipActive]}
                  onPress={() => setIngredientSort(s)}
                >
                  <Text style={[styles.sortChipText, ingredientSort === s && styles.sortChipTextActive]}>By {s}</Text>
                </TouchableOpacity>
              ))}

            </View>

          </View>
          <KeyboardAwareWrapper contentContainerStyle={{ ...styles.modalScroll, paddingBottom: bottomSpacing }}>
            {ingredients
              .filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
              .sort((a, b) => {
                if (ingredientSort === 'usage') {
                  const ua = a.usageCount || 0;
                  const ub = b.usageCount || 0;
                  if (ua !== ub) return ub - ua;
                  return a.name.localeCompare(b.name);
                }

                if (ingredientSort === 'name') return a.name.localeCompare(b.name);
                if (ingredientSort === 'calories') return b.calories - a.calories;
                return b.protein - a.protein; // protein
              })
              .map(ing => (
              <View key={ing.id} style={styles.poolItem}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.poolName}>{ing.name}</Text>
                  <Text style={styles.poolMacros}>Per {ing.baseAmount}g: {ing.calories}kcal • {ing.protein}P • {ing.carbs}C • {ing.fat}F</Text>

                </View>
                <TouchableOpacity style={styles.logPill} onPress={() => {
                  setScannedIngredient(ing);
                  setPortionGrams('100');
                  setManagerVisible(null); // Close the pool manager
                }}>
                  <Text style={styles.logPillText}>Log</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ padding: 8, marginLeft: 8 }} onPress={() => {
                  setIngredientEditor(ing);
                  setEditIngName(ing.name);
                  setEditIngCal(ing.calories.toString());
                  setEditIngPro(ing.protein.toString());
                  setEditIngCar(ing.carbs.toString());
                  setEditIngFat(ing.fat.toString());
                }}>
                  <MaterialCommunityIcons name="pencil" size={22} color={theme.accent || "#00D2FF"} />
                </TouchableOpacity>
                <TouchableOpacity style={{ padding: 8 }} onPress={() => deleteIngredient(ing.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF453A" />
                </TouchableOpacity>

              </View>
            ))}
          </KeyboardAwareWrapper>

        </View>
      </Modal>

      {/* RECIPES MANAGER */}
      <Modal visible={managerVisible === 'recipes'} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saved Recipes</Text>
            <TouchableOpacity onPress={() => setManagerVisible(null)}><MaterialCommunityIcons name="close" size={28} color="#FFF" /></TouchableOpacity>

          </View>

          <TouchableOpacity style={styles.fullBtn} onPress={() => {
            setRecipeToEdit(null);
            setRecipeBuilderVisible(true);
          }}>
            <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
            <Text style={styles.fullBtnText}>Create New Recipe</Text>
          </TouchableOpacity>
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <TextInput
              style={styles.textInputFull}
              placeholder="Search recipes..."
              placeholderTextColor="#666"
              value={recipeSearch}
              onChangeText={setRecipeSearch}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['name', 'calories', 'protein'] as const).map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.sortChip, recipeSort === s && styles.sortChipActive]}
                  onPress={() => setRecipeSort(s)}
                >
                  <Text style={[styles.sortChipText, recipeSort === s && styles.sortChipTextActive]}>By {s}</Text>
                </TouchableOpacity>
              ))}

            </View>


          </View>

          <KeyboardAwareWrapper contentContainerStyle={styles.modalScroll}>
            {savedMeals
              .filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
              .sort((a, b) => {
                if (recipeSort === 'name') return a.name.localeCompare(b.name);
                if (recipeSort === 'calories') return (b.calories / (b.totalServings || 1)) - (a.calories / (a.totalServings || 1));
                return (b.protein / (b.totalServings || 1)) - (a.protein / (a.totalServings || 1));
              })
              .map(recipe => {
                const s = recipe.totalServings || 1;
                const perServingCal = Math.round(recipe.calories / s);
                const perServingPro = Math.round(recipe.protein / s);
                const perServingCar = Math.round(recipe.carbs / s);
                const perServingFat = Math.round(recipe.fat / s);
                const effectiveImageUri = getResolvedUri(recipe.imageUri || collectibleImages[`recipe_${recipe.name}`]);

                return (
                  <View key={recipe.id} style={styles.recipeCard}>
                    {/* Dish Image or Photo Picker */}
                    <TouchableOpacity 
                      style={styles.recipeImageWrapper}
                      activeOpacity={0.8}
                      onPress={() => pickRecipeImage(recipe)}
                    >
                      {effectiveImageUri ? (
                        <>
                          <Image 
                            source={{ uri: effectiveImageUri }} 
                            style={styles.recipeImage} 
                          />
                          <View style={styles.recipeImageBadge}>
                            <MaterialCommunityIcons name="camera" size={12} color="#FFF" />
                          </View>
                        </>
                      ) : (
                        <View style={styles.recipeImagePlaceholder}>
                          <MaterialCommunityIcons name="camera-plus" size={22} color={theme.accent || "#00D2FF"} />
                          <Text style={styles.recipeImagePlaceholderText}>+ Foto</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Dish Info & Macros */}
                    <TouchableOpacity 
                      style={{ flex: 1, paddingVertical: 4 }}
                      activeOpacity={0.7}
                      onPress={() => {
                        setRecipeToLog(recipe);
                        setServingsToLog('1');
                      }}
                    >
                      <Text style={styles.poolName} numberOfLines={1}>{recipe.name}</Text>
                      <Text style={styles.recipeServingMacros}>
                        1 Port.: <Text style={{ color: theme.accent || '#00D2FF', fontWeight: 'bold' }}>{perServingCal} kcal</Text> • {perServingPro}P • {perServingCar}C • {perServingFat}F
                      </Text>
                      <Text style={styles.poolSub}>
                        Gesamt: {recipe.calories} kcal ({s} {s === 1 ? 'Portion' : 'Portionen'}) • {(recipe.ingredients || []).length} Zutaten
                      </Text>
                    </TouchableOpacity>

                    {/* Actions: Edit, Log Pill & Delete */}
                    <View style={styles.recipeCardActions}>
                      <TouchableOpacity 
                        onPress={() => {
                          setRecipeToEdit(recipe);
                          setRecipeBuilderVisible(true);
                        }} 
                        style={styles.editRecipePill}
                      >
                        <MaterialCommunityIcons name="pencil" size={14} color={theme.accent || "#00D2FF"} style={{ marginRight: 2 }} />
                        <Text style={styles.editRecipePillText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          setRecipeToLog(recipe);
                          setServingsToLog('1');
                        }} 
                        style={styles.logPill}
                      >
                        <MaterialCommunityIcons name="plus" size={15} color="#000" style={{ marginRight: 2 }} />
                        <Text style={styles.logPillText}>Log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          Alert.alert(
                            "Rezept löschen?",
                            `Möchtest du "${recipe.name}" wirklich löschen?`,
                            [
                              { text: "Abbrechen", style: "cancel" },
                              { text: "Löschen", style: "destructive", onPress: () => deleteSavedMeal(recipe.id) }
                            ]
                          );
                        }} 
                        style={{ padding: 6, marginLeft: 4 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
          </KeyboardAwareWrapper>

          {/* PORTION LOG OVERLAY (Inside Recipes Modal for 100% 1-Tap Responsiveness) */}
          {recipeToLog && (() => {
            const s = parseFloat(servingsToLog) || 0;
            const totalS = recipeToLog.totalServings || 1;
            const ratio = s > 0 ? s / totalS : 0;
            const computedKcal = Math.round(recipeToLog.calories * ratio);
            const computedPro = Math.round(recipeToLog.protein * ratio);
            const computedCar = Math.round(recipeToLog.carbs * ratio);
            const computedFat = Math.round(recipeToLog.fat * ratio);
            const recipeImg = getResolvedUri(recipeToLog.imageUri || collectibleImages[`recipe_${recipeToLog.name}`]);

            const handleConfirmLog = () => {
              if (s > 0) {
                Keyboard.dismiss();
                const scaledIngredients = (recipeToLog.ingredients || []).map(req => ({
                  ...req,
                  amount: req.amount * ratio
                }));

                addLoggedMeal({
                  name: recipeToLog.name,
                  ingredients: scaledIngredients,
                  calories: computedKcal,
                  protein: computedPro,
                  carbs: computedCar,
                  fat: computedFat,
                  servingsLogged: s,
                  recipeId: recipeToLog.id,
                });
                triggerSuccess();
              }
              setRecipeToLog(null);
              setManagerVisible(null);
            };

            const adjustServings = (delta: number) => {
              const current = parseFloat(servingsToLog) || 1;
              const updated = Math.max(0.5, Math.round((current + delta) * 10) / 10);
              setServingsToLog(updated.toString());
            };

            return (
              <View style={styles.portionOverlay}>
                <TouchableOpacity 
                  style={styles.portionBackdrop} 
                  activeOpacity={1} 
                  onPress={() => setRecipeToLog(null)} 
                />
                <View style={styles.portionSheet}>
                  <ScrollView 
                    keyboardShouldPersistTaps="handled" 
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Header with Dish Image & Title */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      {recipeImg ? (
                        <Image source={{ uri: recipeImg }} style={styles.portionModalThumb} />
                      ) : (
                        <View style={styles.portionModalThumbPlaceholder}>
                          <MaterialCommunityIcons name="food-variant" size={28} color={theme.accent || "#00D2FF"} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.modalTitle} numberOfLines={1}>{recipeToLog.name}</Text>
                        <Text style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                          Rezept ergibt gesamt {totalS} {totalS === 1 ? 'Portion' : 'Portionen'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                          onPress={() => {
                            const r = recipeToLog;
                            setRecipeToLog(null);
                            setRecipeToEdit(r);
                            setRecipeBuilderVisible(true);
                          }} 
                          style={{ padding: 6, marginRight: 4 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="pencil" size={22} color={theme.accent || "#00D2FF"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setRecipeToLog(null)} style={{ padding: 6 }}>
                          <MaterialCommunityIcons name="close" size={24} color="#888" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Live Macro Breakdown for chosen portions */}
                    <View style={styles.portionMacroBadge}>
                      <View style={styles.portionMacroItem}>
                        <Text style={styles.portionMacroVal}>{computedKcal}</Text>
                        <Text style={styles.portionMacroLabel}>kcal</Text>
                      </View>
                      <View style={styles.portionMacroDivider} />
                      <View style={styles.portionMacroItem}>
                        <Text style={[styles.portionMacroVal, { color: '#30D158' }]}>{computedPro}g</Text>
                        <Text style={styles.portionMacroLabel}>Protein</Text>
                      </View>
                      <View style={styles.portionMacroDivider} />
                      <View style={styles.portionMacroItem}>
                        <Text style={[styles.portionMacroVal, { color: '#FFD60A' }]}>{computedCar}g</Text>
                        <Text style={styles.portionMacroLabel}>Carbs</Text>
                      </View>
                      <View style={styles.portionMacroDivider} />
                      <View style={styles.portionMacroItem}>
                        <Text style={[styles.portionMacroVal, { color: '#FF453A' }]}>{computedFat}g</Text>
                        <Text style={styles.portionMacroLabel}>Fett</Text>
                      </View>
                    </View>

                    {/* Stepper & Input Row */}
                    <Text style={{ color: '#AAA', fontSize: 13, marginBottom: 8, fontWeight: '600', textAlign: 'center' }}>
                      Wie viele Portionen hast du gegessen?
                    </Text>
                    <View style={styles.portionStepperRow}>
                      <TouchableOpacity 
                        style={styles.portionStepperBtn}
                        onPress={() => adjustServings(-0.5)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="minus" size={24} color="#FFF" />
                      </TouchableOpacity>

                      <View style={styles.portionInputContainer}>
                        <TextInput 
                          style={styles.portionNumberInput}
                          keyboardType="numeric"
                          value={servingsToLog}
                          onChangeText={setServingsToLog}
                          returnKeyType="done"
                          onSubmitEditing={handleConfirmLog}
                          selectTextOnFocus
                        />
                        <Text style={styles.portionUnitLabel}>Portion(en)</Text>
                      </View>

                      <TouchableOpacity 
                        style={styles.portionStepperBtn}
                        onPress={() => adjustServings(0.5)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Quick Portion Chips */}
                    <View style={styles.quickPortionRow}>
                      {['0.5', '1', '1.5', '2', '3'].map((p) => {
                        const isSelected = servingsToLog === p;
                        return (
                          <TouchableOpacity 
                            key={p} 
                            style={[styles.quickPortionChip, isSelected && styles.quickPortionChipActive]} 
                            onPress={() => {
                              setServingsToLog(p);
                              Keyboard.dismiss();
                            }}
                          >
                            <Text style={[styles.quickPortionText, isSelected && styles.quickPortionTextActive]}>
                              {p}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Confirm Button - SINGLE TAP INSTANT LOG */}
                    <TouchableOpacity 
                      style={[styles.confirmLogBtn, s <= 0 && { opacity: 0.5 }]}
                      onPress={handleConfirmLog}
                      disabled={s <= 0}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="check-bold" size={20} color="#000" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmLogBtnText}>
                        {s > 0 ? `${s} ${s === 1 ? 'Portion' : 'Portionen'} loggen (${computedKcal} kcal)` : 'Portion wählen'}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            );
          })()}

        </View>

      </Modal>

      <EnhancedRecipeBuilder 
        visible={recipeBuilderVisible} 
        onClose={() => {
          setRecipeBuilderVisible(false);
          setRecipeToEdit(null);
        }} 
        recipeToEdit={recipeToEdit}
      />

      {/* LOGGED MEAL EDITOR */}
      <SwipeableModal visible={!!loggedMealEditor} onClose={() => setLoggedMealEditor(null)}>
        {loggedMealEditor && (
          <View>
            <Text style={styles.modalTitle}>Adjust {loggedMealEditor.name}</Text>
            <Text style={styles.modalSubtitle}>Change the amounts eaten and your daily macros will update automatically.</Text>
            <View style={{ marginTop: 16, maxHeight: 400 }}>
              <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">
                {(loggedMealEditor.ingredients || []).map(req => (
                  <View key={req.ingredient.id} style={styles.builderItem}>
                    <Text style={styles.builderName} numberOfLines={1}>{req.ingredient.name}</Text>
                    <TextInput 
                      style={styles.builderInput} 
                      keyboardType="numeric" 
                      value={req.amount ? req.amount.toString() : ''}
                      onChangeText={(val) => {
                        const amount = parseFloat(val) || 0;
                        updateLoggedMealIngredientAmount(loggedMealEditor.id, req.ingredient.id, amount);
                        // Update local state so UI updates
                        setLoggedMealEditor(prev => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            ingredients: (prev.ingredients || []).map(r => r.ingredient.id === req.ingredient.id ? { ...r, amount } : r)
                          };
                        });
                      }} 
                    />
                    <Text style={styles.builderLabel}>g/ml</Text>

                  </View>
                ))}
              </ScrollView>

            </View>


          </View>

        )}
      </SwipeableModal>

      {/* EDIT INGREDIENT MODAL */}
      <SwipeableModal visible={!!ingredientEditor} onClose={() => setIngredientEditor(null)}>
        {ingredientEditor && (
          <View style={{ paddingBottom: 20 }}>
            <Text style={styles.modalTitle}>Edit Ingredient</Text>
            <TextInput
              style={[styles.textInputFull, { marginBottom: 16 }]}
              value={editIngName}
              onChangeText={setEditIngName}
              placeholder="Ingredient Name"
              placeholderTextColor="#666"
            />
            <Text style={styles.formHint}>Macros per {ingredientEditor.baseAmount}g/ml</Text>
            <View style={styles.macroFormRow}>
              <TextInput style={styles.macroFormInput} placeholder="Kcal" placeholderTextColor="#666" keyboardType="numeric" value={editIngCal} onChangeText={setEditIngCal} />
              <TextInput style={styles.macroFormInput} placeholder="Pro (g)" placeholderTextColor="#666" keyboardType="numeric" value={editIngPro} onChangeText={setEditIngPro} />
              <TextInput style={styles.macroFormInput} placeholder="Carb (g)" placeholderTextColor="#666" keyboardType="numeric" value={editIngCar} onChangeText={setEditIngCar} />
              <TextInput style={styles.macroFormInput} placeholder="Fat (g)" placeholderTextColor="#666" keyboardType="numeric" value={editIngFat} onChangeText={setEditIngFat} />

            </View>
            <TouchableOpacity style={styles.fullBtn} onPress={() => {
              if (!editIngName.trim()) return showCustomAlert('Error', 'Name is required.');
              updateIngredient({
                ...ingredientEditor,
                name: editIngName,
                calories: parseFloat(editIngCal) || 0,
                protein: parseFloat(editIngPro) || 0,
                carbs: parseFloat(editIngCar) || 0,
                fat: parseFloat(editIngFat) || 0,
              });
              setIngredientEditor(null);
            }}>
              <Text style={styles.fullBtnText}>Save Changes</Text>
            </TouchableOpacity>

          </View>
        )}
      </SwipeableModal>

      {/* GLOBAL TARGETS MODAL */}
      <SwipeableModal visible={globalTargetsEditorVisible} onClose={() => setGlobalTargetsEditorVisible(false)}>
        <Text style={styles.modalTitle}>Global Targets</Text>
        <Text style={styles.formHint}>These targets apply when no Diet Plan is active.</Text>
        <View style={styles.macroFormRow}>
          <TextInput style={styles.macroFormInput} placeholder="Kcal" placeholderTextColor="#666" keyboardType="numeric" value={targetCal} onChangeText={setTargetCal} />
          <TextInput style={styles.macroFormInput} placeholder="Pro (g)" placeholderTextColor="#666" keyboardType="numeric" value={targetPro} onChangeText={setTargetPro} />
          <TextInput style={styles.macroFormInput} placeholder="Carb (g)" placeholderTextColor="#666" keyboardType="numeric" value={targetCar} onChangeText={setTargetCar} />
          <TextInput style={styles.macroFormInput} placeholder="Fat (g)" placeholderTextColor="#666" keyboardType="numeric" value={targetFat} onChangeText={setTargetFat} />

        </View>
        <TouchableOpacity style={styles.fullBtn} onPress={() => {
          setTargets({
            calories: parseFloat(targetCal) || 0,
            protein: parseFloat(targetPro) || 0,
            carbs: parseFloat(targetCar) || 0,
            fat: parseFloat(targetFat) || 0,
          });
          setGlobalTargetsEditorVisible(false);
          showCustomAlert('Success', 'Global targets updated!');
        }}>
          <Text style={styles.fullBtnText}>Save Targets</Text>
        </TouchableOpacity>
      </SwipeableModal>

      {/* MANUAL INGREDIENT MODAL */}
      <SwipeableModal visible={manualIngredientVisible} onClose={() => setManualIngredientVisible(false)}>
        <Text style={styles.modalTitle}>Manual Ingredient</Text>
        <TextInput style={styles.textInputFull} placeholder="Name" placeholderTextColor="#666" value={manIngName} onChangeText={setManIngName} />
        <Text style={styles.formHint}>Macros per 100g/ml</Text>
        <View style={styles.macroFormRow}>
          <TextInput style={styles.macroFormInput} placeholder="Kcal" placeholderTextColor="#666" keyboardType="numeric" value={manIngCal} onChangeText={setManIngCal} />
          <TextInput style={styles.macroFormInput} placeholder="Pro (g)" placeholderTextColor="#666" keyboardType="numeric" value={manIngPro} onChangeText={setManIngPro} />
          <TextInput style={styles.macroFormInput} placeholder="Carb (g)" placeholderTextColor="#666" keyboardType="numeric" value={manIngCar} onChangeText={setManIngCar} />
          <TextInput style={styles.macroFormInput} placeholder="Fat (g)" placeholderTextColor="#666" keyboardType="numeric" value={manIngFat} onChangeText={setManIngFat} />

        </View>

        <TouchableOpacity style={styles.fullBtn} onPress={handleSaveManualIngredient}>
          <Text style={styles.fullBtnText}>Save Ingredient</Text>
        </TouchableOpacity>
      </SwipeableModal>

      <DietPlanManager
        visible={dietPlanManagerVisible}
        onClose={() => { setDietPlanManagerVisible(false); setInitialPlanIdToEdit(null); }}
        initialPlanId={initialPlanIdToEdit}
      />
  
      {/* ONLINE SEARCH MODAL */}
      <Modal visible={onlineSearchVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Database</Text>
            <TouchableOpacity onPress={() => setOnlineSearchVisible(false)}><MaterialCommunityIcons name="close" size={28} color="#FFF" /></TouchableOpacity>

          </View>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.textInputFull, { flex: 1, marginTop: 0, marginHorizontal: 0 }]}
                placeholder="Search e.g. Döner, Pizza..."
                placeholderTextColor="#666"
                value={onlineSearchQuery}
                onChangeText={setOnlineSearchQuery}
                onSubmitEditing={searchOnlineFood}
                returnKeyType="search"
                autoFocus
              />
              <TouchableOpacity 
                style={{ backgroundColor: theme.accent || '#00D2FF', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 }}
                onPress={searchOnlineFood}
                disabled={isSearching}
              >
                <Text style={{ color: '#000', fontWeight: '800' }}>{isSearching ? '...' : 'Go'}</Text>
              </TouchableOpacity>

            </View>

          </View>
          
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            {onlineSearchResults.map((prod, idx) => {
              const kcal = Math.round(prod.nutriments['energy-kcal_100g'] || (prod.nutriments.energy_100g ? prod.nutriments.energy_100g / 4.184 : 0));
              const pro = Math.round(prod.nutriments.proteins_100g || 0);
              const car = Math.round(prod.nutriments.carbohydrates_100g || 0);
              const fat = Math.round(prod.nutriments.fat_100g || 0);
              
              const isFavorite = ingredients.some(ing => ing.name.toLowerCase() === prod.product_name.toLowerCase());
              return (
                <View key={prod.id || idx} style={styles.poolItem}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.poolName}>{prod.product_name}</Text>
                    {prod.brands ? <Text style={{ color: '#666', fontSize: 12 }}>{prod.brands}</Text> : null}
                    <Text style={styles.poolMacros}>Per 100g: {kcal}kcal • {pro}P • {car}C • {fat}F</Text>
                  </View>
                  <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={() => {
                    if (isFavorite) {
                      Alert.alert("Bereits gespeichert", "Dieses Lebensmittel ist bereits in deiner Zutatenliste.");
                    } else {
                      addIngredient({
                        id: Date.now().toString() + Math.random().toString(36).substring(7),
                        name: prod.product_name,
                        baseAmount: 100,
                        calories: kcal,
                        protein: pro,
                        carbs: car,
                        fat: fat,
                        usageCount: 0
                      });
                    }
                  }}>
                    <MaterialCommunityIcons name={isFavorite ? "star" : "star-outline"} size={26} color={isFavorite ? "#FFD60A" : "#888"} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.logPill} onPress={() => {
                    setSelectedOnlineFood({ ...prod, parsedKcal: kcal, parsedPro: pro, parsedCar: car, parsedFat: fat });
                    setOnlineFoodPortion('100');
                    setOnlineSearchVisible(false); // Close the search
                  }}>
                    <Text style={styles.logPillText}>Select</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {onlineSearchResults.length === 0 && !isSearching && onlineSearchQuery.length > 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No results or press Go.</Text>
            )}
          </ScrollView>

        </View>
      </Modal>

      {/* ONLINE FOOD PORTION MODAL */}
      <SwipeableModal visible={!!selectedOnlineFood} onClose={() => setSelectedOnlineFood(null)}>
        {selectedOnlineFood && (
          <View>
            <Text style={styles.modalTitle}>Log {selectedOnlineFood.product_name}</Text>
            <Text style={{ color: '#888', marginBottom: 16 }}>How many grams did you consume? (Standard portion for e.g. Döner is ~350g, Pizza ~400g)</Text>
            <TextInput 
              style={{ backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' }}
              keyboardType="numeric"
              value={onlineFoodPortion}
              onChangeText={setOnlineFoodPortion}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
               {['100', '250', '350', '400', '500'].map(p => (
                 <TouchableOpacity key={p} style={{ backgroundColor: '#1E1E1E', padding: 10, borderRadius: 8 }} onPress={() => setOnlineFoodPortion(p)}>
                   <Text style={{ color: theme.accent || '#00D2FF', fontWeight: 'bold' }}>{p}g</Text>
                 </TouchableOpacity>
               ))}

            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                const amount = parseFloat(onlineFoodPortion) || 0;
                if (amount > 0) {
                  const factor = amount / 100;
                  // Add as an ingredient to their pool as well so they can reuse it
                  const newIng = {
                    id: Date.now().toString(),
                    name: selectedOnlineFood.product_name,
                    baseAmount: 100,
                    calories: selectedOnlineFood.parsedKcal,
                    protein: selectedOnlineFood.parsedPro,
                    carbs: selectedOnlineFood.parsedCar,
                    fat: selectedOnlineFood.parsedFat,
                    usageCount: 1
                  };
                  addIngredient(newIng);
                  
                  addLoggedMeal({
                    name: selectedOnlineFood.product_name,
                    ingredients: [{ ingredient: newIng, amount }],
                    calories: selectedOnlineFood.parsedKcal * factor, 
                    protein: selectedOnlineFood.parsedPro * factor, 
                    carbs: selectedOnlineFood.parsedCar * factor, 
                    fat: selectedOnlineFood.parsedFat,
                    usageCount: 1 * factor 
                  });
                  triggerSuccess();
                }
                setSelectedOnlineFood(null);
              }}
            >
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>Log {Math.round((parseFloat(onlineFoodPortion)||0)/100 * selectedOnlineFood.parsedKcal)} kcal</Text>
            </TouchableOpacity>

          </View>
        )}
      </SwipeableModal>


      <SwipeableModal visible={!!actionMealId} onClose={() => setActionMealId(null)}>
        <Text style={styles.modalTitle}>Meal Options</Text>
        <View style={{ marginTop: 24, marginBottom: 24 }}>
          <TouchableOpacity style={styles.actionMenuBtn} onPress={() => {
            if (actionMealId) {
               moveMealToYesterday(actionMealId);
               setActionMealId(null);
            }
          }}>
            <MaterialCommunityIcons name="calendar-arrow-left" size={24} color={theme.accent || "#00D2FF"} />
            <Text style={styles.actionMenuBtnText}>Log for Yesterday</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionMenuBtn, { marginTop: 12 }]} onPress={() => {
            if (actionMealId) {
               deleteLoggedMeal(actionMealId);
               setActionMealId(null);
            }
          }}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF453A" />
            <Text style={[styles.actionMenuBtnText, { color: '#FF453A' }]}>Delete Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionMenuBtn, { marginTop: 24, backgroundColor: '#2A2A2A', justifyContent: 'center' }]} onPress={() => setActionMealId(null)}>
            <Text style={[styles.actionMenuBtnText, { marginLeft: 0, textAlign: 'center' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SwipeableModal>

      <BarcodeScannerModal 
        visible={barcodeModalVisible} 
        onClose={() => setBarcodeModalVisible(false)} 
        onIngredientFound={handleIngredientFound} 
      />

      <BarcodeScannerModal 
        visible={quickScanModalVisible} 
        onClose={() => setQuickScanModalVisible(false)} 
        onIngredientFound={(ing) => {
          addIngredient(ing);
          setQuickScanModalVisible(false);
          setScannedIngredient(ing);
          setPortionGrams('100');
        }} 
      />

      <SwipeableModal visible={!!scannedIngredient} onClose={() => setScannedIngredient(null)}>
        {scannedIngredient && (
          <View>
            <Text style={styles.modalTitle}>Log Ingredient</Text>
            <TextInput 
              style={[styles.textInputFull, { marginHorizontal: 0, marginTop: 12, marginBottom: 16 }]}
              value={scannedIngredient.name}
              onChangeText={(name) => setScannedIngredient({ ...scannedIngredient, name })}
              placeholder="Ingredient Name"
              placeholderTextColor="#666"
            />
            <Text style={{ color: '#888', marginBottom: 16 }}>How many grams/ml did you consume?</Text>
            <TextInput 
              style={{ backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' }}
              keyboardType="numeric"
              value={portionGrams}
              onChangeText={setPortionGrams}
            />
            <TouchableOpacity 
              style={{ backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                const amount = parseFloat(portionGrams) || 0;
                if (amount > 0) {
                  updateIngredient(scannedIngredient);
                  incrementIngredientUsage(scannedIngredient.id);

                  addLoggedMeal({
                    name: scannedIngredient.name,
                    ingredients: [{ ingredient: scannedIngredient, amount }],
                    calories: 0, protein: 0, carbs: 0, fat: 0 
                  });
                }
                setScannedIngredient(null);
              }}
            >
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>Log Food</Text>
            </TouchableOpacity>

          </View>

        )}
      </SwipeableModal>


      {/* HISTORY MODAL */}
      <Modal visible={historyModalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nutrition History</Text>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>

          </View>

          <KeyboardAwareWrapper contentContainerStyle={styles.modalScroll}>
            {nutritionHistory.length === 0 ? (
              <Text style={styles.emptyText}>No history available yet. Hit "Start New Day" at the end of the day to log today's result!</Text>
            ) : (
              [...nutritionHistory].reverse().map((day, idx) => {
                const isExpanded = expandedHistoryDate === day.date;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.poolItem, { borderColor: day.hitGoal ? '#30D158' : '#FF453A', flexDirection: 'column', alignItems: 'stretch' }]}
                    onPress={() => setExpandedHistoryDate(isExpanded ? null : day.date)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.poolName, { color: day.hitGoal ? '#30D158' : '#FF453A' }]}>
                          {day.date} {day.hitGoal ? '🎯 Goal Met' : '❌ Missed'}
                        </Text>
                        <Text style={styles.poolMacros}>{day.calories} kcal • {day.protein}g P • {day.carbs}g C • {day.fat}g F</Text>
                        <Text style={styles.poolSub}>{day.meals.length} Meals Logged</Text>

                      </View>

                      <MaterialCommunityIcons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color="#888" />

                    </View>

                    
                    {isExpanded && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' }}>
                        {day.meals.length === 0 ? (
                          <Text style={styles.emptyText}>No meals logged.</Text>
                        ) : (
                          day.meals.map((meal) => (
                            <View key={meal.id} style={{ marginBottom: 8 }}>
                              <Text style={{ color: theme.accent || '#00D2FF', fontSize: 12, fontWeight: '800' }}>{meal.time}</Text>
                              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{meal.name}</Text>
                              <Text style={{ color: '#888', fontSize: 12 }}>{meal.calories} kcal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F</Text>

                            </View>
                          ))
                        )}

                      </View>

                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </KeyboardAwareWrapper>

        </View>

      </Modal>

      <ShoppingListModal
        visible={shoppingListVisible}
        onClose={() => setShoppingListVisible(false)}
        targetPlanId={activeDietPlan?.id}
      />

      <MealAutoBalancerModal
        visible={balancerModalVisible}
        onClose={() => setBalancerModalVisible(false)}
        targetMealId={selectedBalancerTargetId}
      />

      <AiNutritionCoachModal
        visible={aiCoachModalVisible}
        onClose={() => setAiCoachModalVisible(false)}
        remainingCal={remainingCal}
        remainingPro={remainingPro}
        remainingCar={remainingCar}
        remainingFat={remainingFat}
      />

      <AccentThemePickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />

    </View>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 0 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    minHeight: 44,
    marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePlanPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#00D2FF20', padding: 12, borderRadius: 12, marginBottom: 0, gap: 8, borderWidth: 1, borderColor: '#00D2FF' },
  activePlanText: { color: '#00D2FF', fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 32, marginBottom: 16 },
  modalSubtitle: { fontSize: 13, color: '#888', marginTop: 4 },
  emptyText: { color: '#888', fontStyle: 'italic', marginTop: 12 },
  
  card: { backgroundColor: '#161C22', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.28)' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  
  macroRow: { marginBottom: 12 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroLabel: { color: '#DDD', fontWeight: '600' },
  macroValues: { color: '#888', fontSize: 13 },
  progressBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4 },
  progressBarFill: { height: 8, borderRadius: 4 },
  
  resetBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  resetBtnText: { color: '#FF453A', fontWeight: '700' },

  managerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },

  actionMenuBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161C22', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.28)' },
  actionMenuBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 12 },

  managerBtn: { flex: 1, backgroundColor: '#161C22', marginHorizontal: 4, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.28)' },
  managerBtnText: { color: '#FFF', marginTop: 8, fontWeight: '600', fontSize: 12 },

  loggedMealItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161C22', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.28)' },
  mealTime: { color: '#00D2FF', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  mealName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  mealMacros: { color: '#888', fontSize: 12, marginTop: 4 },

  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#181818', borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  modalScroll: { flexGrow: 1, padding: 16 },

  addActionsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#161C22', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.28)' , marginHorizontal: 4, marginBottom: 12 },
  actionBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8 },

  poolItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161C22', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.28)' },
  poolName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  poolMacros: { color: '#888', fontSize: 12, marginTop: 4 },
  poolSub: { color: '#00D2FF', fontSize: 11, fontWeight: '700', marginTop: 2 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#28282C', borderWidth: 1, borderColor: '#38383E' },
  sortChipActive: { backgroundColor: '#00D2FF20', borderColor: '#00D2FF' },
  sortChipText: { color: '#888', fontSize: 12, fontWeight: '700' },
  sortChipTextActive: { color: '#00D2FF' },

  logPill: { backgroundColor: '#30D158', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  logPillText: { color: '#000', fontWeight: '800', fontSize: 12 },

  fullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A84FF', margin: 16, padding: 16, borderRadius: 12 },
  fullBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16, marginLeft: 8 },

  textInputFull: { backgroundColor: '#1E1E1E', color: '#FFF', fontSize: 16, padding: 16, marginHorizontal: 16, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  sectionHeader: { color: '#888', fontSize: 14, fontWeight: '800', marginHorizontal: 16, marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },

  builderItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  builderName: { flex: 1, color: '#FFF', fontWeight: '600', marginRight: 8 },
  builderInput: { backgroundColor: '#28282C', color: '#FFF', width: 60, padding: 8, borderRadius: 8, textAlign: 'center', fontWeight: '700' },
  builderLabel: { color: '#888', marginLeft: 8, fontSize: 12, fontWeight: '600' },

  addIngBtn: { padding: 16, alignItems: 'center', backgroundColor: 'rgba(10, 132, 255, 0.1)', borderRadius: 12, marginTop: 8 },
  addIngBtnText: { color: '#0A84FF', fontWeight: '700' },

  formHint: { color: '#888', fontSize: 12, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  macroFormRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 24 },
  macroFormInput: { flex: 1, backgroundColor: '#1E1E1E', color: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', textAlign: 'center' },
  
  quickAddBtn: { backgroundColor: '#1E1E1E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  quickAddBtnText: { color: '#00D2FF', fontWeight: '700', fontSize: 13 },

  loggedMealThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C22',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  recipeImageWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#26262A',
    borderWidth: 1,
    borderColor: '#38383E',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  recipeImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202024',
  },
  recipeImagePlaceholderText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  recipeImageBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    padding: 3,
  },
  recipeServingMacros: {
    color: '#CCC',
    fontSize: 12,
    marginTop: 3,
  },
  recipeCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  portionOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  portionBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  portionSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: '#333338',
    maxHeight: '85%',
  },
  portionModalThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  portionModalThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#28282C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  portionMacroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#252528',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#35353A',
  },
  portionMacroItem: {
    alignItems: 'center',
  },
  portionMacroVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  portionMacroLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  portionMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#38383E',
  },
  portionStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 16,
  },
  portionStepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2C30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  portionInputContainer: {
    alignItems: 'center',
    minWidth: 120,
  },
  portionNumberInput: {
    backgroundColor: '#28282C',
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38383E',
    minWidth: 90,
  },
  portionUnitLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  quickPortionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  quickPortionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#28282C',
    borderWidth: 1,
    borderColor: '#38383E',
  },
  quickPortionChipActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.2)',
    borderColor: '#00D2FF',
  },
  quickPortionText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
  },
  quickPortionTextActive: {
    color: '#00D2FF',
  },
  confirmLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#30D158',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmLogBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  activePlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  activePlanShoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30D158',
    gap: 6,
  },
  activePlanShoppingBtnText: {
    color: '#30D158',
    fontWeight: '700',
    fontSize: 13,
  },
  remainingHeroCard: {
    backgroundColor: '#161C22',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    marginBottom: 12,
  },
  inlineTargetEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
  },
  inlineTargetEditText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
  },
  remainingLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  remainingCalVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00D2FF',
  },
  remainingCalUnit: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
  },
  remainingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  progressCircleBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#12171D',
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
  remainingCalBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#222B33',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  remainingCalBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  remainingMacroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  remainingMacroPill: {
    flex: 1,
    backgroundColor: '#12171D',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222C36',
  },
  remMacroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remMacroLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: '800',
  },
  remMacroVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  remMacroSub: {
    color: '#777',
    fontSize: 9,
    fontWeight: '600',
  },
  remMacroMiniBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#222B33',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 5,
  },
  remMacroMiniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  editRecipePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    marginRight: 6,
  },
  editRecipePillText: {
    color: '#00D2FF',
    fontWeight: '800',
    fontSize: 12,
  },
  planSubSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222C36',
  },
  planSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planSubTitle: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  planSubBadge: {
    backgroundColor: '#16232D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#263B4D',
  },
  planSubBadgeDone: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderColor: 'rgba(48, 209, 88, 0.4)',
  },
  planSubBadgeText: {
    color: '#00D2FF',
    fontSize: 9,
    fontWeight: '800',
  },
  planSubRemainingText: {
    color: '#DDD',
    fontSize: 10,
    fontWeight: '600',
  },
  planSubTotalText: {
    color: '#778899',
    fontSize: 9,
  },
  plannedMealsScroll: {
    marginTop: 2,
  },
  plannedMealsScrollContent: {
    paddingVertical: 2,
    gap: 8,
  },
  plannedMealCard: {
    width: 122,
    backgroundColor: '#12171D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222C36',
    overflow: 'hidden',
  },
  plannedMealCardEaten: {
    backgroundColor: '#101417',
    borderColor: '#1E262E',
    opacity: 0.48,
  },
  plannedMealThumbContainer: {
    position: 'relative',
    width: '100%',
    height: 62,
    backgroundColor: '#1B252E',
    overflow: 'hidden',
  },
  plannedMealThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  plannedMealThumbDimmed: {
    opacity: 0.45,
  },
  plannedMealThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1B252E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedMealThumbPlaceholderDimmed: {
    backgroundColor: '#13181C',
  },
  plannedMealTimeOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(12, 16, 20, 0.82)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  plannedMealTime: {
    color: '#00D2FF',
    fontSize: 9,
    fontWeight: '800',
  },
  balancerMiniTagOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF9500',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  balancerMiniTagText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  plannedMealAddCorner: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 16, 20, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedMealThumbCheck: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 24, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedMealCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#30D158',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedMealCardBody: {
    padding: 6,
  },
  plannedMealName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  plannedMealNameEaten: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  plannedMealMacros: {
    color: '#8E9DA8',
    fontSize: 10,
    marginTop: 1,
  },
  textDimmed: {
    color: '#666',
  },
  slimBalancerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  slimBalancerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 9,
  },
  slimBalancerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 149, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimBalancerLabel: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  slimBalancerMealTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  slimBalancerInfo: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  slimBalancerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  slimBalancerGramBtn: {
    backgroundColor: '#1F2933',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#324150',
  },
  slimBalancerGramBtnActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.14)',
    borderColor: 'rgba(0, 210, 255, 0.45)',
  },
  slimBalancerGramBtnText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '800',
  },
  slimBalancerLogBtn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  slimBalancerLogBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  slimBalancerDonePill: {
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  slimBalancerGramPopup: {
    marginTop: 7,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  slimGramChipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slimGramChipPill: {
    backgroundColor: '#1A222B',
    borderWidth: 1,
    borderColor: '#2A3644',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  slimGramChipText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '600',
  },
  slimModalLinkBtn: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slimModalLinkText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
  },
  compactQuickAddFooter: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#222C36',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactQuickAddLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compactQuickAddPill: {
    backgroundColor: '#16222B',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  compactQuickAddPillText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
  },
  compactToolsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  compactToolCard: {
    flex: 1,
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  compactToolText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  todayLogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayLogHintText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  plannedMealsEmpty: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  plannedMealsEmptyText: {
    color: '#778',
    fontSize: 11,
    fontStyle: 'italic',
  },
  plannedMealsNoPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  plannedMealsNoPlanText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  aiCoachHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  aiCoachBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  aiCoachIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCoachTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  aiCoachBadge: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  aiCoachBadgeText: {
    color: '#C084FC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiCoachSubtitle: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 1,
  },
  aiCoachActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiCoachActionText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
  },
});
