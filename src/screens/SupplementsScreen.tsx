import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, SupplementPlan, SupplementStack, getLocalDateString } from '../store/store';
import { useBottomSpacing } from '../hooks/useBottomSpacing';

export default function SupplementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomSpacing = useBottomSpacing();
  
  const { 
    supplementPlans, 
    supplementLibrary, 
    supplementIntakeLog, 
    toggleSupplementIntake, 
    checkSupplementDailyReset 
  } = useAppStore();

  useEffect(() => {
    checkSupplementDailyReset();
  }, []);

  const activePlan = supplementPlans?.find(p => p.isActive);
  const today = getLocalDateString();
  const todaysLog = supplementIntakeLog?.[today]?.checkedItems || {};

  // Calculate Global Stats based on library
  const globalAdherence = useMemo(() => {
    if (!supplementLibrary || supplementLibrary.length === 0) return 0;
    let totalT = 0;
    let totalM = 0;
    supplementLibrary.forEach(lib => {
      totalT += lib.totalTakenTimes || 0;
      totalM += lib.totalMissedTimes || 0;
    });
    if (totalT + totalM === 0) return 0;
    return Math.round((totalT / (totalT + totalM)) * 100);
  }, [supplementLibrary]);

  const maxStreak = useMemo(() => {
    if (!supplementLibrary || supplementLibrary.length === 0) return 0;
    return Math.max(...supplementLibrary.map(l => l.streak || 0));
  }, [supplementLibrary]);

  const handleToggleItem = (stackId: string, libId: string, targetDosage: number) => {
    toggleSupplementIntake(today, stackId, libId, targetDosage);
    Vibration.vibrate(20);
  };

  const handleTakeStack = (stack: SupplementStack) => {
    stack.supplements.forEach(supp => {
      const key = `${stack.id}_${supp.libraryItemId}`;
      if (!todaysLog[key]) {
        toggleSupplementIntake(today, stack.id, supp.libraryItemId, supp.targetDosage);
      }
    });
    Vibration.vibrate(40);
  };

  const isStackComplete = (stack: SupplementStack) => {
    if (stack.supplements.length === 0) return false;
    return stack.supplements.every(supp => todaysLog[`${stack.id}_${supp.libraryItemId}`]);
  };

  // Find next due stack
  const nextStackIndex = activePlan?.stacks.findIndex(s => !isStackComplete(s));

  const renderStack = (stack: SupplementStack, index: number) => {
    const isComplete = isStackComplete(stack);
    const isNext = index === nextStackIndex;

    return (
      <View key={stack.id} style={[styles.stackCard, isComplete && styles.stackCardComplete, isNext && styles.stackCardNext]}>
        <View style={styles.stackHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons 
              name={isComplete ? "check-circle" : (isNext ? "clock-outline" : "circle-outline")} 
              size={24} 
              color={isComplete ? '#00E676' : (isNext ? '#00D2FF' : '#555')} 
            />
            <Text style={[styles.stackTitle, isComplete && styles.textMuted]}>{stack.name}</Text>
          </View>
          {stack.timeTarget && (
            <Text style={styles.stackTime}>{stack.timeTarget}</Text>
          )}
        </View>

        <View style={styles.stackSupplementsList}>
          {stack.supplements.map((supp, i) => {
            const libItem = supplementLibrary?.find(l => l.id === supp.libraryItemId);
            if (!libItem) return null;
            const isTaken = !!todaysLog[`${stack.id}_${supp.libraryItemId}`];

            return (
              <TouchableOpacity 
                key={i} 
                style={styles.suppRow}
                onPress={() => handleToggleItem(stack.id, libItem.id, supp.targetDosage)}
              >
                <View style={[styles.checkbox, isTaken && styles.checkboxTaken]}>
                  {isTaken && <MaterialCommunityIcons name="check" size={16} color="#000" />}
                </View>
                <Text style={[styles.suppName, isTaken && styles.textMutedStrikes]}>
                  {libItem.name}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.suppDosage, isTaken && styles.textMuted]}>
                  {supp.targetDosage} {libItem.unit}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          {stack.supplements.length === 0 && (
            <Text style={{ color: '#666', fontStyle: 'italic', marginLeft: 35 }}>No supplements in this stack.</Text>
          )}
        </View>

        {!isComplete && stack.supplements.length > 0 && (
          <TouchableOpacity style={styles.takeAllBtn} onPress={() => handleTakeStack(stack)}>
            <MaterialCommunityIcons name="check-all" size={20} color="#000" />
            <Text style={styles.takeAllBtnText}>Take Stack</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Supplements</Text>
          <Text style={styles.screenSubtitle}>Daily Tracking</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('SupplementLibrary')}>
            <MaterialCommunityIcons name="bookshelf" size={20} color="#00D2FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('SupplementPlans')}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={20} color="#00D2FF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
        
        {/* Global Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="fire" size={28} color="#FF9800" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.statValue}>{maxStreak} Days</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="bullseye-arrow" size={28} color="#00E676" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.statValue}>{globalAdherence}%</Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          </View>
        </View>

        {!activePlan ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-alert-outline" size={48} color="#444" />
            <Text style={styles.emptyTitle}>No Active Plan</Text>
            <Text style={styles.emptySubtitle}>You need to activate a supplement plan to start tracking your daily intake.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('SupplementPlans')}>
              <Text style={styles.emptyBtnText}>Manage Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Current Plan: {activePlan.name}</Text>
            </View>
            
            {activePlan.stacks.map((stack, index) => renderStack(stack, index))}
            
            {activePlan.stacks.length === 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>This plan has no stacks yet.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  screenTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  screenSubtitle: { color: '#00D2FF', fontSize: 14, fontWeight: '600', marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  navButton: { backgroundColor: '#1E1E1E', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  
  statsBanner: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#333' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#333', marginHorizontal: 15 },
  statValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  
  emptyState: { alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySubtitle: { color: '#888', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: '#00D2FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: '#000', fontWeight: 'bold' },

  planHeader: { marginBottom: 15 },
  planName: { color: '#AAA', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  
  stackCard: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  stackCardNext: { borderColor: '#00D2FF', backgroundColor: '#1E1E1E' },
  stackCardComplete: { borderColor: '#00E67630', opacity: 0.7 },
  
  stackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  stackTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  stackTime: { color: '#888', fontSize: 14, fontWeight: '600' },
  
  stackSupplementsList: { gap: 12, marginBottom: 15 },
  suppRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#555', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxTaken: { backgroundColor: '#00E676', borderColor: '#00E676' },
  suppName: { color: 'white', fontSize: 16, fontWeight: '500' },
  suppDosage: { color: '#00D2FF', fontSize: 14, fontWeight: '600' },
  
  textMuted: { color: '#888' },
  textMutedStrikes: { color: '#888', textDecorationLine: 'line-through' },
  
  takeAllBtn: { backgroundColor: '#00D2FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
  takeAllBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});
