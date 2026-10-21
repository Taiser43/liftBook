import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';

export type GameModeId = 'standard' | 'daily' | 'boss_rush' | 'practice';

interface ModeOption {
  id: GameModeId;
  title: string;
  subtitle: string;
  costLabel: string;
  color: string;
  icon: string;
  unlockLevel: number;
}

const MODES: ModeOption[] = [
  {
    id: 'standard',
    title: 'Iron Run',
    subtitle: '5 Stages + Boss',
    costLabel: '⚡ 1 Pump',
    color: '#00D2FF',
    icon: 'sword-cross',
    unlockLevel: 1,
  },
  {
    id: 'daily',
    title: 'Daily Challenge',
    subtitle: 'Tages-Modifikator',
    costLabel: '⚡ 1 Pump',
    color: '#30D158',
    icon: 'calendar-star',
    unlockLevel: 5,
  },
  {
    id: 'boss_rush',
    title: 'Boss Rush',
    subtitle: 'Direkt zum Titanen',
    costLabel: '⚡ 2 Pump',
    color: '#BF5AF2',
    icon: 'skull',
    unlockLevel: 12,
  },
  {
    id: 'practice',
    title: 'Training Camp',
    subtitle: 'Deck-Test & Sparring',
    costLabel: 'Kostenlos',
    color: '#EAB308',
    icon: 'target',
    unlockLevel: 1,
  },
];

interface Props {
  selectedMode: GameModeId;
  onSelectMode: (mode: GameModeId) => void;
}

export const IronTacticsModeCarousel: React.FC<Props> = ({ selectedMode, onSelectMode }) => {
  const level = useIronTacticsMetaStore(state => state.level);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MODES.map(mode => {
          const isSelected = selectedMode === mode.id;
          const isLocked = level < mode.unlockLevel;

          return (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeCard,
                isSelected && { borderColor: mode.color, backgroundColor: `${mode.color}15` },
                isLocked && styles.modeCardLocked,
              ]}
              onPress={() => {
                if (!isLocked) onSelectMode(mode.id);
              }}
              activeOpacity={isLocked ? 1 : 0.8}
            >
              <View style={styles.topRow}>
                <View style={[styles.iconBox, { backgroundColor: `${mode.color}20` }]}>
                  <MaterialCommunityIcons
                    name={isLocked ? 'lock' : (mode.icon as any)}
                    size={18}
                    color={isLocked ? '#777' : mode.color}
                  />
                </View>
                <Text
                  style={[
                    styles.costChip,
                    { color: isLocked ? '#777' : mode.color },
                    isSelected && { backgroundColor: `${mode.color}25` },
                  ]}
                >
                  {isLocked ? `Lv ${mode.unlockLevel}` : mode.costLabel}
                </Text>
              </View>

              <Text style={[styles.modeTitle, isSelected && { color: mode.color }]}>
                {mode.title}
              </Text>
              <Text style={styles.modeSub}>{isLocked ? `Freischaltung ab Lv ${mode.unlockLevel}` : mode.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  modeCard: {
    width: 145,
    borderRadius: 14,
    backgroundColor: '#151520',
    borderWidth: 1.5,
    borderColor: '#262638',
    padding: 10,
  },
  modeCardLocked: {
    opacity: 0.5,
    backgroundColor: '#111116',
    borderColor: '#1D1D28',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costChip: {
    fontSize: 9.5,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  modeTitle: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  modeSub: {
    color: '#8E8E9F',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
