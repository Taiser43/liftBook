import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, SupplementLibraryItem } from '../store/store';
import { getAppTheme } from '../utils/theme';
import SwipeableModal from '../components/SwipeableModal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import SupplementBarcodeScannerModal, { ScannedSupplementResult } from '../components/SupplementBarcodeScannerModal';

const CATEGORIES = ['All', 'Daily Health', 'Performance', 'Recovery', 'Vitamins'];

export default function SupplementLibraryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { supplementLibrary, addSupplementLibraryItem, updateSupplementLibraryItem, deleteSupplementLibraryItem, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Add/Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplementLibraryItem | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Daily Health');
  const [imageUri, setImageUri] = useState('');
  const [unit, setUnit] = useState('capsules');
  const [contentPerUnit, setContentPerUnit] = useState('1');
  const [unitsPerBox, setUnitsPerBox] = useState('');
  const [currentInventory, setCurrentInventory] = useState('');
  const [barcode, setBarcode] = useState<string | undefined>(undefined);

  const filteredLibrary = useMemo(() => {
    return (supplementLibrary || []).filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeFilter === 'All' || item.category === activeFilter;
      return matchesSearch && matchesCategory;
    });
  }, [supplementLibrary, searchQuery, activeFilter]);

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setBrand('');
    setCategory('Daily Health');
    setImageUri('');
    setUnit('capsule');
    setContentPerUnit('1');
    setUnitsPerBox('');
    setCurrentInventory('');
    setBarcode(undefined);
    setModalVisible(true);
  };

  const openEditModal = (item: SupplementLibraryItem) => {
    setEditingItem(item);
    setName(item.name);
    setBrand(item.brand || '');
    setCategory(item.category);
    setImageUri(item.imageUri || '');
    setUnit(item.unit);
    setContentPerUnit(item.contentPerUnit.toString());
    setUnitsPerBox(item.unitsPerBox ? item.unitsPerBox.toString() : '');
    setCurrentInventory(item.currentInventory !== undefined ? item.currentInventory.toString() : '');
    setBarcode(item.barcode);
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const parsedInv = currentInventory ? parseFloat(currentInventory) : undefined;
    const parsedBox = editingItem && editingItem.unitsPerBox ? editingItem.unitsPerBox : parsedInv;

    const newItem: SupplementLibraryItem = {
      id: editingItem ? editingItem.id : `lib-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: category,
      imageUri: imageUri || undefined,
      unit: unit.trim(),
      contentPerUnit: 1, // Fixed to 1 for simplified 1:1 dosing
      unitsPerBox: parsedBox,
      currentInventory: parsedInv,
      streak: editingItem ? editingItem.streak : 0,
      totalTakenTimes: editingItem ? editingItem.totalTakenTimes : 0,
      totalMissedTimes: editingItem ? editingItem.totalMissedTimes : 0,
      barcode: barcode || editingItem?.barcode,
    };

    if (editingItem) {
      updateSupplementLibraryItem(newItem);
    } else {
      addSupplementLibraryItem(newItem);
    }
    setModalVisible(false);
  };

  const handleDelete = () => {
    if (editingItem) {
      deleteSupplementLibraryItem(editingItem.id);
      setModalVisible(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Performance': return '#00D2FF';
      case 'Vitamins': return '#FFA726';
      case 'Recovery': return '#BA68C8';
      case 'Daily Health': return '#00E676';
      default: return '#00D2FF';
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Supplement Library</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.scanBtnHeader, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }]}
          onPress={() => setScannerVisible(true)}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color={theme.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtnHeader, { backgroundColor: theme.accent }]} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <MaterialCommunityIcons name="magnify" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search supplements..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.filterChip,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                activeFilter === item && { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }
              ]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterChipText, activeFilter === item && { color: theme.accent, fontWeight: 'bold' }]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      <FlatList
        data={filteredLibrary}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const catColor = getCategoryColor(item.category);
          
          let inventoryText = 'No inventory tracking';
          let lowInventory = false;
          if (item.currentInventory !== undefined) {
            inventoryText = `${item.currentInventory.toFixed(1)} ${item.unit}s left`;
            if (item.unitsPerBox && item.currentInventory < (item.unitsPerBox * 0.15)) {
              lowInventory = true;
            }
          }

          const adherence = item.totalTakenTimes + item.totalMissedTimes > 0 
            ? Math.round((item.totalTakenTimes / (item.totalTakenTimes + item.totalMissedTimes)) * 100) 
            : 0;

          return (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
              onPress={() => openEditModal(item)}
            >
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="pill" size={32} color="#555" />
                </View>
              )}
              
              <View style={styles.cardContent}>
                {item.brand && <Text style={styles.brandText}>{item.brand.toUpperCase()}</Text>}
                <Text style={styles.cardTitle}>{item.name}</Text>
                
                <View style={styles.tagContainer}>
                  <View style={[styles.tag, { borderColor: catColor + '40', backgroundColor: catColor + '15', borderWidth: 1 }]}>
                    <Text style={[styles.tagText, { color: catColor }]}>{item.category}</Text>
                  </View>
                  {item.barcode ? (
                    <View style={[styles.tag, { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                      <MaterialCommunityIcons name="barcode" size={11} color="#AAA" />
                      <Text style={[styles.tagText, { color: '#AAA' }]}>{item.barcode}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <MaterialCommunityIcons name="flask-outline" size={14} color={lowInventory ? '#FF5252' : '#AAA'} />
                    <Text style={[styles.statText, { color: lowInventory ? '#FF5252' : '#AAA' }]}>{inventoryText}</Text>
                  </View>
                  {adherence > 0 && (
                    <View style={styles.statBox}>
                      <MaterialCommunityIcons name="bullseye-arrow" size={14} color="#00E676" />
                      <Text style={styles.statText}>{adherence}% Taken</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="pill-off" size={48} color="#444" />
            <Text style={styles.emptyText}>No supplements found.</Text>
            <Text style={{ color: '#666', marginTop: 8, textAlign: 'center' }}>Add your supplements to the library to start building daily stacks.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
              <Text style={styles.emptyAddBtnText}>Add Supplement</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <SwipeableModal visible={modalVisible} onClose={() => setModalVisible(false)} maxHeight="90%">
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Supplement' : 'Add to Library'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Barcode Scan Banner */}
          <TouchableOpacity
            style={[styles.scanBanner, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }]}
            onPress={() => {
              setModalVisible(false);
              setScannerVisible(true);
            }}
          >
            <View style={[styles.scanBannerIconWrap, { backgroundColor: theme.accent }]}>
              <MaterialCommunityIcons name="barcode-scan" size={18} color="#000" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.scanBannerTitle, { color: theme.accent }]}>
                {barcode ? `EAN Barcode: ${barcode}` : 'EAN-Barcode scannen'}
              </Text>
              <Text style={styles.scanBannerSub}>
                {barcode ? 'Tippen zum erneuten Scannen' : 'Name, Marke & Größe automatisch füllen'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.accent} />
          </TouchableOpacity>

          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color="#666" />
                  <Text style={styles.imagePickerText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>BRAND (Optional)</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Optimum Nutrition" placeholderTextColor="#555" value={brand} onChangeText={setBrand} />

          <Text style={styles.fieldLabel}>NAME *</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Creatine Monohydrate" placeholderTextColor="#555" value={name} onChangeText={setName} />

          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.catSelectBtn, category === c && { borderColor: getCategoryColor(c), backgroundColor: getCategoryColor(c) + '20' }]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catSelectBtnText, category === c && { color: getCategoryColor(c) }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Inventory</Text>
          
          <Text style={styles.fieldLabel}>UNIT TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
            {['capsule', 'tablet', 'scoop', 'g', 'mg', 'ml'].map(u => (
              <TouchableOpacity key={u} style={[styles.unitBtn, unit === u && styles.unitBtnActive]} onPress={() => setUnit(u)}>
                <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 15, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>PACKAGE CONTENT (e.g. 120 or 500)</Text>
              <TextInput style={styles.textInput} placeholder="How many capsules / grams total?" placeholderTextColor="#555" keyboardType="numeric" value={currentInventory} onChangeText={setCurrentInventory} />
            </View>
          </View>

          <View style={{ height: 30 }} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Supplement</Text>
          </TouchableOpacity>

          {editingItem && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete from Library</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 30 }} />
        </KeyboardAwareScrollView>
      </SwipeableModal>

      {/* Supplement Barcode Scanner */}
      <SupplementBarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onSelectSupplement={(scanned) => {
          setEditingItem(null);
          setName(scanned.name);
          setBrand(scanned.brand || '');
          setCategory(scanned.category);
          setImageUri(scanned.imageUri || '');
          setUnit(scanned.unit);
          setContentPerUnit('1');
          setUnitsPerBox(scanned.unitsPerBox?.toString() || '');
          setCurrentInventory(scanned.currentInventory?.toString() || '');
          setBarcode(scanned.barcode);
          setModalVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 44, marginBottom: 14, paddingTop: 0 },
  backBtn: { marginRight: 15 },
  title: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  addBtnHeader: { backgroundColor: '#00D2FF', width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scanBtnHeader: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 15 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: 'white', fontSize: 16 },
  filterWrapper: { marginBottom: 15, height: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  filterChipActive: { backgroundColor: 'rgba(0, 210, 255, 0.2)', borderColor: '#00D2FF' },
  filterChipText: { color: '#888', fontWeight: 'bold' },
  filterChipTextActive: { color: '#00D2FF' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, marginBottom: 15, overflow: 'hidden', flexDirection: 'row' },
  cardImage: { width: 90, height: '100%', minHeight: 110, backgroundColor: '#2A2A2A' },
  cardContent: { flex: 1, padding: 15, justifyContent: 'center' },
  brandText: { color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 2, letterSpacing: 0.5 },
  cardTitle: { color: 'white', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  tag: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6 },
  tagText: { color: '#CCC', fontSize: 11, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#AAA', fontSize: 12, fontWeight: '500' },
  emptyState: { alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyText: { color: '#888', marginTop: 10, fontSize: 16, fontWeight: 'bold' },
  emptyAddBtn: { marginTop: 20, backgroundColor: '#00D2FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyAddBtnText: { color: '#000', fontWeight: 'bold' },
  
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  fieldLabel: { color: '#AAA', fontSize: 11, fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  textInput: { backgroundColor: '#1E1E1E', color: 'white', padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  hintText: { color: '#666', fontSize: 11, marginTop: 4 },
  imagePickerContainer: { alignItems: 'center', marginVertical: 10 },
  imagePicker: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E1E1E', overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  imagePickerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePickerText: { color: '#666', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  pickedImage: { width: '100%', height: '100%' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catSelectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' },
  catSelectBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
  sectionDivider: { height: 1, backgroundColor: '#333', marginVertical: 20 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  unitBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' },
  unitBtnActive: { backgroundColor: 'rgba(0, 210, 255, 0.2)', borderColor: '#00D2FF' },
  unitBtnText: { color: '#888', fontWeight: '600' },
  unitBtnTextActive: { color: '#00D2FF' },
  saveBtn: { backgroundColor: '#00D2FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#FF525220', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FF525250' },
  deleteBtnText: { color: '#FF5252', fontSize: 16, fontWeight: 'bold' },
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
