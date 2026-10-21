import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { CHEST_DEFINITIONS } from '../../constants/ironTacticsChests';
import { getChestRemainingSeconds } from '../../engine/ironTactics/chestEngine';

interface Props {
  onOpenChestModal: (slotIndex: number) => void;
}

export const IronTacticsChestBar: React.FC<Props> = ({ onOpenChestModal }) => {
  const { chests, shakes, startChestUnlock, speedUpChest } = useIronTacticsMetaStore();
  const [, setTick] = useState(0);
  const hasUnlockingChest = chests.some(c => c && c.state === 'unlocking');

  useEffect(() => {
    if (!hasUnlockingChest) return;

    const timer = setInterval(() => {
      useIronTacticsMetaStore.getState().syncPump();
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasUnlockingChest]);

  const formatCountdown = (sec: number): string => {
    if (sec <= 0) return 'Bereit';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePressSlot = (index: number) => {
    const slot = chests[index];
    if (!slot) return;

    if (slot.state === 'ready') {
      onOpenChestModal(index);
    } else if (slot.state === 'locked') {
      const def = CHEST_DEFINITIONS[slot.type];
      Alert.alert(
        `${def.name} öffnen`,
        `Dauer: ${Math.round(def.durationSeconds / 60)} Minuten.\nNur eine Kiste kann gleichzeitig entsperren.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Timer starten',
            onPress: () => {
              const success = startChestUnlock(index);
              if (!success) {
                Alert.alert('Hinweis', 'Es wird bereits eine andere Kiste entsperrt.');
              }
            },
          },
        ]
      );
    } else if (slot.state === 'unlocking') {
      const remSec = getChestRemainingSeconds(slot);
      Alert.alert(
        'Kiste beschleunigen?',
        `Verbleibend: ${formatCountdown(remSec)}.\n\nNutze 1 Protein-Shake (Vorrat: ${shakes}), um den Timer um 1 Stunde zu verkürzen.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: '🥤 -1h Beschleunigen',
            onPress: () => {
              if (shakes < 1) {
                Alert.alert('Keine Shakes', 'Schließe echte Workouts oder Ernährungsziele ab, um Protein-Shakes zu verdienen.');
                return;
              }
              speedUpChest(index);
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>KISTEN-SLOTS</Text>
        <Text style={styles.sectionSubtitle}>
          {chests.filter(c => c && c.state === 'ready').length > 0
            ? '📦 Kiste zum Öffnen bereit!'
            : '1 Timer gleichzeitig aktiv'}
        </Text>
      </View>

      <View style={styles.slotsRow}>
        {chests.map((slot, idx) => {
          if (!slot) {
            return (
              <View key={`empty_${idx}`} style={styles.emptySlot}>
                <MaterialCommunityIcons name="cube-outline" size={20} color="#333344" />
                <Text style={styles.emptyText}>Leer</Text>
              </View>
            );
          }

          const def = CHEST_DEFINITIONS[slot.type];
          const isReady = slot.state === 'ready';
          const isUnlocking = slot.state === 'unlocking';
          const remainingSec = isUnlocking ? getChestRemainingSeconds(slot) : 0;

          return (
            <TouchableOpacity
              key={slot.id || `slot_${idx}`}
              style={[
                styles.slotCard,
                { borderColor: isReady ? '#30D158' : isUnlocking ? '#00D2FF' : def.borderColor },
                isReady && styles.readySlotCard,
              ]}
              onPress={() => handlePressSlot(idx)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, { backgroundColor: `${def.color}20` }]}>
                <MaterialCommunityIcons
                  name={def.icon as any}
                  size={24}
                  color={isReady ? '#30D158' : def.color}
                />
              </View>

              <Text style={styles.slotName} numberOfLines={1}>
                {def.name}
              </Text>

              {isReady ? (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyText}>ÖFFNEN</Text>
                </View>
              ) : isUnlocking ? (
                <View style={styles.unlockingBox}>
                  <Text style={styles.timerText}>{formatCountdown(remainingSec)}</Text>
                  <Text style={styles.speedupHint}>🥤 -1h</Text>
                </View>
              ) : (
                <View style={styles.lockedBox}>
                  <MaterialCommunityIcons name="lock" size={11} color="#8E8E9F" />
                  <Text style={styles.lockedText}>
                    {def.durationSeconds >= 3600
                      ? `${Math.round(def.durationSeconds / 3600)}h`
                      : `${Math.round(def.durationSeconds / 60)}m`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '700',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptySlot: {
    flex: 1,
    height: 98,
    borderRadius: 14,
    backgroundColor: '#111118',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#242436',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyText: {
    color: '#44445A',
    fontSize: 10,
    fontWeight: '800',
  },
  slotCard: {
    flex: 1,
    height: 98,
    borderRadius: 14,
    backgroundColor: '#151522',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  readySlotCard: {
    backgroundColor: '#0F2618',
    shadowColor: '#30D158',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  readyBadge: {
    backgroundColor: '#30D158',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readyText: {
    color: '#000',
    fontSize: 9.5,
    fontWeight: '900',
  },
  unlockingBox: {
    alignItems: 'center',
  },
  timerText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '900',
  },
  speedupHint: {
    color: '#9E9EB2',
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 1,
  },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lockedText: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '800',
  },
});
