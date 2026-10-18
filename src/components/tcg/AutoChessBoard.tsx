import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAutoChessStore, AutoChessUnit } from '../../store/useAutoChessStore';
import { AutoChessCard } from './AutoChessCard';
import { WeightPlateIcon } from './WeightPlateIcon';

export const AutoChessBoard: React.FC = () => {
  const {
    board,
    bench,
    maxBoardSlots,
    currentExerciseIndex,
    itemInventory,
    sellUnit,
    moveUnit,
    unequipItem,
  } = useAutoChessStore();

  const [selectedUnit, setSelectedUnit] = useState<{ unit: AutoChessUnit; location: 'board' | 'bench'; index: number } | null>(null);

  const handleUnitPress = (unit: AutoChessUnit, location: 'board' | 'bench', index: number) => {
    setSelectedUnit({ unit, location, index });
  };

  const handleMoveAction = () => {
    if (!selectedUnit) return;
    const { unit, location } = selectedUnit;
    const targetLocation = location === 'board' ? 'bench' : 'board';
    moveUnit(unit.instanceId, targetLocation);
    setSelectedUnit(null);
  };

  const handleUnequip = (itemIndex: number) => {
    if (!selectedUnit) return;
    if (itemInventory.length >= 4) {
      Alert.alert('Gym-Tasche voll', 'Deine Gym-Tasche hat bereits 4 Items! Rüste erst ein anderes Item aus.');
      return;
    }
    unequipItem(selectedUnit.unit.instanceId, itemIndex);
    const updatedItems = [...(selectedUnit.unit.items || [])];
    updatedItems.splice(itemIndex, 1);
    setSelectedUnit({
      ...selectedUnit,
      unit: {
        ...selectedUnit.unit,
        items: updatedItems.length > 0 ? updatedItems : undefined,
      },
    });
  };

  const handleSellAction = () => {
    if (!selectedUnit) return;
    const { unit, location } = selectedUnit;
    const refund = unit.cost * (unit.stars === 1 ? 1 : unit.stars === 2 ? 2 : 4);

    Alert.alert(
      'Einheit verkaufen?',
      `Möchtest du "${unit.exerciseName}" (${unit.stars}★) für ${refund} Plates verkaufen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: `Verkaufen (+${refund} Plates)`,
          style: 'destructive',
          onPress: () => {
            sellUnit(unit.instanceId, location);
            setSelectedUnit(null);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Active Board Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Kampffeld (Squad)</Text>
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeText}>{board.filter(Boolean).length} / {maxBoardSlots} Slots</Text>
          </View>
        </View>
        <Text style={styles.slotHint}>
          {maxBoardSlots < 5 
            ? `Übung ${currentExerciseIndex + 1} • Nächster Slot ab Übung ${currentExerciseIndex + 2}` 
            : 'Max Squad erreicht! 🔓'}
        </Text>
      </View>

      {/* Active Board Slots */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardScroll}>
        {board.map((slot, idx) => {
          if (!slot) {
            return (
              <View key={`empty_board_${idx}`} style={styles.emptySlot}>
                <MaterialCommunityIcons name="shield-outline" size={28} color="#2A2A36" />
                <Text style={styles.emptySlotText}>Freier Slot {idx + 1}</Text>
                <Text style={styles.emptySlotSub}>Tap auf Bank zum Platzieren</Text>
              </View>
            );
          }

          return (
            <AutoChessCard
              key={slot.instanceId}
              data={slot}
              isBoard={true}
              size="medium"
              onPress={() => handleUnitPress(slot, 'board', idx)}
            />
          );
        })}

        {/* Locked Slots Indicator (up to 5) */}
        {maxBoardSlots < 5 && (
          <View style={[styles.emptySlot, styles.lockedSlot]}>
            <MaterialCommunityIcons name="lock" size={26} color="#666" />
            <Text style={[styles.emptySlotText, { color: '#888' }]}>Slot {maxBoardSlots + 1} Gesperrt</Text>
            <Text style={[styles.emptySlotSub, { color: '#30D158' }]}>Freischaltung bei nächster Übung!</Text>
          </View>
        )}
      </ScrollView>

      {/* Bench (Reserve) Header */}
      <View style={[styles.sectionHeader, { marginTop: 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Bank (Reserve / Duplikate)</Text>
          <View style={[styles.slotBadge, { backgroundColor: '#1A1A22' }]}>
            <Text style={[styles.slotBadgeText, { color: '#8E8E93' }]}>{bench.filter(Boolean).length} / 3</Text>
          </View>
        </View>
        <Text style={styles.benchHint}>Sammle 2x gleiche für 2★ & 3★</Text>
      </View>

      {/* Bench Slots (3 Slots) */}
      <View style={styles.benchRow}>
        {bench.map((bSlot, bIdx) => {
          if (!bSlot) {
            return (
              <View key={`empty_bench_${bIdx}`} style={styles.emptyBenchSlot}>
                <MaterialCommunityIcons name="archive-outline" size={20} color="#262632" />
                <Text style={styles.emptyBenchText}>Bank {bIdx + 1}</Text>
              </View>
            );
          }

          return (
            <AutoChessCard
              key={bSlot.instanceId}
              data={bSlot}
              size="compact"
              onPress={() => handleUnitPress(bSlot, 'bench', bIdx)}
            />
          );
        })}
      </View>

      {/* Unit Action Modal / Bottom Sheet */}
      <Modal visible={!!selectedUnit} transparent animationType="fade" onRequestClose={() => setSelectedUnit(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedUnit(null)}>
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{selectedUnit?.unit.exerciseName}</Text>
            <Text style={styles.actionSubtitle}>
              {selectedUnit?.unit.stars}★ • {selectedUnit?.unit.category} • ATK: {selectedUnit?.unit.atk} • HP: {selectedUnit?.unit.hp}
            </Text>

            {/* Equipped Items Section */}
            <View style={styles.unitItemsSection}>
              <Text style={styles.unitItemsTitle}>
                Ausrüstung ({selectedUnit?.unit.items?.length || 0}/2):
              </Text>
              {(selectedUnit?.unit.items && selectedUnit.unit.items.length > 0) ? (
                selectedUnit.unit.items.map((item, itIdx) => (
                  <View key={`${item.id}_${itIdx}`} style={styles.unitItemRow}>
                    <View style={styles.unitItemLeft}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color="#FF9500" />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.unitItemName}>{item.name}</Text>
                        <Text style={styles.unitItemDesc}>{item.description}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unitItemUnequipBtn}
                      onPress={() => handleUnequip(itIdx)}
                    >
                      <Text style={styles.unitItemUnequipText}>Ablegen 🎒</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noItemsText}>
                  Keine Items ausgerüstet. Rüste welche über deine Gym-Tasche im Shop aus!
                </Text>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleMoveAction}>
                <MaterialCommunityIcons
                  name={selectedUnit?.location === 'board' ? 'arrow-down-bold-box' : 'arrow-up-bold-box'}
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.actionBtnText}>
                  {selectedUnit?.location === 'board' ? 'Auf die Bank (Reserve)' : 'Aufs Kampffeld stellen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnSell} onPress={handleSellAction}>
                <WeightPlateIcon size={18} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#FFD700' }]}>
                  Verkaufen (+{selectedUnit ? selectedUnit.unit.cost * (selectedUnit.unit.stars === 1 ? 1 : selectedUnit.unit.stars === 2 ? 2 : 4) : 0} Plates)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  slotBadge: {
    backgroundColor: '#30D15825',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: '#30D15860',
  },
  slotBadgeText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
  },
  slotHint: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  benchHint: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  boardScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 205,
    gap: 4,
  },
  emptySlot: {
    width: 140,
    height: 195,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E1E26',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D11',
    marginHorizontal: 4,
    padding: 10,
  },
  lockedSlot: {
    borderColor: '#33333E',
    backgroundColor: '#121216',
  },
  emptySlotText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySlotSub: {
    color: '#555560',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  benchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: 155,
  },
  emptyBenchSlot: {
    width: 100,
    height: 145,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E1E26',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D11',
    marginHorizontal: 2,
  },
  emptyBenchText: {
    color: '#555560',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionCard: {
    width: '90%',
    backgroundColor: '#181820',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#2A2A38',
    alignItems: 'center',
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnSell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26261A',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  unitItemsSection: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#12121A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242434',
  },
  unitItemsTitle: {
    color: '#FF9500',
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  unitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A24',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  unitItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  unitItemName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  unitItemDesc: {
    color: '#8E8E93',
    fontSize: 9.5,
    marginTop: 1,
  },
  unitItemUnequipBtn: {
    backgroundColor: '#2A2A38',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A3A4C',
  },
  unitItemUnequipText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '700',
  },
  noItemsText: {
    color: '#777788',
    fontSize: 10,
    fontStyle: 'italic',
    paddingVertical: 2,
  },
});
