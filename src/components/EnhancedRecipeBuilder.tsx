import React, { useState } from 'react';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, RecipeIngredient, showCustomAlert } from '../store/store';
import SwipeableModal from './SwipeableModal';

interface EnhancedRecipeBuilderProps {
  visible: boolean;
  onClose: () => void;
}

export default function EnhancedRecipeBuilder({ visible, onClose }: EnhancedRecipeBuilderProps) {
  const insets = useSafeAreaInsets();
  const { addSavedMeal, ingredients, incrementIngredientUsage } = useAppStore();

  const [builderName, setBuilderName] = useState('');
  const [totalServings, setTotalServings] = useState('1');
  const [builderIngredients, setBuilderIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredientPickerVisible, setIngredientPickerVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientSort, setIngredientSort] = useState<'usage' | 'name' | 'calories' | 'protein'>('usage');



  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSaveRecipe = () => {
    if (!builderName.trim()) return showCustomAlert('Error', 'Recipe needs a name.');
    const parsedServings = parseInt(totalServings, 10);
    if (isNaN(parsedServings) || parsedServings < 1) {
      return showCustomAlert('Error', 'Servings must be at least 1.');
    }
    
    let cal = 0, pro = 0, car = 0, fat = 0;
    builderIngredients.forEach(req => {
      const ratio = req.amount / req.ingredient.baseAmount;
      cal += req.ingredient.calories * ratio;
      pro += req.ingredient.protein * ratio;
      car += req.ingredient.carbs * ratio;
      fat += req.ingredient.fat * ratio;
    });

    addSavedMeal({
      id: Date.now().toString(),
      name: builderName,
      ingredients: builderIngredients,
      totalServings: parsedServings,
      calories: Math.round(cal),
      protein: Math.round(pro),
      carbs: Math.round(car),
      fat: Math.round(fat),
      imageUri: imageUri || undefined
    });
    
    // Reset and close
    setBuilderName('');
    setTotalServings('1');
    setBuilderIngredients([]);
    setImageUri(null);
    onClose();
  };

  const updateBuilderIngredient = (id: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    setBuilderIngredients(prev => prev.map(req => req.ingredient.id === id ? { ...req, amount: val } : req));
  };

  const removeBuilderIngredient = (id: string) => {
    setBuilderIngredients(prev => prev.filter(req => req.ingredient.id !== id));
  };

  // Preview calculation
  let previewCal = 0, previewPro = 0, previewCar = 0, previewFat = 0;
  builderIngredients.forEach(req => {
    const ratio = req.amount / req.ingredient.baseAmount;
    previewCal += req.ingredient.calories * ratio;
    previewPro += req.ingredient.protein * ratio;
    previewCar += req.ingredient.carbs * ratio;
    previewFat += req.ingredient.fat * ratio;
  });

  const parsedServingsPreview = parseInt(totalServings, 10) || 1;
  const perServingCal = Math.round(previewCal / parsedServingsPreview);
  const perServingPro = Math.round(previewPro / parsedServingsPreview);
  const perServingCar = Math.round(previewCar / parsedServingsPreview);
  const perServingFat = Math.round(previewFat / parsedServingsPreview);

  const sortedIngredients = [...ingredients].sort((a, b) => {
    if (ingredientSort === 'usage') {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;
      if (usageB !== usageA) return usageB - usageA;
      return a.name.localeCompare(b.name);
    }
    if (ingredientSort === 'name') return a.name.localeCompare(b.name);
    if (ingredientSort === 'calories') return b.calories - a.calories;
    return b.protein - a.protein;
  });


  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Recipe</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
          {/* Basics */}
          <Text style={styles.sectionHeader}>Recipe Details</Text>
          
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePickerImg} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={32} color="#666" />
                <Text style={styles.imagePickerText}>Add Recipe Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <TextInput 
            style={styles.textInputFull} 
            placeholder="Recipe Name (e.g. Chicken Rice)" 
            placeholderTextColor="#666" 
            value={builderName} 
            onChangeText={setBuilderName} 
          />
          <View style={styles.rowInput}>
            <Text style={styles.rowInputLabel}>Total Servings you are cooking</Text>
            <TextInput 
              style={styles.rowInputField} 
              keyboardType="numeric" 
              value={totalServings} 
              onChangeText={setTotalServings} 
            />
          </View>

          {/* Real-time Preview */}
          <View style={styles.previewCard}>
             <Text style={styles.previewTitle}>Macros Per Serving</Text>
             <View style={styles.previewMacrosRow}>
                <View style={styles.previewMacro}>
                   <Text style={[styles.previewMacroVal, { color: '#00D2FF' }]}>{perServingCal}</Text>
                   <Text style={styles.previewMacroLabel}>kcal</Text>
                </View>
                <View style={styles.previewMacro}>
                   <Text style={[styles.previewMacroVal, { color: '#30D158' }]}>{perServingPro}g</Text>
                   <Text style={styles.previewMacroLabel}>Pro</Text>
                </View>
                <View style={styles.previewMacro}>
                   <Text style={[styles.previewMacroVal, { color: '#FFD60A' }]}>{perServingCar}g</Text>
                   <Text style={styles.previewMacroLabel}>Carb</Text>
                </View>
                <View style={styles.previewMacro}>
                   <Text style={[styles.previewMacroVal, { color: '#FF453A' }]}>{perServingFat}g</Text>
                   <Text style={styles.previewMacroLabel}>Fat</Text>
                </View>
             </View>
          </View>
          
          {/* Ingredients */}
          <Text style={styles.sectionHeader}>Ingredients ({builderIngredients.length})</Text>
          {builderIngredients.map(req => (
            <View key={req.ingredient.id} style={styles.builderItem}>
              <Text style={styles.builderName} numberOfLines={1}>{req.ingredient.name}</Text>
              <TextInput 
                style={styles.builderInput} 
                keyboardType="numeric" 
                value={req.amount ? req.amount.toString() : ''}
                onChangeText={(val) => updateBuilderIngredient(req.ingredient.id, val)} 
              />
              <Text style={styles.builderLabel}>g/ml</Text>
              <TouchableOpacity onPress={() => removeBuilderIngredient(req.ingredient.id)} style={{ padding: 8 }}>
                <MaterialCommunityIcons name="minus-circle" size={22} color="#FF453A" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addIngBtn} onPress={() => setIngredientPickerVisible(true)}>
            <Text style={styles.addIngBtnText}>+ Add Ingredient</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <TouchableOpacity style={styles.fullBtn} onPress={handleSaveRecipe}>
          <Text style={styles.fullBtnText}>Save Recipe</Text>
        </TouchableOpacity>
      </View>

      {/* INGREDIENT PICKER */}
      <SwipeableModal visible={ingredientPickerVisible} onClose={() => {
        setIngredientPickerVisible(false);
        setIngredientSearch('');
      }}>
        <Text style={styles.modalTitle}>Select Ingredient</Text>
        
        <TextInput
          style={[styles.textInputFull, { marginTop: 16, marginBottom: 8 }]}
          placeholder="Search ingredients..."
          placeholderTextColor="#666"
          value={ingredientSearch}
          onChangeText={setIngredientSearch}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
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

        <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
          {sortedIngredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase())).map(ing => (
            <TouchableOpacity key={ing.id} style={styles.poolItem} onPress={() => {
              if (!builderIngredients.find(r => r.ingredient.id === ing.id)) {
                setBuilderIngredients(prev => [...prev, { ingredient: ing, amount: 100 }]);
              }
              incrementIngredientUsage(ing.id);
              setIngredientPickerVisible(false);
              setIngredientSearch('');
            }}>
              <Text style={styles.poolName}>{ing.name}</Text>
              <Text style={styles.poolMacros}>{ing.calories} kcal / {ing.baseAmount}g</Text>
            </TouchableOpacity>
          ))}
          {sortedIngredients.length === 0 && <Text style={styles.emptyText}>No ingredients in pool yet.</Text>}
          {sortedIngredients.length > 0 && sortedIngredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase())).length === 0 && (
            <Text style={styles.emptyText}>No ingredients found for "{ingredientSearch}".</Text>
          )}
        </ScrollView>
      </SwipeableModal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#181818', borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  modalScroll: { flex: 1, padding: 16 },

  sectionHeader: { color: '#888', fontSize: 14, fontWeight: '800', marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  textInputFull: { backgroundColor: '#1E1E1E', color: '#FFF', fontSize: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  
  rowInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#333' },
  rowInputLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  rowInputField: { backgroundColor: '#28282C', color: '#FFF', width: 60, padding: 8, borderRadius: 8, textAlign: 'center', fontWeight: '700' },

  previewCard: { backgroundColor: '#181818', padding: 16, borderRadius: 12, marginTop: 24, borderWidth: 1, borderColor: '#333' },
  previewTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  previewMacrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  previewMacro: { alignItems: 'center' },
  previewMacroVal: { fontSize: 20, fontWeight: '900' },
  previewMacroLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 4 },

  builderItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  builderName: { flex: 1, color: '#FFF', fontWeight: '600', marginRight: 8 },
  builderInput: { backgroundColor: '#28282C', color: '#FFF', width: 60, padding: 8, borderRadius: 8, textAlign: 'center', fontWeight: '700' },
  builderLabel: { color: '#888', marginLeft: 8, fontSize: 12, fontWeight: '600' },

  addIngBtn: { padding: 16, alignItems: 'center', backgroundColor: 'rgba(10, 132, 255, 0.1)', borderRadius: 12, marginTop: 8, marginBottom: 24 },
  addIngBtnText: { color: '#0A84FF', fontWeight: '700' },

  fullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A84FF', margin: 16, padding: 16, borderRadius: 12 },
  fullBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  sortChip: { backgroundColor: '#1E1E1E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  sortChipActive: { backgroundColor: 'rgba(0, 210, 255, 0.15)', borderColor: '#00D2FF' },
  sortChipText: { color: '#888', fontSize: 12, fontWeight: '700' },
  sortChipTextActive: { color: '#00D2FF' },

  poolItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  poolName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  poolMacros: { color: '#888', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#888', fontStyle: 'italic', marginTop: 12 },
  
  imagePickerBtn: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    aspectRatio: 16 / 9,
    width: '100%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },
  imagePickerImg: {
    width: '100%',
    height: '100%',
  }
});
