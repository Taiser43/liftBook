import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/store';

export const ExerciseManagerModal = ({ 
  visible, 
  onClose, 
  initialExercise,
  isPreloaded = false,
  onSaved
}: { 
  visible: boolean; 
  onClose: () => void; 
  initialExercise?: { name: string; category: string; equipmentType?: string; brand?: string };
  isPreloaded?: boolean;
  onSaved?: (exercise: any) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { 
    customExercises, addCustomExercise, editCustomExercise, hidePreloadedExercise,
    equipmentTypes, equipmentBrands, addEquipmentType, addEquipmentBrand 
  } = useAppStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Chest');
  const [equipment, setEquipment] = useState('Freie Übung');
  const [brand, setBrand] = useState('Keine');

  const [newBrandInput, setNewBrandInput] = useState('');
  const [newEquipInput, setNewEquipInput] = useState('');
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showAddEquip, setShowAddEquip] = useState(false);

  useEffect(() => {
    if (initialExercise && visible) {
      setName(initialExercise.name);
      setCategory(initialExercise.category);
      setEquipment(initialExercise.equipmentType || 'Freie Übung');
      setBrand(initialExercise.brand || 'Keine');
    } else if (visible) {
      setName('');
      setCategory('Chest');
      setEquipment('Freie Übung');
      setBrand('Keine');
      setShowAddBrand(false);
      setShowAddEquip(false);
    }
  }, [initialExercise, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      equipmentType: equipment,
      brand: brand === 'Keine' ? undefined : brand
    };

    if (initialExercise) {
      if (isPreloaded) {
        hidePreloadedExercise(initialExercise.name);
        addCustomExercise(payload);
      } else {
        editCustomExercise(initialExercise.name, payload);
      }
    } else {
      addCustomExercise(payload);
    }
    
    if (onSaved) {
      onSaved(payload);
    }
    onClose();
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top + 10, 36) }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{initialExercise ? 'Edit Exercise' : 'New Exercise'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.label}>Exercise Name</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Incline Machine Press"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Muscle Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => (
              <TouchableOpacity 
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>Equipment Type</Text>
            <TouchableOpacity onPress={() => setShowAddEquip(!showAddEquip)}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#00D2FF" />
            </TouchableOpacity>
          </View>
          {showAddEquip && (
            <View style={styles.addInlineRow}>
              <TextInput 
                style={styles.addInlineInput}
                placeholder="e.g. Kettlebell"
                placeholderTextColor="#666"
                value={newEquipInput}
                onChangeText={setNewEquipInput}
              />
              <TouchableOpacity style={styles.addInlineBtn} onPress={handleAddEquip}>
                <Text style={styles.addInlineBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {equipmentTypes.map(eq => (
              <TouchableOpacity 
                key={eq}
                style={[styles.chip, equipment === eq && styles.chipActive]}
                onPress={() => setEquipment(eq)}
              >
                <Text style={[styles.chipText, equipment === eq && styles.chipTextActive]}>{eq}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>Brand (Optional)</Text>
            <TouchableOpacity onPress={() => setShowAddBrand(!showAddBrand)}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#00D2FF" />
            </TouchableOpacity>
          </View>
          {showAddBrand && (
            <View style={styles.addInlineRow}>
              <TextInput 
                style={styles.addInlineInput}
                placeholder="e.g. Gymleco"
                placeholderTextColor="#666"
                value={newBrandInput}
                onChangeText={setNewBrandInput}
              />
              <TouchableOpacity style={styles.addInlineBtn} onPress={handleAddBrand}>
                <Text style={styles.addInlineBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.chipGrid}>
            {equipmentBrands.map(b => (
              <TouchableOpacity 
                key={b}
                style={[styles.chip, brand === b && styles.chipActive, { marginBottom: 8 }]}
                onPress={() => setBrand(b)}
              >
                <Text style={[styles.chipText, brand === b && styles.chipTextActive]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#FF453A',
    fontSize: 16,
  },
  saveBtn: {
    padding: 4,
  },
  saveText: {
    color: '#00D2FF',
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 14,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00D2FF',
  },
  chipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#00D2FF',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  addInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addInlineInput: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    color: '#FFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  addInlineBtn: {
    backgroundColor: '#00D2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addInlineBtnText: {
    color: '#000',
    fontWeight: '700',
  }
});
