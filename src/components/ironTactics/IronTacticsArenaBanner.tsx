import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getActiveIronTacticsArena,
  getNextIronTacticsArena,
  IronTacticsArena,
} from '../../constants/ironTacticsArenas';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';

interface Props {
  onOpenArenaRoad: () => void;
}

export const IronTacticsArenaBanner: React.FC<Props> = ({ onOpenArenaRoad }) => {
  const trophies = useIronTacticsMetaStore(state => state.trophies);
  const currentArena: IronTacticsArena = getActiveIronTacticsArena(trophies);
  const nextArena = getNextIronTacticsArena(trophies);

  // Progress to next arena
  let progressPct = 100;
  let progressLabel = 'MAX ARENA';
  if (nextArena) {
    const range = nextArena.requiredTrophies - currentArena.requiredTrophies;
    const current = Math.max(0, trophies - currentArena.requiredTrophies);
    progressPct = Math.min(100, Math.round((current / range) * 100));
    progressLabel = `${trophies} / ${nextArena.requiredTrophies} 🏆`;
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: currentArena.borderColor,
          backgroundColor: currentArena.backgroundColor,
        },
      ]}
      onPress={onOpenArenaRoad}
      activeOpacity={0.85}
    >
      {/* Background glow & subtle accent line */}
      <View style={[styles.topAccentLine, { backgroundColor: currentArena.primaryColor }]} />

      <View style={styles.contentRow}>
        <View style={[styles.iconWrapper, { backgroundColor: `${currentArena.primaryColor}22` }]}>
          <MaterialCommunityIcons
            name={currentArena.icon as any}
            size={36}
            color={currentArena.primaryColor}
          />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.badgeEmoji}>{currentArena.badgeEmoji}</Text>
            <Text style={[styles.arenaName, { color: currentArena.primaryColor }]}>
              {currentArena.name}
            </Text>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentArena.subtitle}
          </Text>

          {/* Progress bar to next arena */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPct}%`, backgroundColor: currentArena.primaryColor },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progressLabel}</Text>
          </View>
        </View>

        <View style={styles.chevronColumn}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={currentArena.primaryColor} />
          <Text style={[styles.roadTag, { color: currentArena.primaryColor }]}>Pfad</Text>
        </View>
      </View>

      {/* Arena Effect Chip */}
      <View style={[styles.effectChip, { borderColor: `${currentArena.primaryColor}40` }]}>
        <MaterialCommunityIcons name="auto-fix" size={14} color={currentArena.primaryColor} />
        <Text style={[styles.effectText, { color: currentArena.primaryColor }]} numberOfLines={1}>
          <Text style={styles.effectBold}>{currentArena.effectName}: </Text>
          {currentArena.effectDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 12,
  },
  topAccentLine: {
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
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  arenaName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#9E9EB2',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20202E',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#B0B0C4',
    fontSize: 10,
    fontWeight: '800',
  },
  chevronColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  roadTag: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  effectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  effectText: {
    fontSize: 11,
    flex: 1,
  },
  effectBold: {
    fontWeight: '900',
  },
});
