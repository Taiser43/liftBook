import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, showCustomAlert } from '../store/store';
import {
  PRELOADED_EXERCISES,
  TARGET_MUSCLES_BY_CATEGORY,
  MAJOR_MUSCLE_LABELS_DE,
} from '../data/exercises';
import { getAppTheme } from '../utils/theme';

export interface EditableExerciseData {
  name: string;
  category: string;
  targetMuscle?: string;
  equipmentType?: string;
  brand?: string;
  isUnilateral?: boolean;
  weight?: number;
  reps?: number;
  sets?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialExercise?: EditableExerciseData | null;
  isPreloaded?: boolean;
  onSaved?: (exercise: EditableExerciseData, oldName?: string) => void;
  onDeleted?: (exerciseName: string) => void;
}

const CATEGORIES = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'] as const;

export const ExerciseManagerModal = ({
  visible,
  onClose,
  initialExercise,
  isPreloaded,
  onSaved,
  onDeleted,
}: Props) => {
  const insets = useSafeAreaInsets();
  const {
    customExercises,
    addCustomExercise,
    editCustomExercise,
    hidePreloadedExercise,
    deleteCustomExercise,
    equipmentTypes,
    equipmentBrands,
    addEquipmentType,
    addEquipmentBrand,
    exerciseDefaults,
    setExerciseDefault,
    accentThemeId,
  } = useAppStore();

  const theme = getAppTheme(accentThemeId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Chest');
  const [targetMuscle, setTargetMuscle] = useState<string>('Mittlere Brust');
  const [customTargetInput, setCustomTargetInput] = useState('');
  const [showAddCustomTarget, setShowAddCustomTarget] = useState(false);

  const [equipment, setEquipment] = useState('Freie Übung');
  const [brand, setBrand] = useState('Keine');
  const [isUnilateral, setIsUnilateral] = useState(false);
  const [defaultWeight, setDefaultWeight] = useState('');
  const [defaultReps, setDefaultReps] = useState('10');
  const [defaultSets, setDefaultSets] = useState('3');

  const [newBrandInput, setNewBrandInput] = useState('');
  const [newEquipInput, setNewEquipInput] = useState('');
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showAddEquip, setShowAddEquip] = useState(false);

  // Auto-detect if this is a preloaded exercise
  const isActuallyPreloaded =
    isPreloaded !== undefined
      ? isPreloaded
      : initialExercise
      ? PRELOADED_EXERCISES.some((p) => p.name.toLowerCase() === initialExercise.name.toLowerCase())
      : false;

  useEffect(() => {
    if (initialExercise && visible) {
      setName(initialExercise.name);
      const cat = initialExercise.category || 'Chest';
      setCategory(cat);

      const preMatch = PRELOADED_EXERCISES.find(
        (p) => p.name.toLowerCase() === initialExercise.name.toLowerCase()
      );
      const target =
        initialExercise.targetMuscle ||
        preMatch?.targetMuscle ||
        (TARGET_MUSCLES_BY_CATEGORY[cat] || [])[0] ||
        'Mittlere Brust';
      setTargetMuscle(target);

      setEquipment(initialExercise.equipmentType || 'Freie Übung');
      setBrand(initialExercise.brand || 'Keine');

      const defaults = exerciseDefaults?.[initialExercise.name];
      setIsUnilateral(
        initialExercise.isUnilateral !== undefined
          ? initialExercise.isUnilateral
          : defaults?.isUnilateral || false
      );

      const weightVal =
        initialExercise.weight !== undefined
          ? initialExercise.weight
          : defaults?.weight !== undefined
          ? defaults.weight
          : undefined;
      setDefaultWeight(weightVal !== undefined ? weightVal.toString() : '');

      const repsVal =
        initialExercise.reps !== undefined
          ? initialExercise.reps
          : defaults?.reps !== undefined
          ? defaults.reps
          : 10;
      setDefaultReps(repsVal.toString());

      const setsVal = initialExercise.sets !== undefined ? initialExercise.sets : 3;
      setDefaultSets(setsVal.toString());

      setShowAddBrand(false);
      setShowAddEquip(false);
      setShowAddCustomTarget(false);
    } else if (visible) {
      setName('');
      setCategory('Chest');
      setTargetMuscle('Mittlere Brust');
      setEquipment('Freie Übung');
      setBrand('Keine');
      setIsUnilateral(false);
      setDefaultWeight('');
      setDefaultReps('10');
      setDefaultSets('3');
      setShowAddBrand(false);
      setShowAddEquip(false);
      setShowAddCustomTarget(false);
    }
  }, [initialExercise, visible, exerciseDefaults]);

  // When changing category, adjust default targetMuscle if not in new category
  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    const available = TARGET_MUSCLES_BY_CATEGORY[cat] || [];
    if (!available.includes(targetMuscle)) {
      setTargetMuscle(available[0] || cat);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      showCustomAlert('Name fehlt', 'Bitte gib einen Namen für die Übung ein.');
      return;
    }

    const trimmedName = name.trim();
    const parsedWeight = defaultWeight.trim() ? parseFloat(defaultWeight) : 0;
    const parsedReps = parseInt(defaultReps, 10) || 10;
    const parsedSets = parseInt(defaultSets, 10) || 3;

    const payload: EditableExerciseData = {
      name: trimmedName,
      category,
      targetMuscle,
      equipmentType: equipment,
      brand: brand === 'Keine' ? undefined : brand,
      isUnilateral,
      weight: parsedWeight,
      reps: parsedReps,
      sets: parsedSets,
    };

    if (initialExercise) {
      const oldName = initialExercise.name;
      if (isActuallyPreloaded) {
        hidePreloadedExercise(oldName);
        addCustomExercise({
          name: trimmedName,
          category,
          targetMuscle,
          equipmentType: equipment,
          brand: brand === 'Keine' ? undefined : brand,
        });
      } else {
        editCustomExercise(oldName, {
          name: trimmedName,
          category,
          targetMuscle,
          equipmentType: equipment,
          brand: brand === 'Keine' ? undefined : brand,
        });
      }

      setExerciseDefault(trimmedName, {
        weight: parsedWeight,
        reps: parsedReps,
        isUnilateral,
      });

      if (onSaved) {
        onSaved(payload, oldName);
      }
      showCustomAlert('Übung aktualisiert', `„${trimmedName}“ wurde erfolgreich gespeichert.`);
    } else {
      addCustomExercise({
        name: trimmedName,
        category,
        targetMuscle,
        equipmentType: equipment,
        brand: brand === 'Keine' ? undefined : brand,
      });

      setExerciseDefault(trimmedName, {
        weight: parsedWeight,
        reps: parsedReps,
        isUnilateral,
      });

      if (onSaved) {
        onSaved(payload);
      }
      showCustomAlert('Übung erstellt', `„${trimmedName}“ wurde deiner Bibliothek hinzugefügt.`);
    }

    onClose();
  };

  const handleDeleteOrHide = () => {
    if (!initialExercise) return;

    if (isActuallyPreloaded) {
      showCustomAlert(
        'Übung ausblenden',
        `Möchtest du die Standard-Übung „${initialExercise.name}“ aus deiner Übungsauswahl ausblenden?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Ausblenden',
            style: 'destructive',
            onPress: () => {
              hidePreloadedExercise(initialExercise.name);
              if (onDeleted) onDeleted(initialExercise.name);
              onClose();
            },
          },
        ]
      );
    } else {
      showCustomAlert(
        'Übung löschen',
        `Möchtest du „${initialExercise.name}“ wirklich unwiderruflich aus deiner Bibliothek löschen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen',
            style: 'destructive',
            onPress: () => {
              deleteCustomExercise(initialExercise.name);
              if (onDeleted) onDeleted(initialExercise.name);
              onClose();
            },
          },
        ]
      );
    }
  };

  const handleAddBrand = () => {
    if (newBrandInput.trim()) {
      addEquipmentBrand(newBrandInput.trim());
      setBrand(newBrandInput.trim());
      setNewBrandInput('');
      setShowAddBrand(false);
    }
  };

  const handleAddEquip = () => {
    if (newEquipInput.trim()) {
      addEquipmentType(newEquipInput.trim());
      setEquipment(newEquipInput.trim());
      setNewEquipInput('');
      setShowAddEquip(false);
    }
  };

  const handleAddCustomTarget = () => {
    if (customTargetInput.trim()) {
      setTargetMuscle(customTargetInput.trim());
      setCustomTargetInput('');
      setShowAddCustomTarget(false);
    }
  };

  const availableTargetMuscles = TARGET_MUSCLES_BY_CATEGORY[category] || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top + 8, 36) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {initialExercise ? 'Übung bearbeiten' : 'Neue Übung'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={[styles.savePill, { backgroundColor: theme.accent }]}>
            <Text style={styles.savePillText}>Speichern</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Badge: Preloaded vs Custom */}
          {initialExercise && (
            <View
              style={[
                styles.badgeBanner,
                isActuallyPreloaded
                  ? { backgroundColor: 'rgba(0, 210, 255, 0.1)', borderColor: 'rgba(0, 210, 255, 0.3)' }
                  : { backgroundColor: 'rgba(48, 209, 88, 0.1)', borderColor: 'rgba(48, 209, 88, 0.3)' },
              ]}
            >
              <MaterialCommunityIcons
                name={isActuallyPreloaded ? 'shield-check-outline' : 'star-outline'}
                size={18}
                color={isActuallyPreloaded ? '#00D2FF' : '#30D158'}
              />
              <Text style={[styles.badgeBannerText, { color: isActuallyPreloaded ? '#00D2FF' : '#30D158' }]}>
                {isActuallyPreloaded
                  ? 'Vordefinierte Übung (Bearbeiten erstellt eine eigene Version)'
                  : 'Eigene Übung in deiner Bibliothek'}
              </Text>
            </View>
          )}

          {/* Name Input */}
          <Text style={styles.label}>NAME DER ÜBUNG *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.cardBorder }]}
            placeholder="z. B. Incline Dumbbell Bench Press"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />

          {/* Level 1: Major Muscle Group */}
          <Text style={styles.label}>1. HAUPTGRUPPE (ÜBERGEORDNET)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  category === cat && [styles.chipActive, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }],
                ]}
                onPress={() => handleSelectCategory(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === cat && [styles.chipTextActive, { color: theme.accent }],
                  ]}
                >
                  {MAJOR_MUSCLE_LABELS_DE[cat] || cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Level 2: Specific Target Muscle */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>2. SPEZIFISCHER ZIELMUSKEL (HAUPTMUSKEL)</Text>
            <TouchableOpacity onPress={() => setShowAddCustomTarget(!showAddCustomTarget)} style={styles.addInlineToggle}>
              <MaterialCommunityIcons name={showAddCustomTarget ? 'close-circle' : 'plus-circle'} size={18} color={theme.accent} />
              <Text style={[styles.addInlineToggleText, { color: theme.accent }]}>
                {showAddCustomTarget ? 'Schließen' : 'Eigener'}
              </Text>
            </TouchableOpacity>
          </View>
          {showAddCustomTarget && (
            <View style={styles.addInlineRow}>
              <TextInput
                style={styles.addInlineInput}
                placeholder="z. B. Brachialis, Soleus"
                placeholderTextColor="#666"
                value={customTargetInput}
                onChangeText={setCustomTargetInput}
              />
              <TouchableOpacity style={[styles.addInlineBtn, { backgroundColor: theme.accent }]} onPress={handleAddCustomTarget}>
                <Text style={styles.addInlineBtnText}>Wählen</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.chipGrid}>
            {availableTargetMuscles.map((tm) => (
              <TouchableOpacity
                key={tm}
                style={[
                  styles.chip,
                  targetMuscle === tm && [styles.chipActive, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }],
                  { marginBottom: 8 },
                ]}
                onPress={() => setTargetMuscle(tm)}
              >
                <Text
                  style={[
                    styles.chipText,
                    targetMuscle === tm && [styles.chipTextActive, { color: theme.accent }],
                  ]}
                >
                  {tm}
                </Text>
              </TouchableOpacity>
            ))}
            {/* If a custom target muscle is selected that's not in the default list */}
            {!availableTargetMuscles.includes(targetMuscle) && (
              <TouchableOpacity
                style={[
                  styles.chip,
                  styles.chipActive,
                  { backgroundColor: theme.accentBgSoft, borderColor: theme.accent, marginBottom: 8 },
                ]}
              >
                <Text style={[styles.chipText, styles.chipTextActive, { color: theme.accent }]}>
                  {targetMuscle}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Equipment Type */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>EQUIPMENT-TYP</Text>
            <TouchableOpacity onPress={() => setShowAddEquip(!showAddEquip)} style={styles.addInlineToggle}>
              <MaterialCommunityIcons name={showAddEquip ? 'close-circle' : 'plus-circle'} size={18} color={theme.accent} />
              <Text style={[styles.addInlineToggleText, { color: theme.accent }]}>
                {showAddEquip ? 'Schließen' : 'Neu'}
              </Text>
            </TouchableOpacity>
          </View>
          {showAddEquip && (
            <View style={styles.addInlineRow}>
              <TextInput
                style={styles.addInlineInput}
                placeholder="z. B. Kettlebell, Kurzhantel"
                placeholderTextColor="#666"
                value={newEquipInput}
                onChangeText={setNewEquipInput}
              />
              <TouchableOpacity style={[styles.addInlineBtn, { backgroundColor: theme.accent }]} onPress={handleAddEquip}>
                <Text style={styles.addInlineBtnText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {equipmentTypes.map((eq) => (
              <TouchableOpacity
                key={eq}
                style={[
                  styles.chip,
                  equipment === eq && [styles.chipActive, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }],
                ]}
                onPress={() => setEquipment(eq)}
              >
                <Text
                  style={[
                    styles.chipText,
                    equipment === eq && [styles.chipTextActive, { color: theme.accent }],
                  ]}
                >
                  {eq}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Brand (Optional) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>HERSTELLER / MARKE (OPTIONAL)</Text>
            <TouchableOpacity onPress={() => setShowAddBrand(!showAddBrand)} style={styles.addInlineToggle}>
              <MaterialCommunityIcons name={showAddBrand ? 'close-circle' : 'plus-circle'} size={18} color={theme.accent} />
              <Text style={[styles.addInlineToggleText, { color: theme.accent }]}>
                {showAddBrand ? 'Schließen' : 'Neu'}
              </Text>
            </TouchableOpacity>
          </View>
          {showAddBrand && (
            <View style={styles.addInlineRow}>
              <TextInput
                style={styles.addInlineInput}
                placeholder="z. B. Gymleco, Atlantis"
                placeholderTextColor="#666"
                value={newBrandInput}
                onChangeText={setNewBrandInput}
              />
              <TouchableOpacity style={[styles.addInlineBtn, { backgroundColor: theme.accent }]} onPress={handleAddBrand}>
                <Text style={styles.addInlineBtnText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.chipGrid}>
            {equipmentBrands.map((b) => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.chip,
                  brand === b && [styles.chipActive, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }],
                  { marginBottom: 8 },
                ]}
                onPress={() => setBrand(b)}
              >
                <Text
                  style={[
                    styles.chipText,
                    brand === b && [styles.chipTextActive, { color: theme.accent }],
                  ]}
                >
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Standard Target Values (Gewicht, Wdh, Sätze) */}
          <Text style={[styles.label, { marginTop: 20 }]}>STANDARD-ZIELE & DEFAULTS</Text>
          <View style={styles.defaultsRow}>
            <View style={styles.defaultCol}>
              <Text style={styles.defaultSubLabel}>Sätze</Text>
              <TextInput
                style={styles.defaultInput}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor="#666"
                value={defaultSets}
                onChangeText={setDefaultSets}
              />
            </View>
            <View style={styles.defaultCol}>
              <Text style={styles.defaultSubLabel}>Wiederholungen</Text>
              <TextInput
                style={styles.defaultInput}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#666"
                value={defaultReps}
                onChangeText={setDefaultReps}
              />
            </View>
            <View style={styles.defaultCol}>
              <Text style={styles.defaultSubLabel}>Gewicht (kg)</Text>
              <TextInput
                style={styles.defaultInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#666"
                value={defaultWeight}
                onChangeText={setDefaultWeight}
              />
            </View>
          </View>

          {/* Unilateral Execution Toggle */}
          <TouchableOpacity
            style={[
              styles.unilateralCard,
              isUnilateral && { borderColor: theme.accent, backgroundColor: theme.accentBgSoft },
            ]}
            onPress={() => setIsUnilateral(!isUnilateral)}
            activeOpacity={0.8}
          >
            <View style={styles.unilateralLeft}>
              <MaterialCommunityIcons
                name="arrow-split-vertical"
                size={22}
                color={isUnilateral ? theme.accent : '#8E96A0'}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.unilateralTitle, isUnilateral && { color: theme.accent }]}>
                  Einseitige Ausführung (Unilateral)
                </Text>
                <Text style={styles.unilateralDesc}>
                  Links & Rechts getrennt protokollieren (z. B. Kurzhantel Curls, Lunges)
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={isUnilateral ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={24}
              color={isUnilateral ? theme.accent : '#555'}
            />
          </TouchableOpacity>

          {/* Delete / Hide Action for existing exercises */}
          {initialExercise && (
            <View style={{ marginTop: 28, marginBottom: 16 }}>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteOrHide} activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name={isActuallyPreloaded ? 'eye-off-outline' : 'trash-can-outline'}
                  size={18}
                  color="#FF453A"
                />
                <Text style={styles.deleteBtnText}>
                  {isActuallyPreloaded ? 'Standard-Übung ausblenden' : 'Übung aus Bibliothek löschen'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: '#8E96A0',
    fontSize: 15,
    fontWeight: '600',
  },
  savePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  savePillText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  body: {
    padding: 16,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  badgeBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E96A0',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16191F',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#16191F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    borderWidth: 1,
  },
  chipText: {
    color: '#8E96A0',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  addInlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addInlineToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addInlineInput: {
    flex: 1,
    backgroundColor: '#16191F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  addInlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addInlineBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  defaultsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  defaultCol: {
    flex: 1,
  },
  defaultSubLabel: {
    color: '#8E96A0',
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '600',
  },
  defaultInput: {
    backgroundColor: '#16191F',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  unilateralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16191F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-between',
    marginTop: 6,
  },
  unilateralLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unilateralTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  unilateralDesc: {
    color: '#8E96A0',
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  deleteBtnText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '800',
  },
});
