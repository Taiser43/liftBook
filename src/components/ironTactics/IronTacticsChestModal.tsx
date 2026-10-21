import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { CHEST_DEFINITIONS } from '../../constants/ironTacticsChests';
import { ChestOpenReward } from '../../engine/ironTactics/chestEngine';
import { triggerSuccess } from '../../utils/haptics';

interface Props {
  visible: boolean;
  slotIndex: number | null;
  onClose: () => void;
}

export const IronTacticsChestModal: React.FC<Props> = ({ visible, slotIndex, onClose }) => {
  const { chests, openChest, decks } = useIronTacticsMetaStore();
  const [reward, setReward] = useState<ChestOpenReward | null>(null);

  useEffect(() => {
    if (visible && slotIndex !== null && chests[slotIndex]?.state === 'ready') {
      const activeCardPool = decks.flatMap(d => d.cardIds);
      const res = openChest(slotIndex, activeCardPool);
      if (res) {
        setReward(res);
        triggerSuccess();
      }
    } else if (!visible) {
      setReward(null);
    }
  }, [visible, slotIndex]);

  if (!reward) return null;

  const def = CHEST_DEFINITIONS[reward.type];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { borderColor: def.color }]}>
          {/* Header */}
          <View style={[styles.chestHeader, { backgroundColor: `${def.color}25` }]}>
            <MaterialCommunityIcons name={def.icon as any} size={48} color={def.color} />
            <Text style={[styles.chestTitle, { color: def.color }]}>{def.name} geöffnet!</Text>
            <Text style={styles.chestSub}>Belohnungen aus dem Studio-Schatz</Text>
          </View>

          {/* Loot Content */}
          <ScrollView style={styles.lootList} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
            {/* Eisen */}
            <View style={styles.lootRow}>
              <View style={[styles.lootIconBox, { backgroundColor: '#A8B5C820' }]}>
                <MaterialCommunityIcons name="nut" size={24} color="#E2E8F0" />
              </View>
              <View style={styles.lootTextCol}>
                <Text style={styles.lootTitle}>+ {reward.eisen} Eisen</Text>
                <Text style={styles.lootDesc}>Währung für Kartenmeisterschaft & Shop</Text>
              </View>
            </View>

            {/* Fragments */}
            {Object.entries(reward.fragments).map(([cardId, count]) => (
              <View key={cardId} style={styles.lootRow}>
                <View style={[styles.lootIconBox, { backgroundColor: '#00D2FF20' }]}>
                  <MaterialCommunityIcons name="puzzle" size={22} color="#00D2FF" />
                </View>
                <View style={styles.lootTextCol}>
                  <Text style={styles.lootTitle}>+ {count} Fragmente</Text>
                  <Text style={styles.lootDesc}>{cardId.replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
              </View>
            ))}

            {/* Blueprint */}
            {reward.blueprintItem && (
              <View style={[styles.lootRow, { borderColor: '#BF5AF290', backgroundColor: '#200E30' }]}>
                <View style={[styles.lootIconBox, { backgroundColor: '#BF5AF230' }]}>
                  <MaterialCommunityIcons name="bag-personal" size={24} color="#BF5AF2" />
                </View>
                <View style={styles.lootTextCol}>
                  <Text style={[styles.lootTitle, { color: '#BF5AF2' }]}>
                    🎒 Blaupause: {reward.blueprintItem.name}
                  </Text>
                  <Text style={styles.lootDesc}>Im Item-Codex freigeschaltet!</Text>
                </View>
              </View>
            )}

            {/* Cosmetic Frame */}
            {reward.cosmeticFrameId && (
              <View style={[styles.lootRow, { borderColor: '#FFD70090', backgroundColor: '#241E08' }]}>
                <View style={[styles.lootIconBox, { backgroundColor: '#FFD70030' }]}>
                  <MaterialCommunityIcons name="image-frame" size={24} color="#FFD700" />
                </View>
                <View style={styles.lootTextCol}>
                  <Text style={[styles.lootTitle, { color: '#FFD700' }]}>
                    🖼️ Neuer Kartenrahmen
                  </Text>
                  <Text style={styles.lootDesc}>Im Profil & Shop anlegbar!</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Claim Button */}
          <TouchableOpacity style={[styles.claimButton, { backgroundColor: def.color }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.claimButtonText}>Einsammeln</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#12121A',
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  chestHeader: {
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#252538',
  },
  chestTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  chestSub: {
    color: '#9E9EB2',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  lootList: {
    paddingHorizontal: 16,
  },
  lootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171724',
    borderWidth: 1,
    borderColor: '#26263A',
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  lootIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lootTextCol: {
    flex: 1,
  },
  lootTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  lootDesc: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  claimButton: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
