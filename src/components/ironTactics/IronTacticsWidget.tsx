import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { getActiveIronTacticsArena } from '../../constants/ironTacticsArenas';

interface Props {
  containerWidth: number;
  onPress: () => void;
}

export const IronTacticsWidget: React.FC<Props> = ({ containerWidth, onPress }) => {
  const { trophies, pump, chests, syncPump } = useIronTacticsMetaStore();
  const currentArena = getActiveIronTacticsArena(trophies);
  const hasReadyChest = chests.some(c => c && c.state === 'ready');

  useEffect(() => {
    syncPump();
  }, []);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: containerWidth,
          borderColor: hasReadyChest ? '#30D158' : currentArena.borderColor,
          backgroundColor: currentArena.backgroundColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Top accent bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: hasReadyChest ? '#30D158' : currentArena.primaryColor },
        ]}
      />

      <View style={styles.contentRow}>
        {/* Left Arena Icon */}
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: `${currentArena.primaryColor}25` },
          ]}
        >
          <MaterialCommunityIcons
            name={currentArena.icon as any}
            size={32}
            color={currentArena.primaryColor}
          />
        </View>

        {/* Center Details */}
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>⚔️ IRON TACTICS</Text>
            {hasReadyChest && (
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>KISTE BEREIT</Text>
              </View>
            )}
          </View>
          <Text style={[styles.arenaName, { color: currentArena.primaryColor }]}>
            {currentArena.badgeEmoji} {currentArena.name}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.statChip}>🏆 {trophies} Trophäen</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={[styles.statChip, { color: pump.current > 0 ? '#FFD700' : '#888' }]}>
              ⚡ {pump.current}/{pump.maxPassive} Pump
            </Text>
          </View>
        </View>

        {/* Right Play Button */}
        <View style={styles.playActionCol}>
          <View style={styles.playButton}>
            <MaterialCommunityIcons name="play" size={20} color="#000" />
            <Text style={styles.playButtonText}>Start</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 12,
    marginVertical: 0,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  readyBadge: {
    backgroundColor: '#30D158',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  readyBadgeText: {
    color: '#000',
    fontSize: 8.5,
    fontWeight: '900',
  },
  arenaName: {
    fontSize: 14.5,
    fontWeight: '900',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statChip: {
    color: '#B0B0C4',
    fontSize: 11,
    fontWeight: '700',
  },
  dot: {
    color: '#555',
    fontSize: 12,
  },
  playActionCol: {
    marginLeft: 8,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 2,
  },
  playButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
});
