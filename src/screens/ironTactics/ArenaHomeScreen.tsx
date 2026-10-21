import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IronTacticsArenaBanner } from '../../components/ironTactics/IronTacticsArenaBanner';
import { IronTacticsModeCarousel, GameModeId } from '../../components/ironTactics/IronTacticsModeCarousel';
import { IronTacticsChestBar } from '../../components/ironTactics/IronTacticsChestBar';
import { IronTacticsFitnessFuelCard } from '../../components/ironTactics/IronTacticsFitnessFuelCard';
import { IronTacticsArenaRoadModal } from '../../components/ironTactics/IronTacticsArenaRoadModal';
import { IronTacticsChestModal } from '../../components/ironTactics/IronTacticsChestModal';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { useAppStore } from '../../store/store';

interface Props {
  onStartRun: (mode: GameModeId) => void;
  onNavigateTab: (tab: 'deck' | 'shop' | 'season' | 'profile') => void;
}

export const ArenaHomeScreen: React.FC<Props> = ({ onStartRun, onNavigateTab }) => {
  const { pump, spendPump, decks, activeDeckIndex, season } = useIronTacticsMetaStore();
  const flawlessMonths = useAppStore(state => state.flawlessMonths);

  const [selectedMode, setSelectedMode] = useState<GameModeId>('standard');
  const [arenaRoadVisible, setArenaRoadVisible] = useState(false);
  const [openedChestSlot, setOpenedChestSlot] = useState<number | null>(null);

  const activeDeck = decks[activeDeckIndex] || decks[0];

  const handleFightPress = () => {
    if (selectedMode === 'practice') {
      onStartRun('practice');
      return;
    }

    const pumpCost = selectedMode === 'boss_rush' ? 2 : 1;
    if (pump.current < pumpCost) {
      Alert.alert(
        'Nicht genug Pump!',
        `Dieser Modus benötigt ${pumpCost} ⚡ Pump.\n\nDu kannst:\n• Auf passive Regeneration warten\n• Ein echtes Workout abschließen (+3 Pump)\n• Das kostenlose Training Camp spielen!`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Training Camp spielen', onPress: () => onStartRun('practice') },
        ]
      );
      return;
    }

    const spent = spendPump();
    if (spent) {
      onStartRun(selectedMode);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Arena Banner */}
      <IronTacticsArenaBanner onOpenArenaRoad={() => setArenaRoadVisible(true)} />

      {/* 2. Mode Carousel */}
      <IronTacticsModeCarousel selectedMode={selectedMode} onSelectMode={setSelectedMode} />

      {/* 3. Big KAMPF Button with Deck preview */}
      <View style={styles.fightSection}>
        <TouchableOpacity
          style={[styles.fightButton, pump.current === 0 && selectedMode !== 'practice' && styles.fightButtonLowPump]}
          onPress={handleFightPress}
          activeOpacity={0.85}
        >
          <View style={styles.fightButtonInner}>
            <View style={styles.fightTextRow}>
              <MaterialCommunityIcons name="sword-cross" size={26} color="#000" />
              <Text style={styles.fightButtonText}>KAMPF</Text>
            </View>
            <Text style={styles.fightCostLabel}>
              {selectedMode === 'practice' ? 'KOSTENLOS' : selectedMode === 'boss_rush' ? '⚡ 2 PUMP' : '⚡ 1 PUMP'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Deck preview & quick switch */}
        <TouchableOpacity style={styles.deckPreviewStrip} onPress={() => onNavigateTab('deck')} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="cards-outline" size={16} color="#00D2FF" />
            <Text style={styles.deckName}>{activeDeck.name}</Text>
            <Text style={styles.cardCount}>({activeDeck.cardIds.length} Karten)</Text>
          </View>
          <Text style={styles.deckEditLink}>Anpassen ➔</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Chest Slots */}
      <IronTacticsChestBar onOpenChestModal={slotIdx => setOpenedChestSlot(slotIdx)} />

      {/* 5. Fitness Fuel Card */}
      <IronTacticsFitnessFuelCard />

      {/* 6. Season Preview Banner */}
      <TouchableOpacity
        style={styles.seasonBanner}
        onPress={() => onNavigateTab('season')}
        activeOpacity={0.85}
      >
        <View style={styles.seasonRow}>
          <View style={styles.seasonIconBox}>
            <MaterialCommunityIcons name="trophy-award" size={26} color="#BF5AF2" />
          </View>
          <View style={styles.seasonTextCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.seasonTitle}>SAISON OKTOBER</Text>
              {(flawlessMonths || []).length > 0 && (
                <View style={styles.flawlessPill}>
                  <Text style={styles.flawlessText}>💎 {(flawlessMonths || []).length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.seasonSub}>
              Stufe {Math.min(30, Math.floor(season.xp / 100))}/30 · Quests & Belohnungen
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#BF5AF2" />
        </View>
      </TouchableOpacity>

      {/* Modals */}
      <IronTacticsArenaRoadModal visible={arenaRoadVisible} onClose={() => setArenaRoadVisible(false)} />
      <IronTacticsChestModal
        visible={openedChestSlot !== null}
        slotIndex={openedChestSlot}
        onClose={() => setOpenedChestSlot(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A10',
  },
  content: {
    paddingBottom: 24,
  },
  fightSection: {
    marginHorizontal: 14,
    marginVertical: 6,
  },
  fightButton: {
    height: 60,
    borderRadius: 18,
    backgroundColor: '#00D2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D2FF',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fightButtonLowPump: {
    backgroundColor: '#008BA3',
    shadowOpacity: 0.1,
  },
  fightButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fightTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fightButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fightCostLabel: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -1,
  },
  deckPreviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#242436',
    borderRadius: 12,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deckName: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  cardCount: {
    color: '#8E8E9F',
    fontSize: 10.5,
    fontWeight: '600',
  },
  deckEditLink: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
  },
  seasonBanner: {
    marginHorizontal: 14,
    marginVertical: 8,
    backgroundColor: '#181028',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BF5AF250',
    padding: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seasonIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#BF5AF225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonTextCol: {
    flex: 1,
  },
  seasonTitle: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seasonSub: {
    color: '#C49EEA',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  flawlessPill: {
    backgroundColor: '#BF5AF2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  flawlessText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
});
