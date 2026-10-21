import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useAppStore,
  getLocalDateString,
  SupplementStack,
  SupplementLibraryItem,
  SupplementPlan,
  SupplementTarget,
  showCustomAlert,
} from '../store/store';
import { getAppTheme } from '../utils/theme';
import AccentThemePickerModal from '../components/AccentThemePickerModal';
import SupplementBarcodeScannerModal, { ScannedSupplementResult } from '../components/SupplementBarcodeScannerModal';

type SubTabType = 'today' | 'inventory' | 'plans';

const CATEGORIES = ['Daily Health', 'Performance', 'Recovery', 'Vitamins'] as const;
const UNITS = ['capsule', 'tablet', 'scoop', 'g', 'mg', 'ml', 'drops'] as const;
const TIMES_OF_DAY = ['Morning', 'Pre-Workout', 'Afternoon', 'Post-Workout', 'Evening', 'Bedtime'] as const;

const TIME_META: Record<string, { icon: string; color: string; label: string; defaultTime: string }> = {
  Morning: { icon: 'weather-sunny', color: '#FF9F0A', label: 'Morgens', defaultTime: '08:00' },
  'Pre-Workout': { icon: 'dumbbell', color: '#00D2FF', label: 'Vor dem Training', defaultTime: '16:30' },
  Afternoon: { icon: 'white-balance-sunny', color: '#FFD60A', label: 'Mittags / Nachmittags', defaultTime: '13:00' },
  'Post-Workout': { icon: 'lightning-bolt', color: '#30D158', label: 'Nach dem Training', defaultTime: '18:30' },
  Evening: { icon: 'weather-sunset', color: '#FF6B6B', label: 'Abends', defaultTime: '20:00' },
  Bedtime: { icon: 'weather-night', color: '#BF5AF2', label: 'Vor dem Schlafen', defaultTime: '22:00' },
};

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Daily Health': { icon: 'heart-pulse', color: '#30D158' },
  Performance: { icon: 'flash', color: '#00D2FF' },
  Recovery: { icon: 'sleep', color: '#BF5AF2' },
  Vitamins: { icon: 'white-balance-sunny', color: '#FF9F0A' },
};

export default function SupplementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const supplementPlans = useAppStore((s) => s.supplementPlans);
  const supplementLibrary = useAppStore((s) => s.supplementLibrary);
  const supplementIntakeLog = useAppStore((s) => s.supplementIntakeLog);
  const toggleSupplementIntake = useAppStore((s) => s.toggleSupplementIntake);
  const checkSupplementDailyReset = useAppStore((s) => s.checkSupplementDailyReset);
  const addSupplementLibraryItem = useAppStore((s) => s.addSupplementLibraryItem);
  const updateSupplementLibraryItem = useAppStore((s) => s.updateSupplementLibraryItem);
  const deleteSupplementLibraryItem = useAppStore((s) => s.deleteSupplementLibraryItem);
  const addSupplementPlan = useAppStore((s) => s.addSupplementPlan);
  const updateSupplementPlan = useAppStore((s) => s.updateSupplementPlan);
  const deleteSupplementPlan = useAppStore((s) => s.deleteSupplementPlan);
  const setActiveSupplementPlan = useAppStore((s) => s.setActiveSupplementPlan);
  const accentThemeId = useAppStore((s) => s.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const today = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [subTab, setSubTab] = useState<SubTabType>('today');
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  // Inventory filters & search
  const [invSearch, setInvSearch] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('ALL');

  // Supplement Library Add/Edit Modal State
  const [libModalVisible, setLibModalVisible] = useState(false);
  const [editingLibItem, setEditingLibItem] = useState<SupplementLibraryItem | null>(null);
  const [libName, setLibName] = useState('');
  const [libBrand, setLibBrand] = useState('');
  const [libCategory, setLibCategory] = useState<string>('Daily Health');
  const [libUnit, setLibUnit] = useState<string>('capsule');
  const [libUnitsPerBox, setLibUnitsPerBox] = useState('120');
  const [libCurrentInv, setLibCurrentInv] = useState('120');
  const [libImageUri, setLibImageUri] = useState<string | undefined>(undefined);
  const [libBarcode, setLibBarcode] = useState<string | undefined>(undefined);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);

  // Stack Add/Edit Modal State
  const [stackModalVisible, setStackModalVisible] = useState(false);
  const [targetPlanForStack, setTargetPlanForStack] = useState<SupplementPlan | null>(null);
  const [editingStack, setEditingStack] = useState<SupplementStack | null>(null);
  const [stackName, setStackName] = useState('');
  const [stackTimeOfDay, setStackTimeOfDay] = useState<string>('Morning');
  const [stackTimeTarget, setStackTimeTarget] = useState('08:00');
  const [stackTargets, setStackTargets] = useState<SupplementTarget[]>([]);

  // New Plan Name Input
  const [newPlanName, setNewPlanName] = useState('');

  useEffect(() => {
    checkSupplementDailyReset();
  }, []);

  const activePlan = useMemo(
    () => (supplementPlans || []).find((p) => p.isActive) || (supplementPlans || [])[0] || null,
    [supplementPlans]
  );

  const selectedDayLog = useMemo(
    () => supplementIntakeLog?.[selectedDate]?.checkedItems || {},
    [supplementIntakeLog, selectedDate]
  );

  const todaysLog = useMemo(
    () => supplementIntakeLog?.[today]?.checkedItems || {},
    [supplementIntakeLog, today]
  );

  // Calculate daily required units per library item in the active plan
  const dailyRequiredByItemId = useMemo(() => {
    const map: Record<string, number> = {};
    if (!activePlan) return map;
    activePlan.stacks.forEach((stack) => {
      stack.supplements.forEach((supp) => {
        const libItem = (supplementLibrary || []).find((l) => l.id === supp.libraryItemId);
        const units = supp.targetDosage / (libItem?.contentPerUnit || 1);
        map[supp.libraryItemId] = (map[supp.libraryItemId] || 0) + units;
      });
    });
    return map;
  }, [activePlan, supplementLibrary]);

  // Calculate estimated days remaining for an item
  const getDaysRemaining = (item: SupplementLibraryItem): number | null => {
    if (item.currentInventory === undefined) return null;
    const dailyNeed = dailyRequiredByItemId[item.id] || 0;
    if (dailyNeed <= 0) return null;
    return Math.max(0, Math.floor(item.currentInventory / dailyNeed));
  };

  // Low stock items (< 15% of box OR <= 7 days remaining in active plan)
  const lowStockItems = useMemo(() => {
    return (supplementLibrary || []).filter((item) => {
      if (item.currentInventory === undefined) return false;
      const box = item.unitsPerBox || 100;
      const ratio = box > 0 ? item.currentInventory / box : 1;
      const daysLeft = getDaysRemaining(item);
      return ratio < 0.15 || (daysLeft !== null && daysLeft <= 7);
    });
  }, [supplementLibrary, dailyRequiredByItemId]);

  // Shortest remaining supply in days across active plan items
  const shortestSupplyDays = useMemo(() => {
    let minDays: number | null = null;
    (supplementLibrary || []).forEach((item) => {
      const d = getDaysRemaining(item);
      if (d !== null && (minDays === null || d < minDays)) {
        minDays = d;
      }
    });
    return minDays;
  }, [supplementLibrary, dailyRequiredByItemId]);

  // Today's intake progress
  const { totalSupplementsToday, takenSupplementsToday, pctTaken } = useMemo(() => {
    let total = 0;
    let taken = 0;
    if (activePlan) {
      activePlan.stacks.forEach((stack) => {
        stack.supplements.forEach((supp) => {
          total += 1;
          if (todaysLog[`${stack.id}_${supp.libraryItemId}`]) {
            taken += 1;
          }
        });
      });
    }
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { totalSupplementsToday: total, takenSupplementsToday: taken, pctTaken: pct };
  }, [activePlan, todaysLog]);

  // Next pending stack today
  const nextPendingStack = useMemo(() => {
    if (!activePlan) return null;
    return (
      activePlan.stacks.find(
        (s) =>
          s.supplements.length > 0 &&
          !s.supplements.every((supp) => todaysLog[`${s.id}_${supp.libraryItemId}`])
      ) || null
    );
  }, [activePlan, todaysLog]);

  const formatLocalDate = (dt: Date) => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const dy = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  // Consecutive supplement streak (days with >= 1 logged supplement or library max streak)
  const { consecutiveDaysStreak, globalAdherence } = useMemo(() => {
    let dayStreak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const dStr = formatLocalDate(cursor);
      const checked = supplementIntakeLog?.[dStr]?.checkedItems || {};
      const count = Object.keys(checked).filter((k) => checked[k]).length;
      if (count > 0) {
        dayStreak++;
      } else if (i > 0) {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    const maxItemStreak = (supplementLibrary || []).reduce(
      (max, item) => Math.max(max, item.streak || 0),
      0
    );
    const streakVal = Math.max(dayStreak, maxItemStreak);

    // Adherence across last 7 days or item history
    let totalTaken = 0;
    let totalMissed = 0;
    (supplementLibrary || []).forEach((item) => {
      totalTaken += item.totalTakenTimes || 0;
      totalMissed += item.totalMissedTimes || 0;
    });

    let adherence =
      totalTaken + totalMissed > 0
        ? Math.round((totalTaken / (totalTaken + totalMissed)) * 100)
        : pctTaken;

    return { consecutiveDaysStreak: streakVal, globalAdherence: adherence };
  }, [supplementIntakeLog, supplementLibrary, pctTaken]);

  // Last 7 days strip
  const last7Days = useMemo(() => {
    const days: { dateStr: string; label: string; isToday: boolean; taken: number; total: number }[] = [];
    const dayNames = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
    const totalPerDay =
      activePlan?.stacks.reduce((acc, s) => acc + s.supplements.length, 0) || 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatLocalDate(d);
      const checked = supplementIntakeLog?.[dStr]?.checkedItems || {};
      let takenCount = 0;
      if (activePlan) {
        activePlan.stacks.forEach((s) => {
          s.supplements.forEach((supp) => {
            if (checked[`${s.id}_${supp.libraryItemId}`]) takenCount++;
          });
        });
      } else {
        takenCount = Object.keys(checked).filter((k) => checked[k]).length;
      }
      days.push({
        dateStr: dStr,
        label: i === 0 ? 'HEUTE' : dayNames[d.getDay()],
        isToday: i === 0,
        taken: takenCount,
        total: totalPerDay,
      });
    }
    return days;
  }, [activePlan, supplementIntakeLog]);

  // Toggle entire stack for selectedDate
  const handleTakeStack = (stack: SupplementStack, dateToUse: string = selectedDate) => {
    const logForDate = supplementIntakeLog?.[dateToUse]?.checkedItems || {};
    const allTaken =
      stack.supplements.length > 0 &&
      stack.supplements.every((s) => logForDate[`${stack.id}_${s.libraryItemId}`]);

    stack.supplements.forEach((supp) => {
      const isTaken = !!logForDate[`${stack.id}_${supp.libraryItemId}`];
      if (allTaken) {
        if (isTaken) {
          toggleSupplementIntake(dateToUse, stack.id, supp.libraryItemId, supp.targetDosage);
        }
      } else {
        if (!isTaken) {
          toggleSupplementIntake(dateToUse, stack.id, supp.libraryItemId, supp.targetDosage);
        }
      }
    });
    Vibration.vibrate(25);
  };

  // 1-Tap Restock (+1 Box)
  const handleRestockItem = (item: SupplementLibraryItem) => {
    const addAmount = item.unitsPerBox && item.unitsPerBox > 0 ? item.unitsPerBox : 100;
    const current = item.currentInventory || 0;
    const updated: SupplementLibraryItem = {
      ...item,
      currentInventory: current + addAmount,
      unitsPerBox: item.unitsPerBox || addAmount,
    };
    updateSupplementLibraryItem(updated);
    Vibration.vibrate(20);
    showCustomAlert(
      'Vorrat aufgefüllt',
      `+${addAmount} ${item.unit} zu „${item.name}“ hinzugefügt (Neu: ${current + addAmount} ${item.unit}).`
    );
  };

  // 1-Tap Single Dose Log outside of stack
  const handleQuickSingleDose = (item: SupplementLibraryItem) => {
    const current = item.currentInventory ?? 0;
    const nextInv = Math.max(0, current - 1);
    updateSupplementLibraryItem({
      ...item,
      currentInventory: nextInv,
      totalTakenTimes: (item.totalTakenTimes || 0) + 1,
      streak: (item.streak || 0) + 1,
    });
    Vibration.vibrate(15);
  };

  // 1-Tap Starter Preset Generator
  const handleLoadStarterPreset = (presetType: 'essential' | 'hypertrophy') => {
    const nowId = Date.now().toString();
    const existingByName = (name: string) =>
      (supplementLibrary || []).find((i) => i.name.toLowerCase() === name.toLowerCase());

    const ensureLibItem = (
      suffix: string,
      name: string,
      brand: string,
      category: string,
      unit: string,
      box: number
    ): string => {
      const found = existingByName(name);
      if (found) return found.id;
      const newId = `supp_${nowId}_${suffix}`;
      addSupplementLibraryItem({
        id: newId,
        name,
        brand,
        category,
        unit,
        contentPerUnit: 1,
        unitsPerBox: box,
        currentInventory: box,
        streak: 1,
        totalTakenTimes: 1,
        totalMissedTimes: 0,
      });
      return newId;
    };

    if (presetType === 'essential') {
      const creatId = ensureLibItem('creat', 'Creatin Monohydrat', 'Creapure', 'Performance', 'g', 500);
      const omegaId = ensureLibItem('omega', 'Omega-3 Triglycerid', 'ESN', 'Daily Health', 'capsule', 120);
      const d3Id = ensureLibItem('d3k2', 'Vitamin D3 + K2 MK7', 'Sunday Natural', 'Vitamins', 'drops', 300);
      const magId = ensureLibItem('mag', 'Magnesium Bisglycinat', 'More Nutrition', 'Recovery', 'capsule', 120);

      const newPlan: SupplementPlan = {
        id: `plan_${nowId}_essential`,
        name: 'Basis Health & Performance',
        isActive: true,
        stacks: [
          {
            id: `stack_${nowId}_morning`,
            name: 'Morning Health Stack',
            timeOfDay: 'Morning',
            timeTarget: '08:00',
            supplements: [
              { libraryItemId: omegaId, targetDosage: 2 },
              { libraryItemId: d3Id, targetDosage: 1 },
              { libraryItemId: creatId, targetDosage: 5 },
            ],
          },
          {
            id: `stack_${nowId}_bedtime`,
            name: 'Night Recovery Stack',
            timeOfDay: 'Bedtime',
            timeTarget: '22:00',
            supplements: [{ libraryItemId: magId, targetDosage: 2 }],
          },
        ],
      };
      addSupplementPlan(newPlan);
      setActiveSupplementPlan(newPlan.id);
      setSubTab('today');
      showCustomAlert(
        'Starter-Plan aktiviert!',
        '„Basis Health & Performance“ inkl. Creatin, Omega-3, Vitamin D3+K2 und Magnesium wurde angelegt und aktiviert.'
      );
    } else {
      const creatId = ensureLibItem('creat', 'Creatin Monohydrat', 'Creapure', 'Performance', 'g', 500);
      const citrId = ensureLibItem('citr', 'L-Citrullin Malat', 'ESN', 'Performance', 'g', 300);
      const wheyId = ensureLibItem('whey', 'Iso Whey Protein', 'ESN', 'Recovery', 'g', 1000);
      const magId = ensureLibItem('mag', 'Magnesium Bisglycinat', 'More Nutrition', 'Recovery', 'capsule', 120);
      const zinkId = ensureLibItem('zink', 'Zink Bisglycinat 25mg', 'Sunday Natural', 'Vitamins', 'tablet', 180);

      const newPlan: SupplementPlan = {
        id: `plan_${nowId}_hyper`,
        name: 'Hypertrophie & Pump Setup',
        isActive: true,
        stacks: [
          {
            id: `stack_${nowId}_pre`,
            name: 'Pre-Workout Pump Stack',
            timeOfDay: 'Pre-Workout',
            timeTarget: '16:30',
            supplements: [
              { libraryItemId: citrId, targetDosage: 8 },
              { libraryItemId: creatId, targetDosage: 5 },
            ],
          },
          {
            id: `stack_${nowId}_post`,
            name: 'Post-Workout Shake',
            timeOfDay: 'Post-Workout',
            timeTarget: '18:30',
            supplements: [{ libraryItemId: wheyId, targetDosage: 30 }],
          },
          {
            id: `stack_${nowId}_night`,
            name: 'Deep Sleep & Regeneration',
            timeOfDay: 'Bedtime',
            timeTarget: '22:15',
            supplements: [
              { libraryItemId: magId, targetDosage: 2 },
              { libraryItemId: zinkId, targetDosage: 1 },
            ],
          },
        ],
      };
      addSupplementPlan(newPlan);
      setActiveSupplementPlan(newPlan.id);
      setSubTab('today');
      showCustomAlert(
        'Hypertrophie-Plan aktiviert!',
        '„Hypertrophie & Pump Setup“ mit Pre-Workout, Post-Workout und Sleep-Stack wurde erstellt und aktiviert.'
      );
    }
  };

  // Library Modal Helpers
  const openAddLibModal = () => {
    setEditingLibItem(null);
    setLibName('');
    setLibBrand('');
    setLibCategory('Daily Health');
    setLibUnit('capsule');
    setLibUnitsPerBox('120');
    setLibCurrentInv('120');
    setLibImageUri(undefined);
    setLibBarcode(undefined);
    setLibModalVisible(true);
  };

  const openEditLibModal = (item: SupplementLibraryItem) => {
    setEditingLibItem(item);
    setLibName(item.name);
    setLibBrand(item.brand || '');
    setLibCategory(item.category);
    setLibUnit(item.unit);
    setLibUnitsPerBox(item.unitsPerBox?.toString() || '100');
    setLibCurrentInv(item.currentInventory?.toString() || '0');
    setLibImageUri(item.imageUri);
    setLibBarcode(item.barcode);
    setLibModalVisible(true);
  };

  const pickSupplementImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setLibImageUri(result.assets[0].uri);
    }
  };

  const handleSaveLibItem = () => {
    if (!libName.trim()) {
      showCustomAlert('Fehlender Name', 'Bitte gib einen Namen für das Supplement ein.');
      return;
    }
    const newItem: SupplementLibraryItem = {
      id: editingLibItem ? editingLibItem.id : Date.now().toString(),
      name: libName.trim(),
      brand: libBrand.trim() || undefined,
      category: libCategory,
      imageUri: libImageUri,
      unit: libUnit,
      contentPerUnit: 1,
      unitsPerBox: parseFloat(libUnitsPerBox) || 100,
      currentInventory: parseFloat(libCurrentInv) || 0,
      streak: editingLibItem ? editingLibItem.streak : 0,
      totalTakenTimes: editingLibItem ? editingLibItem.totalTakenTimes : 0,
      totalMissedTimes: editingLibItem ? editingLibItem.totalMissedTimes : 0,
      barcode: libBarcode || editingLibItem?.barcode,
    };
    if (editingLibItem) {
      updateSupplementLibraryItem(newItem);
    } else {
      addSupplementLibraryItem(newItem);
    }
    setLibModalVisible(false);
  };

  const handleDeleteLibItem = (item: SupplementLibraryItem) => {
    showCustomAlert(
      'Supplement löschen',
      `Möchtest du „${item.name}“ wirklich aus deiner Bibliothek löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => deleteSupplementLibraryItem(item.id),
        },
      ]
    );
  };

  // Stack Modal Helpers
  const openAddStackModal = (plan: SupplementPlan) => {
    setTargetPlanForStack(plan);
    setEditingStack(null);
    setStackName('');
    setStackTimeOfDay('Morning');
    setStackTimeTarget('08:00');
    setStackTargets([]);
    setStackModalVisible(true);
  };

  const openEditStackModal = (plan: SupplementPlan, stack: SupplementStack) => {
    setTargetPlanForStack(plan);
    setEditingStack(stack);
    setStackName(stack.name);
    setStackTimeOfDay(stack.timeOfDay);
    setStackTimeTarget(stack.timeTarget || TIME_META[stack.timeOfDay]?.defaultTime || '08:00');
    setStackTargets([...stack.supplements]);
    setStackModalVisible(true);
  };

  const toggleTargetInStackModal = (libItemId: string) => {
    const exists = stackTargets.find((t) => t.libraryItemId === libItemId);
    if (exists) {
      setStackTargets(stackTargets.filter((t) => t.libraryItemId !== libItemId));
    } else {
      setStackTargets([...stackTargets, { libraryItemId: libItemId, targetDosage: 1 }]);
    }
  };

  const updateTargetDosageInModal = (libItemId: string, dosageStr: string) => {
    const val = parseFloat(dosageStr) || 0;
    setStackTargets(
      stackTargets.map((t) => (t.libraryItemId === libItemId ? { ...t, targetDosage: val } : t))
    );
  };

  const handleSaveStack = () => {
    if (!targetPlanForStack) return;
    if (!stackName.trim()) {
      showCustomAlert('Fehlender Name', 'Bitte gib einen Namen für den Stack ein (z. B. Morning Stack).');
      return;
    }
    const newStack: SupplementStack = {
      id: editingStack ? editingStack.id : Date.now().toString(),
      name: stackName.trim(),
      timeOfDay: stackTimeOfDay,
      timeTarget: stackTimeTarget.trim() || undefined,
      supplements: stackTargets.filter((t) => t.targetDosage > 0),
    };

    const currentPlan =
      (supplementPlans || []).find((p) => p.id === targetPlanForStack.id) || targetPlanForStack;
    const updatedStacks = editingStack
      ? currentPlan.stacks.map((s) => (s.id === editingStack.id ? newStack : s))
      : [...currentPlan.stacks, newStack];

    updateSupplementPlan({ ...currentPlan, stacks: updatedStacks });
    setStackModalVisible(false);
  };

  const handleDeleteStack = (plan: SupplementPlan, stackId: string) => {
    showCustomAlert('Stack entfernen', 'Diesen Stack wirklich aus dem Plan löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          updateSupplementPlan({
            ...plan,
            stacks: plan.stacks.filter((s) => s.id !== stackId),
          });
        },
      },
    ]);
  };

  const handleCreateCustomPlan = () => {
    if (!newPlanName.trim()) return;
    const isFirst = (supplementPlans || []).length === 0;
    const plan: SupplementPlan = {
      id: Date.now().toString(),
      name: newPlanName.trim(),
      isActive: isFirst,
      stacks: [],
    };
    addSupplementPlan(plan);
    if (isFirst) setActiveSupplementPlan(plan.id);
    setNewPlanName('');
  };

  const filteredLibrary = useMemo(() => {
    return (supplementLibrary || []).filter((item) => {
      const matchesCat = invCategoryFilter === 'ALL' || item.category === invCategoryFilter;
      const matchesSearch =
        !invSearch.trim() ||
        item.name.toLowerCase().includes(invSearch.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(invSearch.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [supplementLibrary, invCategoryFilter, invSearch]);

  const openCountToday = Math.max(0, totalSupplementsToday - takenSupplementsToday);

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ================= HEADER (Matches Nutrition & Training) ================= */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Supplements</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
              onPress={() => setThemePickerVisible(true)}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: subTab === 'inventory' ? theme.accentBgSoft : theme.cardBg,
                  borderColor: subTab === 'inventory' ? theme.accent : theme.cardBorder,
                },
              ]}
              onPress={() => setSubTab('inventory')}
              onLongPress={() => navigation.navigate('SupplementLibrary')}
            >
              <MaterialCommunityIcons
                name="bookshelf"
                size={20}
                color={subTab === 'inventory' ? theme.accent : '#FFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: subTab === 'plans' ? theme.accentBgSoft : theme.cardBg,
                  borderColor: subTab === 'plans' ? theme.accent : theme.cardBorder,
                },
              ]}
              onPress={() => setSubTab('plans')}
              onLongPress={() => navigation.navigate('SupplementPlans')}
            >
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={20}
                color={subTab === 'plans' ? theme.accent : '#FFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.accentBgSoft,
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => setScannerModalVisible(true)}
            >
              <MaterialCommunityIcons name="barcode-scan" size={20} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => {
                if (subTab === 'plans' && activePlan) {
                  openAddStackModal(activePlan);
                } else {
                  openAddLibModal();
                }
              }}
            >
              <MaterialCommunityIcons name="plus" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= TOP ACTIVE PLAN & STOCK PILL ROW ================= */}
        <View style={styles.topPillRow}>
          <TouchableOpacity
            style={[styles.activePlanPill, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
            activeOpacity={0.85}
            onPress={() => setSubTab('plans')}
          >
            <View style={styles.pillLeft}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={theme.accent} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.pillLabel}>AKTIVER PLAN</Text>
                <Text style={styles.pillValue} numberOfLines={1}>
                  {activePlan ? activePlan.name : 'Kein Plan aktiv — Tippen zum Starten'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={18} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stockStatusPill,
              lowStockItems.length > 0
                ? { backgroundColor: 'rgba(255, 159, 10, 0.14)', borderColor: 'rgba(255, 159, 10, 0.45)' }
                : { backgroundColor: 'rgba(48, 209, 88, 0.14)', borderColor: 'rgba(48, 209, 88, 0.4)' },
            ]}
            activeOpacity={0.85}
            onPress={() => setSubTab('inventory')}
          >
            <MaterialCommunityIcons
              name={lowStockItems.length > 0 ? 'alert-circle-outline' : 'package-variant-closed-check'}
              size={16}
              color={lowStockItems.length > 0 ? '#FF9F0A' : '#30D158'}
            />
            <Text
              style={[
                styles.stockStatusText,
                { color: lowStockItems.length > 0 ? '#FF9F0A' : '#30D158' },
              ]}
            >
              {lowStockItems.length > 0 ? `${lowStockItems.length} Knapp` : 'Vorrat OK'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= ALL-IN-ONE SUPPLEMENT HERO CARD ================= */}
        <View style={[styles.heroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.heroEyebrow, { color: theme.accent }]}>TÄGLICHE ROUTINE</Text>
              <Text style={styles.heroHeadline}>
                {totalSupplementsToday === 0
                  ? 'Bereit für dein Setup'
                  : openCountToday === 0
                  ? 'Alle Stacks erledigt! 🎉'
                  : `Noch ${openCountToday} von ${totalSupplementsToday} offen`}
              </Text>
              <Text style={styles.heroSubline} numberOfLines={1}>
                {nextPendingStack
                  ? `Als Nächstes: ${nextPendingStack.name} (${
                      nextPendingStack.timeTarget || TIME_META[nextPendingStack.timeOfDay]?.label || ''
                    })`
                  : totalSupplementsToday > 0
                  ? 'Tagesziel zu 100% erreicht'
                  : 'Lade eine Vorlage oder erstelle deinen ersten Stack'}
              </Text>
            </View>

            <View
              style={[
                styles.progressRingOuter,
                {
                  borderColor:
                    pctTaken === 100
                      ? '#30D158'
                      : pctTaken > 0
                      ? theme.accent
                      : 'rgba(255,255,255,0.12)',
                },
              ]}
            >
              <Text style={styles.progressRingPct}>{pctTaken}%</Text>
              <Text style={styles.progressRingSub}>
                {takenSupplementsToday}/{totalSupplementsToday}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pctTaken}%`,
                  backgroundColor: pctTaken === 100 ? '#30D158' : theme.accent,
                },
              ]}
            />
          </View>

          {/* Next Due Stack Quick-Action Banner */}
          {nextPendingStack && (
            <View
              style={[
                styles.nextStackBanner,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
            >
              <View style={styles.nextStackLeft}>
                <View
                  style={[
                    styles.nextStackIconBox,
                    { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(TIME_META[nextPendingStack.timeOfDay]?.icon as any) || 'lightning-bolt'}
                    size={18}
                    color={theme.accent}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.nextStackEyebrow, { color: theme.accent }]}>
                    NÄCHSTER STACK • {nextPendingStack.timeTarget || TIME_META[nextPendingStack.timeOfDay]?.label}
                  </Text>
                  <Text style={styles.nextStackTitle} numberOfLines={1}>
                    {nextPendingStack.name} ({nextPendingStack.supplements.length} Supp.)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.nextStackActionBtn, { backgroundColor: theme.accent }]}
                activeOpacity={0.85}
                onPress={() => handleTakeStack(nextPendingStack, today)}
              >
                <MaterialCommunityIcons name="check-all" size={16} color="#000" />
                <Text style={styles.nextStackActionText}>Einnehmen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3 KPI Sub-Pills */}
          <View style={styles.heroKpiGrid}>
            <View
              style={[
                styles.heroKpiPill,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
            >
              <View style={styles.heroKpiValRow}>
                <MaterialCommunityIcons name="fire" size={16} color="#FF9F0A" />
                <Text style={styles.heroKpiVal}>{consecutiveDaysStreak} Tage</Text>
              </View>
              <Text style={styles.heroKpiLbl}>Supp-Streak</Text>
            </View>

            <View
              style={[
                styles.heroKpiPill,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
            >
              <View style={styles.heroKpiValRow}>
                <MaterialCommunityIcons name="bullseye-arrow" size={16} color="#30D158" />
                <Text style={styles.heroKpiVal}>{globalAdherence}%</Text>
              </View>
              <Text style={styles.heroKpiLbl}>Adherence</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.heroKpiPill,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
              activeOpacity={0.8}
              onPress={() => setSubTab('inventory')}
            >
              <View style={styles.heroKpiValRow}>
                <MaterialCommunityIcons
                  name="timer-sand"
                  size={15}
                  color={shortestSupplyDays !== null && shortestSupplyDays <= 7 ? '#FF453A' : theme.accent}
                />
                <Text style={styles.heroKpiVal}>
                  {shortestSupplyDays !== null ? `~${shortestSupplyDays}d` : `${supplementLibrary.length} Prod.`}
                </Text>
              </View>
              <Text style={styles.heroKpiLbl}>
                {shortestSupplyDays !== null ? 'Kürzester Vorrat' : 'Bibliothek'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 3-WAY SUB-NAVIGATION ================= */}
        <View style={[styles.subNavContainer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.subNavBtn,
              subTab === 'today' && {
                backgroundColor: theme.accentBgSoft,
                borderColor: theme.accentBorderSoft,
              },
            ]}
            onPress={() => setSubTab('today')}
          >
            <MaterialCommunityIcons
              name="calendar-check"
              size={16}
              color={subTab === 'today' ? theme.accent : '#8E96A0'}
            />
            <Text style={[styles.subNavText, subTab === 'today' && { color: theme.accent }]}>
              Heute
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subNavBtn,
              subTab === 'inventory' && {
                backgroundColor: theme.accentBgSoft,
                borderColor: theme.accentBorderSoft,
              },
            ]}
            onPress={() => setSubTab('inventory')}
          >
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={16}
              color={subTab === 'inventory' ? theme.accent : '#8E96A0'}
            />
            <Text style={[styles.subNavText, subTab === 'inventory' && { color: theme.accent }]}>
              Vorrat ({supplementLibrary.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subNavBtn,
              subTab === 'plans' && {
                backgroundColor: theme.accentBgSoft,
                borderColor: theme.accentBorderSoft,
              },
            ]}
            onPress={() => setSubTab('plans')}
          >
            <MaterialCommunityIcons
              name="layers-triple-outline"
              size={16}
              color={subTab === 'plans' ? theme.accent : '#8E96A0'}
            />
            <Text style={[styles.subNavText, subTab === 'plans' && { color: theme.accent }]}>
              Pläne & Stacks
            </Text>
          </TouchableOpacity>
        </View>

        {/* =======================================================================
            SUB-TAB 1: HEUTE & STACKS
           ======================================================================= */}
        {subTab === 'today' && (
          <View>
            {/* 7-Day Adherence Strip (Selectable Date!) */}
            <View style={[styles.weekStrip, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              {last7Days.map((d) => {
                const isSelected = d.dateStr === selectedDate;
                const isDone = d.total > 0 && d.taken >= d.total;
                const isPartial = d.taken > 0 && d.taken < d.total;
                return (
                  <TouchableOpacity
                    key={d.dateStr}
                    style={[
                      styles.dayPill,
                      isSelected && {
                        backgroundColor: theme.accentBgSoft,
                        borderColor: theme.accentBorderSoft,
                      },
                    ]}
                    onPress={() => setSelectedDate(d.dateStr)}
                  >
                    <Text style={[styles.dayName, isSelected && { color: theme.accent }]}>
                      {d.label}
                    </Text>
                    <View
                      style={[
                        styles.dayDot,
                        isDone
                          ? styles.dayDotDone
                          : isPartial
                          ? styles.dayDotPartial
                          : styles.dayDotOpen,
                      ]}
                    >
                      {isDone ? (
                        <MaterialCommunityIcons name="check" size={13} color="#30D158" />
                      ) : isPartial ? (
                        <Text style={styles.dayDotPartialText}>
                          {d.taken}/{d.total}
                        </Text>
                      ) : (
                        <Text style={styles.dayDotOpenText}>-</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedDate !== today && (
              <View style={[styles.pastDateNotice, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <Text style={{ color: '#CCC', fontSize: 12, fontWeight: '700' }}>
                  📅 Rückblick für {selectedDate}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDate(today)}>
                  <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>
                    Zurück zu Heute →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty / Starter Setup Card if no active plan or no stacks */}
            {(!activePlan || activePlan.stacks.length === 0) ? (
              <View style={[styles.starterCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <View style={styles.starterHeaderRow}>
                  <MaterialCommunityIcons name="creation" size={22} color={theme.accent} />
                  <Text style={[styles.starterEyebrow, { color: theme.accent }]}>
                    SCHNELLSTART • 1-TAP VORLAGEN
                  </Text>
                </View>
                <Text style={styles.starterTitle}>Noch keine Supplement-Stacks eingerichtet</Text>
                <Text style={styles.starterDesc}>
                  Starte sofort mit einer fertigen Vorlage (inkl. Vorrats-Tracking & Standard-Dosierungen) oder erstelle deinen eigenen Stack:
                </Text>

                <TouchableOpacity
                  style={[styles.presetRow, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                  onPress={() => handleLoadStarterPreset('essential')}
                >
                  <View style={[styles.presetIcon, { backgroundColor: theme.accentBgSoft }]}>
                    <MaterialCommunityIcons name="shield-star-outline" size={20} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.presetTitle}>Basis Health & Performance</Text>
                    <Text style={styles.presetSub}>Creatin (5g) • Omega-3 • Vitamin D3+K2 • Magnesium</Text>
                  </View>
                  <View style={[styles.presetBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.presetBadgeText}>Laden</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetRow, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                  onPress={() => handleLoadStarterPreset('hypertrophy')}
                >
                  <View style={[styles.presetIcon, { backgroundColor: 'rgba(48, 209, 88, 0.14)' }]}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color="#30D158" />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.presetTitle}>Hypertrophie & Pump Setup</Text>
                    <Text style={styles.presetSub}>Citrullin • Creatin • Iso Whey • Magnesium • Zink</Text>
                  </View>
                  <View style={[styles.presetBadge, { backgroundColor: '#30D158' }]}>
                    <Text style={styles.presetBadgeText}>Laden</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.customSetupBtn, { borderColor: theme.cardBorder }]}
                  onPress={() => setSubTab('plans')}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.accent} />
                  <Text style={[styles.customSetupBtnText, { color: theme.accent }]}>
                    Eigenen Plan & Stack manuell erstellen
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              activePlan.stacks.map((stack) => {
                const timeInfo = TIME_META[stack.timeOfDay] || TIME_META.Morning;
                const takenInStack = stack.supplements.filter(
                  (s) => selectedDayLog[`${stack.id}_${s.libraryItemId}`]
                ).length;
                const isStackComplete =
                  stack.supplements.length > 0 && takenInStack === stack.supplements.length;

                return (
                  <View
                    key={stack.id}
                    style={[
                      styles.stackCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: isStackComplete ? 'rgba(48, 209, 88, 0.4)' : theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.stackHeader}>
                      <View style={styles.stackTitleWrap}>
                        <View
                          style={[
                            styles.stackTimeIcon,
                            { backgroundColor: `${timeInfo.color}22` },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={timeInfo.icon as any}
                            size={20}
                            color={timeInfo.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stackTitle}>{stack.name}</Text>
                          <Text style={styles.stackSubtitle}>
                            {timeInfo.label}
                            {stack.timeTarget ? ` • ${stack.timeTarget} Uhr` : ''} • {takenInStack}/
                            {stack.supplements.length} erledigt
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.stackEditMiniBtn}
                          onPress={() => openEditStackModal(activePlan, stack)}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={16} color="#8E96A0" />
                        </TouchableOpacity>

                        {stack.supplements.length > 0 && (
                          <TouchableOpacity
                            style={[
                              styles.takeStackBtn,
                              isStackComplete
                                ? {
                                    backgroundColor: 'rgba(48, 209, 88, 0.16)',
                                    borderColor: 'rgba(48, 209, 88, 0.45)',
                                  }
                                : {
                                    backgroundColor: theme.accentBgSoft,
                                    borderColor: theme.accentBorderSoft,
                                  },
                            ]}
                            onPress={() => handleTakeStack(stack, selectedDate)}
                          >
                            <MaterialCommunityIcons
                              name={isStackComplete ? 'check-circle' : 'check-all'}
                              size={15}
                              color={isStackComplete ? '#30D158' : theme.accent}
                            />
                            <Text
                              style={[
                                styles.takeStackBtnText,
                                { color: isStackComplete ? '#30D158' : theme.accent },
                              ]}
                            >
                              {isStackComplete ? 'Erledigt' : 'Alle abhaken'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {stack.supplements.length === 0 ? (
                      <TouchableOpacity
                        style={[styles.emptyStackPrompt, { borderColor: theme.subtleBorder }]}
                        onPress={() => openEditStackModal(activePlan, stack)}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color={theme.accent} />
                        <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>
                          Supplements zu diesem Stack hinzufügen
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      stack.supplements.map((target) => {
                        const libItem = (supplementLibrary || []).find(
                          (l) => l.id === target.libraryItemId
                        );
                        if (!libItem) return null;
                        const isTaken = !!selectedDayLog[`${stack.id}_${libItem.id}`];
                        const catMeta = CATEGORY_META[libItem.category] || CATEGORY_META['Daily Health'];
                        const daysLeft = getDaysRemaining(libItem);
                        const isLow =
                          (libItem.currentInventory !== undefined &&
                            libItem.unitsPerBox &&
                            libItem.currentInventory / libItem.unitsPerBox < 0.15) ||
                          (daysLeft !== null && daysLeft <= 7);

                        return (
                          <TouchableOpacity
                            key={libItem.id}
                            style={[
                              styles.suppRow,
                              {
                                backgroundColor: theme.subCardBg,
                                borderColor: isTaken
                                  ? 'rgba(48, 209, 88, 0.3)'
                                  : theme.subtleBorder,
                              },
                              isTaken && { opacity: 0.72 },
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                              toggleSupplementIntake(
                                selectedDate,
                                stack.id,
                                libItem.id,
                                target.targetDosage
                              );
                              Vibration.vibrate(15);
                            }}
                          >
                            <View style={styles.suppRowLeft}>
                              {libItem.imageUri ? (
                                <Image source={{ uri: libItem.imageUri }} style={styles.suppThumbImg} />
                              ) : (
                                <View
                                  style={[
                                    styles.suppThumbIcon,
                                    { backgroundColor: `${catMeta.color}1F` },
                                  ]}
                                >
                                  <MaterialCommunityIcons
                                    name={catMeta.icon as any}
                                    size={18}
                                    color={catMeta.color}
                                  />
                                </View>
                              )}

                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.suppRowTitle,
                                    isTaken && { textDecorationLine: 'line-through', color: '#999' },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {libItem.name}
                                </Text>
                                <Text style={styles.suppRowSub} numberOfLines={1}>
                                  {libItem.brand ? `${libItem.brand} • ` : ''}
                                  {libItem.category}
                                  {libItem.currentInventory !== undefined
                                    ? ` • ${
                                        isLow ? '⚠️ ' : ''
                                      }Noch ${Math.round(libItem.currentInventory)} ${libItem.unit}${
                                        daysLeft !== null ? ` (~${daysLeft}d)` : ''
                                      }`
                                    : ''}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.suppRowRight}>
                              <View style={styles.dosageBadge}>
                                <Text style={[styles.dosageBadgeText, { color: theme.accent }]}>
                                  {target.targetDosage} {libItem.unit}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.checkCircle,
                                  isTaken && {
                                    backgroundColor: '#30D158',
                                    borderColor: '#30D158',
                                  },
                                ]}
                              >
                                {isTaken && (
                                  <MaterialCommunityIcons name="check" size={15} color="#000" />
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                );
              })
            )}

            {/* Quick Add Stack Button under Today's Stacks */}
            {activePlan && (
              <TouchableOpacity
                style={[
                  styles.addStackFooterBtn,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
                onPress={() => openAddStackModal(activePlan)}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.accent} />
                <Text style={[styles.addStackFooterText, { color: theme.accent }]}>
                  Weiteren Stack zu „{activePlan.name}“ hinzufügen
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* =======================================================================
            SUB-TAB 2: VORRAT & BIBLIOTHEK
           ======================================================================= */}
        {subTab === 'inventory' && (
          <View>
            {/* Low-Stock Warning Banner with 1-Tap Refill */}
            {lowStockItems.length > 0 && (
              <View style={styles.restockBanner}>
                <View style={styles.restockHeader}>
                  <MaterialCommunityIcons name="alert-decagram" size={18} color="#FF453A" />
                  <Text style={styles.restockTitle}>
                    Nachkauf-Alarm ({lowStockItems.length} knapp)
                  </Text>
                </View>
                {lowStockItems.map((item) => {
                  const daysLeft = getDaysRemaining(item);
                  return (
                    <View key={item.id} style={styles.restockItemRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.restockItemName}>{item.name}</Text>
                        <Text style={styles.restockItemSub}>
                          Noch {Math.round(item.currentInventory || 0)} / {item.unitsPerBox || 100}{' '}
                          {item.unit}
                          {daysLeft !== null ? ` • reicht ~${daysLeft} Tage` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.refillNowBtn}
                        onPress={() => handleRestockItem(item)}
                      >
                        <MaterialCommunityIcons name="autorenew" size={14} color="#FFF" />
                        <Text style={styles.refillNowBtnText}>
                          +{item.unitsPerBox || 100} {item.unit}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Search & Add Row */}
            <View style={styles.invSearchRow}>
              <View
                style={[
                  styles.searchInputWrap,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
              >
                <MaterialCommunityIcons name="magnify" size={18} color="#8E96A0" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Supplement oder Marke suchen..."
                  placeholderTextColor="#777"
                  value={invSearch}
                  onChangeText={setInvSearch}
                />
                {invSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setInvSearch('')}>
                    <MaterialCommunityIcons name="close-circle" size={16} color="#777" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.scanSuppBtn,
                  { backgroundColor: theme.accentBgSoft, borderColor: theme.accent },
                ]}
                onPress={() => setScannerModalVisible(true)}
              >
                <MaterialCommunityIcons name="barcode-scan" size={18} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addSuppBtn, { backgroundColor: theme.accent }]}
                onPress={openAddLibModal}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#000" />
                <Text style={styles.addSuppBtnText}>Neu</Text>
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {(['ALL', ...CATEGORIES] as const).map((cat) => {
                const active = invCategoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.accentBgSoft : theme.cardBg,
                        borderColor: active ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setInvCategoryFilter(cat)}
                  >
                    <Text style={[styles.filterChipText, active && { color: theme.accent }]}>
                      {cat === 'ALL' ? `Alle (${supplementLibrary.length})` : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredLibrary.length === 0 ? (
              <View
                style={[
                  styles.starterCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
              >
                <Text style={styles.starterTitle}>Keine Supplements im Vorrat</Text>
                <Text style={styles.starterDesc}>
                  Füge dein erstes Supplement hinzu oder lade mit einem Tipp das Basis-Starterpaket:
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.nextStackActionBtn, { backgroundColor: theme.accent, flex: 1, justifyContent: 'center', paddingVertical: 11 }]}
                    onPress={openAddLibModal}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#000" />
                    <Text style={styles.nextStackActionText}>Supplement anlegen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.nextStackActionBtn,
                      {
                        backgroundColor: theme.subCardBg,
                        borderWidth: 1,
                        borderColor: theme.accentBorderSoft,
                        flex: 1,
                        justifyContent: 'center',
                        paddingVertical: 11,
                      },
                    ]}
                    onPress={() => handleLoadStarterPreset('essential')}
                  >
                    <MaterialCommunityIcons name="flash" size={16} color={theme.accent} />
                    <Text style={[styles.nextStackActionText, { color: theme.accent }]}>
                      Basis-Paket laden
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              filteredLibrary.map((item) => {
                const box = item.unitsPerBox || 100;
                const inv = item.currentInventory ?? 0;
                const pct = Math.min(100, Math.round((inv / box) * 100));
                const daysLeft = getDaysRemaining(item);
                const dailyNeed = dailyRequiredByItemId[item.id] || 0;
                const isLow = pct < 15 || (daysLeft !== null && daysLeft <= 7);
                const catMeta = CATEGORY_META[item.category] || CATEGORY_META['Daily Health'];

                const totalAttempts = (item.totalTakenTimes || 0) + (item.totalMissedTimes || 0);
                const itemAdherence =
                  totalAttempts > 0 ? Math.round(((item.totalTakenTimes || 0) / totalAttempts) * 100) : 100;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.invCard,
                      { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                    ]}
                  >
                    <View style={styles.invCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {item.imageUri ? (
                          <Image source={{ uri: item.imageUri }} style={styles.invCardImg} />
                        ) : (
                          <View
                            style={[
                              styles.invCardIcon,
                              { backgroundColor: `${catMeta.color}1F` },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={catMeta.icon as any}
                              size={22}
                              color={catMeta.color}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.invCardTitle}>{item.name}</Text>
                          <Text style={styles.invCardSub}>
                            {item.brand ? `${item.brand} • ` : ''}
                            {item.category}
                            {dailyNeed > 0 ? ` • ${dailyNeed} ${item.unit}/Tag` : ''}
                            {item.barcode ? ` • EAN` : ''}
                          </Text>
                        </View>
                      </View>

                      {daysLeft !== null && (
                        <View
                          style={[
                            styles.daysLeftBadge,
                            isLow
                              ? {
                                  backgroundColor: 'rgba(255, 69, 58, 0.16)',
                                  borderColor: 'rgba(255, 69, 58, 0.4)',
                                }
                              : {
                                  backgroundColor: 'rgba(48, 209, 88, 0.15)',
                                  borderColor: 'rgba(48, 209, 88, 0.35)',
                                },
                          ]}
                        >
                          <Text
                            style={{
                              color: isLow ? '#FF453A' : '#30D158',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            ~{daysLeft} Tage
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.invBarLabelRow}>
                      <Text style={styles.invBarLabel}>
                        Vorrat: {Math.round(inv)} von {box} {item.unit} ({pct}%)
                      </Text>
                      <Text style={styles.invBarStats}>
                        {itemAdherence}% Adherence • 🔥 {item.streak || 0}x
                      </Text>
                    </View>

                    <View style={[styles.progressTrack, { marginBottom: 10 }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: isLow ? '#FF453A' : pct < 35 ? '#FF9F0A' : '#30D158',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.invActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.invActionBtn,
                          {
                            backgroundColor: theme.accentBgSoft,
                            borderColor: theme.accentBorderSoft,
                          },
                        ]}
                        onPress={() => handleRestockItem(item)}
                      >
                        <MaterialCommunityIcons name="plus-box-outline" size={15} color={theme.accent} />
                        <Text style={[styles.invActionBtnText, { color: theme.accent }]}>
                          +1 Packung ({box})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.invActionBtn,
                          { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                        ]}
                        onPress={() => handleQuickSingleDose(item)}
                      >
                        <MaterialCommunityIcons name="pill" size={14} color="#DDD" />
                        <Text style={styles.invActionBtnText}>-1 Dosis</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.invIconBtn,
                          { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                        ]}
                        onPress={() => openEditLibModal(item)}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color="#DDD" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.invIconBtn,
                          { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                        ]}
                        onPress={() => handleDeleteLibItem(item)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* =======================================================================
            SUB-TAB 3: PLÄNE & STACK-KONFIGURATOR
           ======================================================================= */}
        {subTab === 'plans' && (
          <View>
            {/* 1-Tap Starter Templates Card */}
            <View
              style={[
                styles.starterCard,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              ]}
            >
              <View style={styles.starterHeaderRow}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color={theme.accent} />
                <Text style={[styles.starterEyebrow, { color: theme.accent }]}>
                  1-TAP STARTER-VORLAGEN
                </Text>
              </View>
              <Text style={styles.starterDesc}>
                Erstellt automatisch die passenden Supplements in deiner Bibliothek und richtet die täglichen Stacks fix & fertig ein:
              </Text>

              <TouchableOpacity
                style={[
                  styles.presetRow,
                  { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                ]}
                onPress={() => handleLoadStarterPreset('essential')}
              >
                <View style={[styles.presetIcon, { backgroundColor: theme.accentBgSoft }]}>
                  <MaterialCommunityIcons name="shield-star-outline" size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.presetTitle}>Basis Health & Performance</Text>
                  <Text style={styles.presetSub}>
                    Morning & Night Stack • Creatin, Omega-3, D3+K2, Magnesium
                  </Text>
                </View>
                <View style={[styles.presetBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.presetBadgeText}>Laden</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetRow,
                  {
                    backgroundColor: theme.subCardBg,
                    borderColor: theme.subtleBorder,
                    marginBottom: 0,
                  },
                ]}
                onPress={() => handleLoadStarterPreset('hypertrophy')}
              >
                <View style={[styles.presetIcon, { backgroundColor: 'rgba(48, 209, 88, 0.14)' }]}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color="#30D158" />
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.presetTitle}>Hypertrophie & Pump Setup</Text>
                  <Text style={styles.presetSub}>
                    Pre-, Post- & Bedtime-Stack • Citrullin, Creatin, Whey, ZMA
                  </Text>
                </View>
                <View style={[styles.presetBadge, { backgroundColor: '#30D158' }]}>
                  <Text style={styles.presetBadgeText}>Laden</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Create Custom Plan Input */}
            <View style={styles.invSearchRow}>
              <View
                style={[
                  styles.searchInputWrap,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
              >
                <MaterialCommunityIcons name="playlist-plus" size={18} color="#8E96A0" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Neuen eigenen Plan benennen..."
                  placeholderTextColor="#777"
                  value={newPlanName}
                  onChangeText={setNewPlanName}
                />
              </View>
              <TouchableOpacity
                style={[styles.addSuppBtn, { backgroundColor: theme.accent }]}
                onPress={handleCreateCustomPlan}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#000" />
                <Text style={styles.addSuppBtnText}>Plan</Text>
              </TouchableOpacity>
            </View>

            {/* Existing Plans List */}
            {(supplementPlans || []).map((plan) => (
              <View
                key={plan.id}
                style={[
                  styles.stackCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: plan.isActive ? theme.accent : theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.stackHeader}>
                  <View style={{ flex: 1 }}>
                    {plan.isActive && (
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 10,
                          fontWeight: '900',
                          letterSpacing: 0.6,
                          marginBottom: 2,
                        }}
                      >
                        ✓ AKTIVER PLAN
                      </Text>
                    )}
                    <Text style={styles.stackTitle}>{plan.name}</Text>
                    <Text style={styles.stackSubtitle}>{plan.stacks.length} Stacks konfiguriert</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {!plan.isActive && (
                      <TouchableOpacity
                        style={[
                          styles.takeStackBtn,
                          {
                            backgroundColor: theme.accentBgSoft,
                            borderColor: theme.accentBorderSoft,
                          },
                        ]}
                        onPress={() => setActiveSupplementPlan(plan.id)}
                      >
                        <Text style={[styles.takeStackBtnText, { color: theme.accent }]}>
                          Aktivieren
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.takeStackBtn,
                        { backgroundColor: theme.accent, borderColor: theme.accent },
                      ]}
                      onPress={() => openAddStackModal(plan)}
                    >
                      <MaterialCommunityIcons name="plus" size={14} color="#000" />
                      <Text style={[styles.takeStackBtnText, { color: '#000' }]}>Stack</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stackEditMiniBtn}
                      onPress={() => {
                        showCustomAlert(
                          'Plan löschen',
                          `Möchtest du den Plan „${plan.name}“ wirklich löschen?`,
                          [
                            { text: 'Abbrechen', style: 'cancel' },
                            {
                              text: 'Löschen',
                              style: 'destructive',
                              onPress: () => deleteSupplementPlan(plan.id),
                            },
                          ]
                        );
                      }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={17} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                </View>

                {plan.stacks.map((st) => {
                  const tMeta = TIME_META[st.timeOfDay] || TIME_META.Morning;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.suppRow,
                        { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                      ]}
                      onPress={() => openEditStackModal(plan, st)}
                    >
                      <View style={styles.suppRowLeft}>
                        <View
                          style={[
                            styles.suppThumbIcon,
                            { backgroundColor: `${tMeta.color}22` },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={tMeta.icon as any}
                            size={18}
                            color={tMeta.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suppRowTitle}>
                            {st.name} {st.timeTarget ? `(${st.timeTarget})` : ''}
                          </Text>
                          <Text style={styles.suppRowSub} numberOfLines={1}>
                            {st.supplements.length === 0
                              ? 'Keine Supplements zugeordnet'
                              : st.supplements
                                  .map((t) => {
                                    const lib = (supplementLibrary || []).find(
                                      (l) => l.id === t.libraryItemId
                                    );
                                    return lib ? `${lib.name} (${t.targetDosage}${lib.unit})` : '';
                                  })
                                  .filter(Boolean)
                                  .join(' • ')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="pencil-outline" size={16} color="#8E96A0" />
                        <TouchableOpacity onPress={() => handleDeleteStack(plan, st.id)}>
                          <MaterialCommunityIcons name="close-circle-outline" size={18} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ================= MODAL 1: ADD / EDIT SUPPLEMENT IN LIBRARY ================= */}
      <Modal visible={libModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingLibItem ? 'Supplement bearbeiten' : 'Neues Supplement'}
              </Text>
              <TouchableOpacity onPress={() => setLibModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#AAA" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* EAN Barcode Scan Banner */}
              <TouchableOpacity
                style={[
                  styles.scanBanner,
                  { backgroundColor: theme.accentBgSoft, borderColor: theme.accent },
                ]}
                onPress={() => {
                  setLibModalVisible(false);
                  setScannerModalVisible(true);
                }}
              >
                <View style={[styles.scanBannerIconWrap, { backgroundColor: theme.accent }]}>
                  <MaterialCommunityIcons name="barcode-scan" size={18} color="#000" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.scanBannerTitle, { color: theme.accent }]}>
                    {libBarcode ? `Barcode: ${libBarcode}` : 'EAN-Barcode scannen'}
                  </Text>
                  <Text style={styles.scanBannerSub}>
                    {libBarcode
                      ? 'Tippen zum erneuten Scannen'
                      : 'Automatisch Name, Marke, Größe & Bild laden'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.imagePickerBtn,
                  { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                ]}
                onPress={pickSupplementImage}
              >
                {libImageUri ? (
                  <Image source={{ uri: libImageUri }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons name="camera-plus" size={26} color={theme.accent} />
                    <Text style={{ color: '#8E96A0', fontSize: 11, marginTop: 4 }}>Foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                ]}
                value={libName}
                onChangeText={setLibName}
                placeholder="z. B. Creatin Monohydrat, Omega-3"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Marke (optional)</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                ]}
                value={libBrand}
                onChangeText={setLibBrand}
                placeholder="z. B. ESN, More, Sunday Natural"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Kategorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor:
                          libCategory === cat ? theme.accent : theme.subCardBg,
                        borderColor:
                          libCategory === cat ? theme.accent : theme.subtleBorder,
                      },
                    ]}
                    onPress={() => setLibCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        libCategory === cat && { color: '#000', fontWeight: '800' },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Einheit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor: libUnit === u ? theme.accent : theme.subCardBg,
                        borderColor: libUnit === u ? theme.accent : theme.subtleBorder,
                      },
                    ]}
                    onPress={() => setLibUnit(u)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        libUnit === u && { color: '#000', fontWeight: '800' },
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Inhalt pro Packung ({libUnit})</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                    ]}
                    value={libUnitsPerBox}
                    onChangeText={setLibUnitsPerBox}
                    keyboardType="numeric"
                    placeholder="120"
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Aktueller Vorrat ({libUnit})</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                    ]}
                    value={libCurrentInv}
                    onChangeText={setLibCurrentInv}
                    keyboardType="numeric"
                    placeholder="120"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <View style={styles.modalFooterBtns}>
                <TouchableOpacity
                  style={[styles.modalBtnCancel, { backgroundColor: theme.subCardBg }]}
                  onPress={() => setLibModalVisible(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnSave, { backgroundColor: theme.accent }]}
                  onPress={handleSaveLibItem}
                >
                  <Text style={{ color: '#000', fontWeight: '900' }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: ADD / EDIT STACK ================= */}
      <Modal visible={stackModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingStack ? 'Stack bearbeiten' : 'Neuer Supplement-Stack'}
              </Text>
              <TouchableOpacity onPress={() => setStackModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#AAA" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Stack-Name *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                ]}
                value={stackName}
                onChangeText={setStackName}
                placeholder="z. B. Morning Health Stack, Pre-Workout"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Tageszeit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {TIMES_OF_DAY.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor:
                          stackTimeOfDay === t ? theme.accent : theme.subCardBg,
                        borderColor:
                          stackTimeOfDay === t ? theme.accent : theme.subtleBorder,
                      },
                    ]}
                    onPress={() => {
                      setStackTimeOfDay(t);
                      if (TIME_META[t]?.defaultTime) {
                        setStackTimeTarget(TIME_META[t].defaultTime);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        stackTimeOfDay === t && { color: '#000', fontWeight: '800' },
                      ]}
                    >
                      {TIME_META[t]?.label || t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Geplante Uhrzeit (optional)</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                ]}
                value={stackTimeTarget}
                onChangeText={setStackTimeTarget}
                placeholder="08:00"
                placeholderTextColor="#666"
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 6,
                  marginBottom: 8,
                }}
              >
                <Text style={styles.inputLabel}>Supplements & Dosierung auswählen</Text>
                <TouchableOpacity
                  onPress={() => {
                    setStackModalVisible(false);
                    setTimeout(() => openAddLibModal(), 250);
                  }}
                >
                  <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>
                    + Neues Produkt
                  </Text>
                </TouchableOpacity>
              </View>

              {(supplementLibrary || []).length === 0 ? (
                <Text style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                  Noch keine Produkte in der Bibliothek. Tippe oben rechts auf „+ Neues Produkt“.
                </Text>
              ) : (
                (supplementLibrary || []).map((libItem) => {
                  const target = stackTargets.find((t) => t.libraryItemId === libItem.id);
                  const isSelected = !!target;

                  return (
                    <View
                      key={libItem.id}
                      style={[
                        styles.suppRow,
                        {
                          backgroundColor: theme.subCardBg,
                          borderColor: isSelected ? theme.accent : theme.subtleBorder,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() => toggleTargetInStackModal(libItem.id)}
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={22}
                          color={isSelected ? theme.accent : '#666'}
                        />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.suppRowTitle}>{libItem.name}</Text>
                          <Text style={styles.suppRowSub}>
                            {libItem.brand ? `${libItem.brand} • ` : ''}Einheit: {libItem.unit}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {isSelected && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={[
                              styles.dosageModalInput,
                              { borderColor: theme.accent, color: '#FFF' },
                            ]}
                            keyboardType="numeric"
                            value={target.targetDosage.toString()}
                            onChangeText={(v) => updateTargetDosageInModal(libItem.id, v)}
                          />
                          <Text style={{ color: '#AAA', fontSize: 12, fontWeight: '700' }}>
                            {libItem.unit}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              <View style={styles.modalFooterBtns}>
                <TouchableOpacity
                  style={[styles.modalBtnCancel, { backgroundColor: theme.subCardBg }]}
                  onPress={() => setStackModalVisible(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnSave, { backgroundColor: theme.accent }]}
                  onPress={handleSaveStack}
                >
                  <Text style={{ color: '#000', fontWeight: '900' }}>Stack speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= ACCENT & WIDGET THEME PICKER MODAL ================= */}
      <AccentThemePickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />

      {/* ================= BARCODE SCANNER MODAL ================= */}
      <SupplementBarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onSelectSupplement={(scanned) => {
          setEditingLibItem(null);
          setLibName(scanned.name);
          setLibBrand(scanned.brand || '');
          setLibCategory(scanned.category);
          setLibUnit(scanned.unit);
          setLibUnitsPerBox(scanned.unitsPerBox?.toString() || '120');
          setLibCurrentInv(scanned.currentInventory?.toString() || '120');
          setLibImageUri(scanned.imageUri);
          setLibBarcode(scanned.barcode);
          setLibModalVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  activePlanPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E96A0',
    letterSpacing: 0.6,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  stockStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSubline: {
    fontSize: 12,
    color: '#8E96A0',
    marginTop: 3,
  },
  progressRingOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  progressRingPct: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressRingSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E96A0',
  },
  progressTrack: {
    width: '100%',
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  nextStackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  nextStackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nextStackIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStackEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nextStackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  nextStackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  nextStackActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  heroKpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  heroKpiPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  heroKpiValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroKpiVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroKpiLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E96A0',
    marginTop: 2,
  },
  subNavContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  subNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subNavText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E96A0',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  dayPill: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E96A0',
    marginBottom: 5,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: {
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.5)',
  },
  dayDotPartial: {
    backgroundColor: 'rgba(255, 159, 10, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.5)',
  },
  dayDotOpen: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#3A3F47',
  },
  dayDotPartialText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF9F0A',
  },
  dayDotOpenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#777',
  },
  pastDateNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  starterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  starterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  starterEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  starterTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  starterDesc: {
    fontSize: 12,
    color: '#8E96A0',
    lineHeight: 17,
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    marginBottom: 8,
  },
  presetIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
  presetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
  },
  customSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  customSetupBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stackCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  stackTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  stackTimeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stackSubtitle: {
    fontSize: 11,
    color: '#8E96A0',
    fontWeight: '600',
    marginTop: 1,
  },
  stackEditMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  takeStackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  takeStackBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyStackPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
  },
  suppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  suppRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    paddingRight: 8,
  },
  suppThumbImg: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  suppThumbIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suppRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suppRowSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
  suppRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dosageBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dosageBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStackFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 2,
  },
  addStackFooterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  restockBanner: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.38)',
    borderRadius: 18,
    padding: 13,
    marginBottom: 14,
  },
  restockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  restockTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF453A',
  },
  restockItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderRadius: 12,
    padding: 9,
    marginTop: 6,
  },
  restockItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  restockItemSub: {
    fontSize: 11,
    color: '#CCC',
    marginTop: 1,
  },
  refillNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF453A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  refillNowBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  invSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  addSuppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  scanSuppBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSuppBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E96A0',
  },
  invCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  invCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  invCardImg: {
    width: 44,
    height: 44,
    borderRadius: 11,
  },
  invCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  invCardSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
  daysLeftBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  invBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  invBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CCC',
  },
  invBarStats: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E96A0',
  },
  invActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  invActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DDD',
  },
  invIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  imagePickerBtn: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#AAA',
    marginBottom: 5,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  modalChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  modalChipText: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '700',
  },
  dosageModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    width: 54,
    paddingVertical: 5,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalFooterBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  scanBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  scanBannerSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
});
