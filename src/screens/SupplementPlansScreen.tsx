import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Switch, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, SupplementPlan, SupplementStack, SupplementTarget, SupplementLibraryItem } from '../store/store';
import { getAppTheme } from '../utils/theme';
import SwipeableModal from '../components/SwipeableModal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const TIME_OF_DAY = ['Morning', 'Afternoon', 'Evening', 'Bedtime', 'Pre-Workout', 'Post-Workout'];

export default function SupplementPlansScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { supplementPlans, addSupplementPlan, updateSupplementPlan, deleteSupplementPlan, setActiveSupplementPlan, supplementLibrary, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);

  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SupplementPlan | null>(null);
  
  const [planName, setPlanName] = useState('');
  const [planStacks, setPlanStacks] = useState<SupplementStack[]>([]);

  // Stack editing state
  const [stackModalVisible, setStackModalVisible] = useState(false);
  const [editingStackId, setEditingStackId] = useState<string | null>(null);
  const [stackName, setStackName] = useState('Morning Stack');
  const [stackTimeOfDay, setStackTimeOfDay] = useState('Morning');
  const [stackTimeTarget, setStackTimeTarget] = useState('08:00');
  const [stackSupplements, setStackSupplements] = useState<SupplementTarget[]>([]);

  // Item Picker state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [targetDosageInput, setTargetDosageInput] = useState('');
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<SupplementLibraryItem | null>(null);
  const [dosageModalVisible, setDosageModalVisible] = useState(false);

  const openAddPlan = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanStacks([
      { id: 'stack-1', name: 'Morning Stack', timeOfDay: 'Morning', timeTarget: '08:00', supplements: [] }
    ]);
    setPlanModalVisible(true);
  };

  const openEditPlan = (plan: SupplementPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanStacks(JSON.parse(JSON.stringify(plan.stacks)));
    setPlanModalVisible(true);
  };

  const savePlan = () => {
    if (!planName.trim()) return;

    const newPlan: SupplementPlan = {
      id: editingPlan ? editingPlan.id : `plan-${Date.now()}`,
      name: planName.trim(),
      isActive: editingPlan ? editingPlan.isActive : false,
      stacks: planStacks
    };

    if (editingPlan) {
      updateSupplementPlan(newPlan);
    } else {
      addSupplementPlan(newPlan);
    }
    setPlanModalVisible(false);
  };

  const openAddStack = () => {
    setEditingStackId(null);
    setStackName('New Stack');
    setStackTimeOfDay('Morning');
    setStackTimeTarget('12:00');
    setStackSupplements([]);
    setStackModalVisible(true);
  };

  const openEditStack = (stack: SupplementStack) => {
    setEditingStackId(stack.id);
    setStackName(stack.name);
    setStackTimeOfDay(stack.timeOfDay);
    setStackTimeTarget(stack.timeTarget || '');
    setStackSupplements([...stack.supplements]);
    setStackModalVisible(true);
  };

  const saveStack = () => {
    const newStack: SupplementStack = {
      id: editingStackId || `stack-${Date.now()}`,
      name: stackName.trim() || 'Custom Stack',
      timeOfDay: stackTimeOfDay,
      timeTarget: stackTimeTarget.trim() || undefined,
      supplements: stackSupplements
    };

    if (editingStackId) {
      setPlanStacks(planStacks.map(s => s.id === editingStackId ? newStack : s));
    } else {
      setPlanStacks([...planStacks, newStack]);
    }
    setStackModalVisible(false);
  };

  const removeStack = (id: string) => {
    setPlanStacks(planStacks.filter(s => s.id !== id));
  };

  const addSupplementToStack = (item: SupplementLibraryItem) => {
    setSelectedLibraryItem(item);
    setTargetDosageInput('1');
    setPickerModalVisible(false);
    setTimeout(() => {
      setDosageModalVisible(true);
    }, 500); // Wait for picker modal to close
  };

  const confirmDosage = () => {
    if (!selectedLibraryItem) return;
    const dosage = parseFloat(targetDosageInput) || 1;
    const newTarget: SupplementTarget = {
      libraryItemId: selectedLibraryItem.id,
      targetDosage: dosage
    };
    setStackSupplements([...stackSupplements, newTarget]);
    setDosageModalVisible(false);
    setSelectedLibraryItem(null);
  };

  const removeSupplementFromStack = (index: number) => {
    const newSupps = [...stackSupplements];
    newSupps.splice(index, 1);
    setStackSupplements(newSupps);
  };

  const getLibraryItemName = (id: string) => {
    return supplementLibrary?.find(l => l.id === id)?.name || 'Unknown';
  };
  const getLibraryItemUnit = (id: string) => {
    return supplementLibrary?.find(l => l.id === id)?.unit || 'unit';
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Supplement Plans</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.addBtnHeader, { backgroundColor: theme.accent }]} onPress={openAddPlan}>
          <MaterialCommunityIcons name="plus" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={supplementPlans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: theme.cardBg, borderColor: item.isActive ? theme.accent : theme.cardBorder },
            ]}
            onPress={() => openEditPlan(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.stacks.length} Stacks</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.activateBtn,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                item.isActive && { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }
              ]} 
              onPress={() => setActiveSupplementPlan(item.id)}
            >
              <Text style={[styles.activateBtnText, item.isActive && { color: theme.accent }]}>
                {item.isActive ? 'Active' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No plans yet.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddPlan}>
              <Text style={styles.emptyAddBtnText}>Create Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Plan Modal */}
      <SwipeableModal visible={planModalVisible} onClose={() => setPlanModalVisible(false)} maxHeight="90%">
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPlan ? 'Edit Plan' : 'New Plan'}</Text>
            <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>PLAN NAME</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Current Cut Plan" placeholderTextColor="#555" value={planName} onChangeText={setPlanName} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Stacks</Text>
            <TouchableOpacity onPress={openAddStack}>
              <MaterialCommunityIcons name="plus-circle" size={24} color="#00D2FF" />
            </TouchableOpacity>
          </View>

          {planStacks.map((stack) => (
            <TouchableOpacity key={stack.id} style={styles.stackCard} onPress={() => openEditStack(stack)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stackName}>{stack.name}</Text>
                <Text style={styles.stackDetails}>{stack.timeOfDay} • {stack.timeTarget} • {stack.supplements.length} items</Text>
              </View>
              <TouchableOpacity onPress={() => removeStack(stack.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF5252" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={savePlan}>
            <Text style={styles.saveBtnText}>Save Plan</Text>
          </TouchableOpacity>

          {editingPlan && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => { deleteSupplementPlan(editingPlan.id); setPlanModalVisible(false); }}>
              <Text style={styles.deleteBtnText}>Delete Plan</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 30 }} />
        </KeyboardAwareScrollView>
      </SwipeableModal>

      {/* Stack Editor Modal */}
      <SwipeableModal visible={stackModalVisible} onClose={() => setStackModalVisible(false)} maxHeight="95%">
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingStackId ? 'Edit Stack' : 'New Stack'}</Text>
            <TouchableOpacity onPress={() => setStackModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>STACK NAME</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Morning Stack" placeholderTextColor="#555" value={stackName} onChangeText={setStackName} />

          <Text style={styles.fieldLabel}>TIME OF DAY</Text>
          <View style={styles.categoryRow}>
            {TIME_OF_DAY.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.catSelectBtn, stackTimeOfDay === t && { borderColor: '#00D2FF', backgroundColor: '#00D2FF20' }]}
                onPress={() => setStackTimeOfDay(t)}
              >
                <Text style={[styles.catSelectBtnText, stackTimeOfDay === t && { color: '#00D2FF' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>TARGET TIME (Optional)</Text>
          <TextInput style={styles.textInput} placeholder="08:00" placeholderTextColor="#555" value={stackTimeTarget} onChangeText={setStackTimeTarget} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Supplements</Text>
            <TouchableOpacity onPress={() => setPickerModalVisible(true)}>
              <MaterialCommunityIcons name="plus-circle" size={24} color="#00D2FF" />
            </TouchableOpacity>
          </View>

          {stackSupplements.map((supp, index) => (
            <View key={index} style={styles.suppItemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.suppItemName}>{getLibraryItemName(supp.libraryItemId)}</Text>
                <Text style={styles.suppItemDosage}>{supp.targetDosage} {getLibraryItemUnit(supp.libraryItemId)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeSupplementFromStack(index)}>
                <MaterialCommunityIcons name="minus-circle-outline" size={24} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ))}

          {stackSupplements.length === 0 && (
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 10 }}>No supplements added to this stack yet.</Text>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={saveStack}>
            <Text style={styles.saveBtnText}>Save Stack</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </KeyboardAwareScrollView>
      </SwipeableModal>

      {/* Pick Supplement from Library */}
      <SwipeableModal visible={pickerModalVisible} onClose={() => setPickerModalVisible(false)} maxHeight="80%">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Supplement</Text>
          <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
            <MaterialCommunityIcons name="close" size={24} color="#888" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={supplementLibrary}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => addSupplementToStack(item)}>
              <Text style={styles.pickerItemName}>{item.name}</Text>
              <Text style={styles.pickerItemDetails}>{item.contentPerUnit} {item.unit} | {item.category}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No items in your library.</Text>
          )}
        />
      </SwipeableModal>

      {/* Dosage Input Modal */}
      <SwipeableModal visible={dosageModalVisible} onClose={() => setDosageModalVisible(false)} maxHeight="50%">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Set Dosage</Text>
          <TouchableOpacity onPress={() => setDosageModalVisible(false)}>
            <MaterialCommunityIcons name="close" size={24} color="#888" />
          </TouchableOpacity>
        </View>
        
        {selectedLibraryItem && (
          <>
            <Text style={{ color: '#FFF', fontSize: 16, marginBottom: 15 }}>
              How much {selectedLibraryItem.name} per serving? ({selectedLibraryItem.unit})
            </Text>
            
            <Text style={styles.fieldLabel}>DOSAGE AMOUNT</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="e.g. 5" 
              placeholderTextColor="#555" 
              keyboardType="numeric" 
              value={targetDosageInput} 
              onChangeText={setTargetDosageInput} 
              autoFocus={true}
            />
            
            <TouchableOpacity style={styles.saveBtn} onPress={confirmDosage}>
              <Text style={styles.saveBtnText}>Add to Stack</Text>
            </TouchableOpacity>
          </>
        )}
      </SwipeableModal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 44, marginBottom: 14, paddingTop: 0 },
  backBtn: { marginRight: 15 },
  title: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  addBtnHeader: { backgroundColor: '#00D2FF', width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cardActive: { borderColor: '#00D2FF' },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: '#888', fontSize: 14 },
  activateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#333' },
  activateBtnActive: { backgroundColor: 'rgba(0, 210, 255, 0.1)' },
  activateBtnText: { color: '#AAA', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyText: { color: '#888', marginTop: 10, fontSize: 16, fontWeight: 'bold' },
  emptyAddBtn: { marginTop: 20, backgroundColor: '#00D2FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyAddBtnText: { color: '#000', fontWeight: 'bold' },
  
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  fieldLabel: { color: '#AAA', fontSize: 11, fontWeight: 'bold', marginBottom: 6, marginTop: 15 },
  textInput: { backgroundColor: '#1E1E1E', color: 'white', padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 15 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  stackCard: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  stackName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  stackDetails: { color: '#888', fontSize: 12 },
  saveBtn: { backgroundColor: '#00D2FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 25 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#FF525220', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FF525250' },
  deleteBtnText: { color: '#FF5252', fontSize: 16, fontWeight: 'bold' },
  
  // Stack Editor
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catSelectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' },
  catSelectBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
  suppItemCard: { backgroundColor: '#222', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suppItemName: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  suppItemDosage: { color: '#00D2FF', fontSize: 13, marginTop: 2 },
  
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  pickerItemName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  pickerItemDetails: { color: '#888', fontSize: 12, marginTop: 4 }
});
