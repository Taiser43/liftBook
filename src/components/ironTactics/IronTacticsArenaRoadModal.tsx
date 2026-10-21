import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IRON_TACTICS_ARENAS, IronTacticsArena } from '../../constants/ironTacticsArenas';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const IronTacticsArenaRoadModal: React.FC<Props> = ({ visible, onClose }) => {
  const trophies = useIronTacticsMetaStore(state => state.trophies);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🗺️ Arena-Pfad</Text>
            <Text style={styles.headerSub}>Aktuell: {trophies} 🏆 Trophäen</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {IRON_TACTICS_ARENAS.map((arena, idx) => {
            const isUnlocked = trophies >= arena.requiredTrophies;
            const isNext = !isUnlocked && (idx === 0 || trophies >= IRON_TACTICS_ARENAS[idx - 1].requiredTrophies);
            const isCurrent = isUnlocked && (idx === IRON_TACTICS_ARENAS.length - 1 || trophies < IRON_TACTICS_ARENAS[idx + 1].requiredTrophies);

            return (
              <View key={arena.id} style={styles.stepContainer}>
                {/* Connecting Line */}
                {idx < IRON_TACTICS_ARENAS.length - 1 && (
                  <View
                    style={[
                      styles.connectorLine,
                      { backgroundColor: isUnlocked ? '#00D2FF80' : '#26263A' },
                    ]}
                  />
                )}

                <View
                  style={[
                    styles.arenaCard,
                    {
                      borderColor: isCurrent ? '#00D2FF' : isUnlocked ? arena.borderColor : '#252536',
                      backgroundColor: isUnlocked ? arena.backgroundColor : '#111116',
                    },
                    isCurrent && styles.currentCard,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badgeBox, { backgroundColor: `${arena.primaryColor}20` }]}>
                      <Text style={styles.badgeEmoji}>{arena.badgeEmoji}</Text>
                    </View>

                    <View style={styles.titleCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.arenaTitle, { color: arena.primaryColor }]}>
                          {arena.name}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>AKTUELL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.arenaSub}>{arena.subtitle}</Text>
                    </View>

                    <View style={styles.trophyReqBox}>
                      <Text style={styles.trophyReqText}>{arena.requiredTrophies} 🏆</Text>
                      {isUnlocked ? (
                        <MaterialCommunityIcons name="check-circle" size={16} color="#30D158" />
                      ) : (
                        <MaterialCommunityIcons name="lock" size={16} color="#666" />
                      )}
                    </View>
                  </View>

                  {/* Arena Effect Details */}
                  <View style={styles.effectBox}>
                    <Text style={[styles.effectLabel, { color: arena.primaryColor }]}>
                      ✨ {arena.effectName}:{' '}
                      <Text style={styles.effectDesc}>{arena.effectDescription}</Text>
                    </Text>
                  </View>

                  {/* Boss Info */}
                  <View style={styles.bossBox}>
                    <MaterialCommunityIcons name="skull" size={13} color="#FF453A" />
                    <Text style={styles.bossText}>
                      Boss: <Text style={{ color: '#FFF', fontWeight: '800' }}>{arena.bossName}</Text> ({arena.bossSubtitle})
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#20202E',
    backgroundColor: '#12121A',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#20202E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
  },
  headerSub: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stepContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  connectorLine: {
    position: 'absolute',
    left: 28,
    top: 50,
    bottom: -22,
    width: 3,
    zIndex: 1,
  },
  arenaCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    zIndex: 2,
  },
  currentCard: {
    shadowColor: '#00D2FF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  titleCol: {
    flex: 1,
  },
  arenaTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  arenaSub: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: '#00D2FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#000',
    fontSize: 8.5,
    fontWeight: '900',
  },
  trophyReqBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trophyReqText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  effectBox: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  effectLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  effectDesc: {
    color: '#B0B0C4',
    fontWeight: '500',
  },
  bossBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  bossText: {
    color: '#9E9EB2',
    fontSize: 10.5,
  },
});
