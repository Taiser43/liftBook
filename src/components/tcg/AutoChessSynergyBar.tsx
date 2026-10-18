import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAutoChessStore, MuscleCategory } from '../../store/useAutoChessStore';
import { CATEGORY_THEME } from './AutoChessCard';

export const AutoChessSynergyBar: React.FC = () => {
  const { board, getActiveSynergies } = useAutoChessStore();
  const activeSynergies = getActiveSynergies();

  // Count categories on active board
  const counts: Record<MuscleCategory, number> = {
    Chest: 0,
    Back: 0,
    Arms: 0,
    Shoulders: 0,
    Legs: 0,
    Core: 0
  };

  board.forEach(u => {
    if (u) {
      counts[u.category] = (counts[u.category] || 0) + 1;
    }
  });

  const categories: MuscleCategory[] = ['Chest', 'Back', 'Arms', 'Shoulders', 'Legs'];

  const onSynergyPress = (cat: MuscleCategory) => {
    const theme = CATEGORY_THEME[cat];
    const syn = activeSynergies.find(s => s.category === cat);
    const count = counts[cat];

    let message = `Aktuell auf dem Board: ${count} Einheiten.\n\n` +
      `• 2 Einheiten: +25% Kraft & Stamina Bonus\n` +
      `• 3 Einheiten (MAX): +60% Bonus + ${syn?.specialTraitName || 'Spezial-Fähigkeit'}\n` +
      `(${syn?.specialTraitDesc || 'Schaltet mächtige Synergien im Kampf frei.'})`;

    Alert.alert(`${theme.dot} ${theme.title} Synergie`, message);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {categories.map(cat => {
          const theme = CATEGORY_THEME[cat];
          const count = counts[cat] || 0;
          const isActive = count >= 2;
          const isMax = count >= 3;

          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.7}
              onPress={() => onSynergyPress(cat)}
              style={[
                styles.synergyPill,
                isActive && {
                  borderColor: isMax ? '#FFD700' : theme.color,
                  backgroundColor: `${theme.color}25`,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text style={styles.iconText}>{theme.dot}</Text>
              <Text style={[styles.titleText, isActive && { color: '#FFFFFF', fontWeight: '800' }]}>
                {theme.title}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isActive
                    ? { backgroundColor: isMax ? '#FFD700' : theme.color }
                    : { backgroundColor: '#2A2A32' },
                ]}
              >
                <Text style={[styles.countText, isActive && { color: '#000000', fontWeight: '900' }]}>
                  {count}/3
                </Text>
              </View>
              {isMax && <Text style={styles.maxTag}>MAX</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E26',
    backgroundColor: '#0A0A0E',
  },
  scrollContent: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  synergyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262630',
  },
  iconText: {
    fontSize: 11,
    marginRight: 4,
  },
  titleText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 6,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
  },
  maxTag: {
    marginLeft: 4,
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
  },
});
