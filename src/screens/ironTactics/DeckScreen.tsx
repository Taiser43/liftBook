import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { useAutoChessStore, AutoChessCardData, MuscleCategory } from '../../store/useAutoChessStore';
import { useAppStore } from '../../store/store';
import { AUTO_CHESS_ITEMS, RARITY_THEMES } from '../../constants/autoChessItems';
import { COACH_DEFINITIONS } from '../../constants/ironTacticsCoaches';
import { getMasteryUpgradeCost, getMasteryStatBonusPct } from '../../engine/ironTactics/economy';
import { resolveIronTacticsCardPool, getDeckCardsFromPool, matchesCardId } from '../../engine/ironTactics/cardPoolEngine';
import { TARGET_MUSCLES_BY_CATEGORY, resolveExerciseMuscleInfo } from '../../data/exercises';
import { triggerSuccess, triggerWarning, triggerLight } from '../../utils/haptics';

export type CardSortMode = 'power' | 'cost' | 'atk' | 'hp' | 'mastery' | 'fragments' | 'rank' | 'name';

const SORT_OPTIONS: { id: CardSortMode; label: string; icon: string }[] = [
  { id: 'power', label: 'Gesamtstärke (Power)', icon: 'lightning-bolt' },
  { id: 'cost', label: 'Scheiben / Kosten', icon: 'nut' },
  { id: 'atk', label: 'Angriff (ATK)', icon: 'sword-cross' },
  { id: 'hp', label: 'Leben (HP)', icon: 'heart' },
  { id: 'mastery', label: 'Mastery-Level', icon: 'star' },
  { id: 'fragments', label: 'Fragmente', icon: 'puzzle' },
  { id: 'rank', label: 'Seltenheit / Rang', icon: 'trophy' },
  { id: 'name', label: 'Name (A - Z)', icon: 'sort-alphabetical-ascending' },
];

const CATEGORY_FILTERS: { id: 'All' | MuscleCategory; label: string; icon: string }[] = [
  { id: 'All', label: 'Alle', icon: 'cards' },
  { id: 'Chest', label: 'Brust', icon: 'arm-flex' },
  { id: 'Back', label: 'Rücken', icon: 'human' },
  { id: 'Shoulders', label: 'Schultern', icon: 'weight-lifter' },
  { id: 'Legs', label: 'Beine', icon: 'run' },
  { id: 'Arms', label: 'Arme', icon: 'dumbbell' },
  { id: 'Core', label: 'Core', icon: 'shield' },
];

const getCategoryColor = (cat: string): string => {
  switch (cat) {
    case 'Chest': return '#F43F5E';
    case 'Back': return '#0284C7';
    case 'Arms': return '#A855F7';
    case 'Shoulders': return '#EAB308';
    case 'Legs': return '#10B981';
    default: return '#00D2FF';
  }
};

const getCategoryIcon = (cat: string): any => {
  switch (cat) {
    case 'Chest': return 'arm-flex';
    case 'Back': return 'human';
    case 'Arms': return 'dumbbell';
    case 'Shoulders': return 'weight-lifter';
    case 'Legs': return 'run';
    default: return 'shield';
  }
};

export const DeckScreen: React.FC = () => {
  const {
    decks,
    activeDeckIndex,
    setActiveDeck,
    updateDeckCards,
    renameDeck,
    mastery,
    fragments,
    eisen,
    upgradeCardMastery,
    codex,
    activeCoach,
    setActiveCoach,
    level,
  } = useIronTacticsMetaStore();

  const workoutPrograms = useAppStore(state => state.workoutPrograms);
  const globalActivePlan = useAppStore(state => state.globalActivePlan);
  const customExercises = useAppStore(state => state.customExercises || []);

  // Always resolve fresh card pool so newly created exercises and updated categories appear immediately
  const pool: AutoChessCardData[] = useMemo(() => resolveIronTacticsCardPool(), [customExercises, workoutPrograms, globalActivePlan]);

  const [subTab, setSubTab] = useState<'cards' | 'items' | 'coaches'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MuscleCategory>('All');
  const [selectedTargetMuscle, setSelectedTargetMuscle] = useState<string>('All');
  const [selectedCost, setSelectedCost] = useState<'All' | number>('All');
  const [selectedRank, setSelectedRank] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in_deck' | 'reserve' | 'upgradeable'>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'custom' | 'active_tp'>('all');
  const [sortBy, setSortBy] = useState<CardSortMode>('power');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Deck rename modal
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const activeDeck = decks[activeDeckIndex] || decks[0];
  const activeDeckCards = getDeckCardsFromPool(activeDeck.cardIds, pool);

  // Deck statistics
  const avgCost = activeDeckCards.length > 0
    ? (activeDeckCards.reduce((acc, c) => acc + (c.cost || 2), 0) / activeDeckCards.length).toFixed(1)
    : '0.0';

  const isCardInDeck = (card: AutoChessCardData): boolean => {
    return activeDeck.cardIds.some(id => matchesCardId(id, card));
  };

  const isCustomCard = (cardName: string): boolean => {
    const norm = cardName.toLowerCase().trim();
    return (customExercises || []).some(c => c.name?.toLowerCase().trim() === norm);
  };

  const isActiveTpCard = (cardName: string): boolean => {
    const norm = cardName.toLowerCase().trim();
    const activeProg = (workoutPrograms || []).find(p => p.isActive) || (workoutPrograms || [])[0];
    if (activeProg && activeProg.workouts) {
      for (const w of activeProg.workouts) {
        if (w.exercises && w.exercises.some((e: any) => e.name?.toLowerCase().trim() === norm)) {
          return true;
        }
      }
    }
    if (globalActivePlan && globalActivePlan.exercises) {
      if (globalActivePlan.exercises.some((e: any) => e.name?.toLowerCase().trim() === norm)) {
        return true;
      }
    }
    return false;
  };

  const isCardUpgradeable = (cardId: string): boolean => {
    const mLv = mastery[cardId] || 1;
    const costData = getMasteryUpgradeCost(mLv);
    const frags = fragments[cardId] || 0;
    return !!(costData && frags >= costData.fragments && eisen >= costData.eisen);
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All' ||
    selectedTargetMuscle !== 'All' ||
    selectedCost !== 'All' ||
    selectedRank !== 'All' ||
    selectedStatus !== 'all' ||
    selectedSource !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedTargetMuscle('All');
    setSelectedCost('All');
    setSelectedRank('All');
    setSelectedStatus('all');
    setSelectedSource('all');
    triggerLight();
  };

  // Helper: auto-fill deck from active workout plan
  const handleImportFromTodayPlan = () => {
    const activeProg = (workoutPrograms || []).find(p => p.isActive);
    const targetWorkout = globalActivePlan || (activeProg && activeProg.workouts && activeProg.workouts[0]);
    if (!targetWorkout || !targetWorkout.exercises || targetWorkout.exercises.length === 0) {
      Alert.alert('Kein Plan aktiv', 'Wähle im Training-Tab einen aktiven Plan oder ein Workout aus.');
      return;
    }

    const planNames: string[] = targetWorkout.exercises
      .map((e: any) => (e.name || '').trim())
      .filter((name: string) => name.length > 0);

    const newDeckIds: string[] = [];

    // Match exercises to current pool
    for (const name of planNames) {
      const match = pool.find(c => matchesCardId(name, c));
      if (match && !newDeckIds.includes(match.id)) {
        newDeckIds.push(match.id);
      }
    }

    // If fewer than 8, backfill from pool
    for (const card of pool) {
      if (!newDeckIds.includes(card.id)) {
        newDeckIds.push(card.id);
      }
      if (newDeckIds.length >= 8) break;
    }

    updateDeckCards(activeDeckIndex, newDeckIds);
    triggerSuccess();
    Alert.alert('Deck aktualisiert!', `Deck „${activeDeck.name}“ wurde aus deinem heutigen Plan befüllt.`);
  };

  const handleToggleCardInDeck = (card: AutoChessCardData) => {
    const inDeck = isCardInDeck(card);
    const current = [...activeDeck.cardIds];

    if (inDeck) {
      if (activeDeckCards.length <= 8) {
        Alert.alert('Mindestens 8 Karten', 'Ein Kampfdeck muss aus mindestens 8 Einheiten bestehen.');
        return;
      }
      // Remove matching card ID
      const next = current.filter(id => !matchesCardId(id, card));
      updateDeckCards(activeDeckIndex, next);
      triggerLight();
    } else {
      if (activeDeckCards.length >= 12) {
        Alert.alert('Maximal 12 Karten', 'Ein Kampfdeck kann maximal 12 Einheiten enthalten.');
        return;
      }
      updateDeckCards(activeDeckIndex, [...current, card.id]);
      triggerSuccess();
    }
  };

  const handleOpenRename = () => {
    setRenameValue(activeDeck.name);
    setRenameModalVisible(true);
  };

  const handleSaveRename = () => {
    renameDeck(activeDeckIndex, renameValue);
    setRenameModalVisible(false);
    triggerSuccess();
  };

  // Filtered and sorted collection
  const filteredAndSortedPool = pool
    .filter(card => {
      // 1. Search Query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const muscleInfo = resolveExerciseMuscleInfo(card.exerciseName, customExercises);
        const nameMatch = card.exerciseName.toLowerCase().includes(q);
        const catMatch = card.category.toLowerCase().includes(q);
        const targetMatch = (muscleInfo.targetMuscle || '').toLowerCase().includes(q);
        const traitMatch = (card.traitName || '').toLowerCase().includes(q);
        const equipMatch = (card.equipmentType || '').toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !targetMatch && !traitMatch && !equipMatch) return false;
      }

      // 2. Category
      if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;

      // 3. Target Muscle Subfilter
      if (selectedTargetMuscle !== 'All') {
        const muscleInfo = resolveExerciseMuscleInfo(card.exerciseName, customExercises);
        if (muscleInfo.targetMuscle !== selectedTargetMuscle) return false;
      }

      // 4. Cost
      if (selectedCost !== 'All' && card.cost !== selectedCost) return false;

      // 5. Rank
      if (selectedRank !== 'All' && card.rank !== selectedRank) return false;

      // 6. Status
      const inDeck = isCardInDeck(card);
      if (selectedStatus === 'in_deck' && !inDeck) return false;
      if (selectedStatus === 'reserve' && inDeck) return false;
      if (selectedStatus === 'upgradeable' && !isCardUpgradeable(card.id)) return false;

      // 7. Source
      if (selectedSource === 'custom' && !isCustomCard(card.exerciseName)) return false;
      if (selectedSource === 'active_tp' && !isActiveTpCard(card.exerciseName)) return false;

      return true;
    })
    .sort((a, b) => {
      let diff = 0;
      const mLvA = mastery[a.id] || 1;
      const mLvB = mastery[b.id] || 1;
      const bPctA = getMasteryStatBonusPct(mLvA);
      const bPctB = getMasteryStatBonusPct(mLvB);
      const atkA = Math.round(a.baseAtk * (1 + bPctA / 100));
      const atkB = Math.round(b.baseAtk * (1 + bPctB / 100));
      const hpA = Math.round(a.baseHp * (1 + bPctA / 100));
      const hpB = Math.round(b.baseHp * (1 + bPctB / 100));
      const powerA = atkA + hpA;
      const powerB = atkB + hpB;
      const fragsA = fragments[a.id] || 0;
      const fragsB = fragments[b.id] || 0;

      switch (sortBy) {
        case 'power':
          diff = powerA - powerB;
          break;
        case 'cost':
          diff = a.cost - b.cost;
          break;
        case 'atk':
          diff = atkA - atkB;
          break;
        case 'hp':
          diff = hpA - hpB;
          break;
        case 'mastery':
          diff = mLvA - mLvB;
          break;
        case 'fragments':
          diff = fragsA - fragsB;
          break;
        case 'name':
          diff = a.exerciseName.localeCompare(b.exerciseName);
          break;
        case 'rank': {
          const weights: Record<string, number> = { Bronze: 1, Silver: 2, Gold: 3, Emerald: 4, Challenger: 5 };
          diff = (weights[a.rank] || 0) - (weights[b.rank] || 0);
          break;
        }
      }

      return sortOrder === 'asc' ? diff : -diff;
    });

  // Selected card for mastery detail modal
  const selectedCardData = selectedCardId ? pool.find(c => c.id === selectedCardId) : null;
  const cardMasteryLv = selectedCardId ? (mastery[selectedCardId] || 1) : 1;
  const upgradeCost = selectedCardId ? getMasteryUpgradeCost(cardMasteryLv) : null;
  const cardFrags = selectedCardId ? (fragments[selectedCardId] || 0) : 0;
  const bonusPct = getMasteryStatBonusPct(cardMasteryLv);
  const activeSortOption = SORT_OPTIONS.find(s => s.id === sortBy) || SORT_OPTIONS[0];

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'cards' && styles.tabBtnActive]}
          onPress={() => setSubTab('cards')}
        >
          <MaterialCommunityIcons name="cards-playing-outline" size={18} color={subTab === 'cards' ? '#00D2FF' : '#777'} />
          <Text style={[styles.tabBtnText, subTab === 'cards' && styles.tabBtnTextActive]}>Karten & Deck</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'items' && styles.tabBtnActive]}
          onPress={() => setSubTab('items')}
        >
          <MaterialCommunityIcons name="bag-personal-outline" size={18} color={subTab === 'items' ? '#BF5AF2' : '#777'} />
          <Text style={[styles.tabBtnText, subTab === 'items' && styles.tabBtnTextActive]}>Item-Codex ({codex.length}/15)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'coaches' && styles.tabBtnActive]}
          onPress={() => setSubTab('coaches')}
        >
          <MaterialCommunityIcons name="whistle-outline" size={18} color={subTab === 'coaches' ? '#FFD700' : '#777'} />
          <Text style={[styles.tabBtnText, subTab === 'coaches' && styles.tabBtnTextActive]}>Coaches</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── 1. CARDS TAB ── */}
        {subTab === 'cards' && (
          <View>
            {/* Deck Slots Selector */}
            <View style={styles.deckSelectorRow}>
              {decks.map((deck, idx) => {
                const isActive = activeDeckIndex === idx;
                return (
                  <TouchableOpacity
                    key={deck.id}
                    style={[styles.deckTabChip, isActive && styles.deckTabChipActive]}
                    onPress={() => setActiveDeck(idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.deckTabChipText, isActive && styles.deckTabChipTextActive]}>
                      Deck {idx + 1}
                    </Text>
                    <Text style={[styles.deckTabSubText, isActive && { color: '#00D2FF' }]} numberOfLines={1}>
                      {deck.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Active Deck Overview Card */}
            <View style={styles.deckSummaryCard}>
              <View style={styles.deckHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.deckActiveTitle}>{activeDeck.name}</Text>
                    <TouchableOpacity onPress={handleOpenRename} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="pencil-outline" size={16} color="#00D2FF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.deckSubLabel}>Dein aktives Line-up für den Run</Text>
                </View>

                {/* Deck Stats Badge */}
                <View style={styles.deckStatsBadges}>
                  <View style={styles.statChip}>
                    <Text style={[styles.statChipVal, activeDeckCards.length < 8 && { color: '#FF453A' }]}>
                      {activeDeckCards.length}/12
                    </Text>
                    <Text style={styles.statChipLbl}>Karten</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipVal}>🔘 {avgCost}</Text>
                    <Text style={styles.statChipLbl}>Ø Kosten</Text>
                  </View>
                </View>
              </View>

              {/* Quick Action: Import from workout */}
              <TouchableOpacity style={styles.importBtn} onPress={handleImportFromTodayPlan} activeOpacity={0.8}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFD700" />
                <Text style={styles.importBtnText}>Aus heutigem Workout befüllen (+10% Pump-Synergie)</Text>
              </TouchableOpacity>

              {/* Active Deck Cards Grid */}
              <Text style={styles.activeDeckGridLabel}>IM KAMPFDECK ({activeDeckCards.length} Einheiten)</Text>
              <View style={styles.activeDeckGrid}>
                {activeDeckCards.map(card => {
                  const mLv = mastery[card.id] || 1;
                  const bPct = getMasteryStatBonusPct(mLv);
                  const effectiveAtk = Math.round(card.baseAtk * (1 + bPct / 100));
                  const effectiveHp = Math.round(card.baseHp * (1 + bPct / 100));
                  const catColor = getCategoryColor(card.category);
                  const catIcon = getCategoryIcon(card.category);

                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={styles.deckCardItem}
                      onPress={() => setSelectedCardId(card.id)}
                      activeOpacity={0.8}
                    >
                      {/* Top Plate Cost & Remove Btn */}
                      <View style={styles.deckCardTop}>
                        <View style={styles.costBadge}>
                          <Text style={styles.costBadgeText}>🔘{card.cost}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeCardBtn}
                          onPress={() => handleToggleCardInDeck(card)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="close" size={12} color="#FFF" />
                        </TouchableOpacity>
                      </View>

                      {/* Exercise Artwork Thumbnail */}
                      <View style={styles.deckCardArtBox}>
                        {card.imageUri ? (
                          <Image source={{ uri: card.imageUri }} style={styles.deckCardArtImage} resizeMode="cover" />
                        ) : (
                          <View style={[styles.deckCardArtPlaceholder, { backgroundColor: `${catColor}18` }]}>
                            <MaterialCommunityIcons name={catIcon} size={22} color={catColor} />
                          </View>
                        )}
                      </View>

                      <Text style={[styles.deckCardCategory, { color: catColor }]}>{card.category}</Text>
                      <Text style={styles.deckCardName} numberOfLines={2}>{card.exerciseName}</Text>

                      <View style={styles.deckCardStats}>
                        <Text style={styles.atkVal}>⚔️{effectiveAtk}</Text>
                        <Text style={styles.hpVal}>❤️{effectiveHp}</Text>
                      </View>

                      <View style={styles.deckCardMastery}>
                        <Text style={styles.deckCardMasteryText}>★ Lv {mLv}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── RESERVE & FULL COLLECTION ── */}
            <View style={styles.collectionSection}>
              <View style={styles.collectionHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>KARTENSAMMLUNG</Text>
                  <Text style={styles.collectionCountText}>
                    {filteredAndSortedPool.length} von {pool.length} Einheiten ({activeDeckCards.length} im Deck)
                  </Text>
                </View>
                {isFilterActive && (
                  <TouchableOpacity style={styles.resetFilterBtn} onPress={handleResetFilters}>
                    <MaterialCommunityIcons name="filter-remove-outline" size={13} color="#00D2FF" />
                    <Text style={styles.resetFilterText}>Zurücksetzen</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Bar */}
              <View style={styles.searchBarContainer}>
                <MaterialCommunityIcons name="magnify" size={18} color="#8E8E9F" style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Karte, Muskel, Fähigkeit suchen..."
                  placeholderTextColor="#66667A"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
                    <MaterialCommunityIcons name="close-circle" size={16} color="#8E8E9F" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Sort & Quick Controls Row */}
              <View style={styles.sortControlsRow}>
                <TouchableOpacity
                  style={styles.sortSelectorBtn}
                  onPress={() => setSortModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="sort" size={14} color="#00D2FF" />
                  <Text style={styles.sortSelectorText} numberOfLines={1}>
                    Sortierung: {activeSortOption.label}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={14} color="#00D2FF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sortOrderToggleBtn}
                  onPress={() => {
                    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
                    triggerLight();
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={sortOrder === 'desc' ? 'arrow-down-thick' : 'arrow-up-thick'}
                    size={13}
                    color="#FFD700"
                  />
                  <Text style={styles.sortOrderToggleText}>{sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}</Text>
                </TouchableOpacity>
              </View>

              {/* Status & Quick Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                {[
                  { id: 'all', label: 'Alle Status' },
                  { id: 'in_deck', label: `Im Deck (${activeDeckCards.length})` },
                  { id: 'reserve', label: 'Nur Reserve' },
                  { id: 'upgradeable', label: '⬆️ Upgrade bereit' },
                ].map(st => {
                  const isActive = selectedStatus === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.smallFilterPill, isActive && styles.smallFilterPillActive]}
                      onPress={() => setSelectedStatus(st.id as any)}
                    >
                      <Text style={[styles.smallFilterPillText, isActive && styles.smallFilterPillTextActive]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.pillDivider} />

                {/* Source Pills */}
                {[
                  { id: 'all', label: 'Alle Quellen' },
                  { id: 'custom', label: 'Eigene Übungen' },
                  { id: 'active_tp', label: 'Aktiver Plan' },
                ].map(src => {
                  const isActive = selectedSource === src.id;
                  return (
                    <TouchableOpacity
                      key={src.id}
                      style={[styles.smallFilterPill, isActive && styles.smallFilterPillActive]}
                      onPress={() => setSelectedSource(src.id as any)}
                    >
                      <Text style={[styles.smallFilterPillText, isActive && styles.smallFilterPillTextActive]}>
                        {src.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Cost & Rank Filter Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterChipRow, { marginTop: 4 }]}>
                {/* Cost pills */}
                <TouchableOpacity
                  style={[styles.smallFilterPill, selectedCost === 'All' && styles.smallFilterPillActive]}
                  onPress={() => setSelectedCost('All')}
                >
                  <Text style={[styles.smallFilterPillText, selectedCost === 'All' && styles.smallFilterPillTextActive]}>
                    🔘 Alle Kosten
                  </Text>
                </TouchableOpacity>
                {[1, 2, 3, 4, 5].map(c => {
                  const isActive = selectedCost === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.smallFilterPill, isActive && styles.smallFilterPillActive]}
                      onPress={() => setSelectedCost(isActive ? 'All' : c)}
                    >
                      <Text style={[styles.smallFilterPillText, isActive && styles.smallFilterPillTextActive]}>
                        🔘 {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.pillDivider} />

                {/* Rank pills */}
                <TouchableOpacity
                  style={[styles.smallFilterPill, selectedRank === 'All' && styles.smallFilterPillActive]}
                  onPress={() => setSelectedRank('All')}
                >
                  <Text style={[styles.smallFilterPillText, selectedRank === 'All' && styles.smallFilterPillTextActive]}>
                    🏆 Alle Ränge
                  </Text>
                </TouchableOpacity>
                {['Bronze', 'Silver', 'Gold', 'Emerald', 'Challenger'].map(r => {
                  const isActive = selectedRank === r;
                  const emoji = r === 'Bronze' ? '🥉' : r === 'Silver' ? '🥈' : r === 'Gold' ? '🥇' : r === 'Emerald' ? '💎' : '🏆';
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.smallFilterPill, isActive && styles.smallFilterPillActive]}
                      onPress={() => setSelectedRank(isActive ? 'All' : r)}
                    >
                      <Text style={[styles.smallFilterPillText, isActive && styles.smallFilterPillTextActive]}>
                        {emoji} {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Muscle Group Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.categoryFilterRow, { marginTop: 8 }]}
              >
                {CATEGORY_FILTERS.map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => {
                        setSelectedCategory(cat.id);
                        setSelectedTargetMuscle('All');
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={14}
                        color={isSelected ? '#000000' : '#8E8E9F'}
                      />
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Sub-Filter: Target Muscles if a specific category is active */}
              {selectedCategory !== 'All' && TARGET_MUSCLES_BY_CATEGORY[selectedCategory] && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subFilterRow}
                >
                  {['All', ...TARGET_MUSCLES_BY_CATEGORY[selectedCategory]].map(tm => {
                    const isSelected = selectedTargetMuscle === tm;
                    return (
                      <TouchableOpacity
                        key={tm}
                        style={[styles.subFilterChip, isSelected && styles.subFilterChipActive]}
                        onPress={() => setSelectedTargetMuscle(tm)}
                      >
                        <Text style={[styles.subFilterChipText, isSelected && styles.subFilterChipTextActive]}>
                          {tm === 'All' ? `Alle ${selectedCategory}` : tm}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Cards Grid or Empty State */}
              {filteredAndSortedPool.length === 0 ? (
                <View style={styles.emptyCollectionBox}>
                  <MaterialCommunityIcons name="card-search-outline" size={44} color="#4A4A60" />
                  <Text style={styles.emptyCollectionTitle}>Keine Einheiten gefunden</Text>
                  <Text style={styles.emptyCollectionDesc}>
                    Keine Einheiten entsprechen den gewählten Such- und Filterkriterien.
                  </Text>
                  <TouchableOpacity style={styles.emptyResetBtn} onPress={handleResetFilters}>
                    <Text style={styles.emptyResetBtnText}>Filter zurücksetzen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cardsGrid}>
                  {filteredAndSortedPool.map(card => {
                    const inDeck = isCardInDeck(card);
                    const mLv = mastery[card.id] || 1;
                    const bPct = getMasteryStatBonusPct(mLv);
                    const frags = fragments[card.id] || 0;
                    const costData = getMasteryUpgradeCost(mLv);
                    const effectiveAtk = Math.round(card.baseAtk * (1 + bPct / 100));
                    const effectiveHp = Math.round(card.baseHp * (1 + bPct / 100));
                    const catColor = getCategoryColor(card.category);
                    const catIcon = getCategoryIcon(card.category);
                    const isCustom = isCustomCard(card.exerciseName);
                    const isPlan = isActiveTpCard(card.exerciseName);
                    const canUpgrade = isCardUpgradeable(card.id);
                    const muscleInfo = resolveExerciseMuscleInfo(card.exerciseName, customExercises);

                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.cardItem,
                          inDeck && styles.cardItemInDeck,
                          canUpgrade && styles.cardItemUpgradeable,
                        ]}
                        onPress={() => setSelectedCardId(card.id)}
                        activeOpacity={0.8}
                      >
                        {/* Exercise Artwork Window with Overlaid Badges */}
                        <View style={styles.cardArtContainer}>
                          {card.imageUri ? (
                            <Image source={{ uri: card.imageUri }} style={styles.cardArtImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.cardArtPlaceholder, { backgroundColor: `${catColor}18` }]}>
                              <MaterialCommunityIcons name={catIcon} size={28} color={catColor} />
                            </View>
                          )}

                          {/* Top-Left Category Badge */}
                          <View style={[styles.floatingCatBadge, { backgroundColor: `${catColor}35`, borderColor: `${catColor}80` }]}>
                            <Text style={[styles.floatingCatText, { color: catColor }]}>{card.category}</Text>
                          </View>

                          {/* Top-Right Cost Badge */}
                          <View style={styles.floatingCostBadge}>
                            <Text style={styles.costBadgeText}>🔘{card.cost}</Text>
                          </View>

                          {/* Origin Pill (Custom or Plan) */}
                          {isCustom ? (
                            <View style={styles.floatingOriginCustom}>
                              <Text style={styles.floatingOriginText}>EIGEN</Text>
                            </View>
                          ) : isPlan ? (
                            <View style={styles.floatingOriginPlan}>
                              <Text style={styles.floatingOriginText}>PLAN</Text>
                            </View>
                          ) : null}

                          {/* Upgrade ready glowing badge */}
                          {canUpgrade && (
                            <View style={styles.floatingUpgradeBadge}>
                              <MaterialCommunityIcons name="arrow-up-bold" size={9} color="#000" />
                              <Text style={styles.floatingUpgradeText}>BEREIT</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.cardInfoBox}>
                          <Text style={styles.cardTitle} numberOfLines={2}>{card.exerciseName}</Text>

                          {muscleInfo.targetMuscle && muscleInfo.targetMuscle !== 'Standard' && (
                            <Text style={styles.cardTargetMuscle} numberOfLines={1}>{muscleInfo.targetMuscle}</Text>
                          )}

                          <View style={styles.statsRow}>
                            <Text style={styles.atkVal}>⚔️ {effectiveAtk}</Text>
                            <Text style={styles.hpVal}>❤️ {effectiveHp}</Text>
                          </View>

                          {/* Frag progress or Max */}
                          <View style={styles.fragProgressBox}>
                            <Text style={[styles.fragProgressText, canUpgrade && { color: '#30D158', fontWeight: '900' }]}>
                              ★ Lv {mLv} {costData ? `· 🧩 ${frags}/${costData.fragments}` : '· MAX'}
                            </Text>
                          </View>

                          {/* Quick Deck Add / Remove Button */}
                          <TouchableOpacity
                            style={[styles.cardActionBtn, inDeck ? styles.cardActionBtnInDeck : styles.cardActionBtnAdd]}
                            onPress={() => handleToggleCardInDeck(card)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons
                              name={inDeck ? 'check-circle' : 'plus-circle'}
                              size={13}
                              color={inDeck ? '#30D158' : '#00D2FF'}
                            />
                            <Text style={[styles.cardActionBtnText, inDeck ? { color: '#30D158' } : { color: '#00D2FF' }]}>
                              {inDeck ? 'Im Deck' : '+ Ins Deck'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── 2. ITEMS CODEX TAB ── */}
        {subTab === 'items' && (
          <View>
            <Text style={styles.sectionHeading}>ALLE 15 AUSRÜSTUNGS-ITEMS</Text>
            <Text style={styles.sectionSubHeading}>
              Gefundene Blaupausen schalten Items dauerhaft für zukünftige Runs frei.
            </Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {AUTO_CHESS_ITEMS.map(item => {
                const isUnlocked = codex.includes(item.id);
                const theme = RARITY_THEMES[item.rarity];

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      { borderColor: isUnlocked ? theme.border : '#222230', backgroundColor: isUnlocked ? theme.bg : '#111116' },
                      !isUnlocked && { opacity: 0.5 },
                    ]}
                  >
                    <View style={[styles.itemIconBox, { backgroundColor: `${theme.color}25` }]}>
                      <MaterialCommunityIcons
                        name={isUnlocked ? (item.icon as any) : 'lock'}
                        size={22}
                        color={isUnlocked ? theme.color : '#666'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.itemName, { color: isUnlocked ? theme.color : '#888' }]}>{item.name}</Text>
                        <Text style={[styles.itemRarityTag, { color: theme.color }]}>{theme.label}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '900' }}>🔘 {item.cost}</Text>
                      <Text style={{ color: isUnlocked ? '#30D158' : '#777', fontSize: 10, fontWeight: '800', marginTop: 2 }}>
                        {isUnlocked ? 'Im Codex' : 'Gesperrt'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 3. COACHES TAB ── */}
        {subTab === 'coaches' && (
          <View>
            <Text style={styles.sectionHeading}>COACHES & RUN-START-PERKS</Text>
            <Text style={styles.sectionSubHeading}>
              Wähle 1 Coach als Mentor. Sein Vorteil wirkt in jedem deiner Iron Runs.
            </Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {Object.values(COACH_DEFINITIONS).map(coach => {
                const isUnlocked = level >= coach.unlockLevel;
                const isActive = activeCoach === coach.id;

                return (
                  <View
                    key={coach.id}
                    style={[
                      styles.coachCard,
                      { borderColor: isActive ? coach.color : '#252538' },
                      isActive && { backgroundColor: `${coach.color}15` },
                      !isUnlocked && { opacity: 0.45 },
                    ]}
                  >
                    <View style={styles.coachHeaderRow}>
                      <Text style={styles.coachAvatar}>{coach.avatarEmoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.coachName, { color: coach.color }]}>{coach.name}</Text>
                        <Text style={styles.coachTitle}>{coach.title}</Text>
                      </View>
                      {isUnlocked ? (
                        <TouchableOpacity
                          style={[styles.coachSelectBtn, isActive && { backgroundColor: coach.color }]}
                          onPress={() => setActiveCoach(isActive ? null : coach.id)}
                        >
                          <Text style={[styles.coachSelectBtnText, isActive && { color: '#000' }]}>
                            {isActive ? 'Aktiv' : 'Wählen'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.coachLockText}>Ab Lv {coach.unlockLevel}</Text>
                      )}
                    </View>
                    <Text style={styles.coachPerk}>{coach.perkDescription}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── DECK RENAME MODAL ── */}
      <Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Deck umbenennen</Text>
            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="z.B. Brust & Rücken Power"
              placeholderTextColor="#666"
              autoFocus
              maxLength={24}
            />
            <View style={styles.renameBtnRow}>
              <TouchableOpacity style={styles.renameCancelBtn} onPress={() => setRenameModalVisible(false)}>
                <Text style={styles.renameCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.renameSaveBtn} onPress={handleSaveRename}>
                <Text style={styles.renameSaveText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CARD MASTERY & DETAIL MODAL ── */}
      {selectedCardData && (
        <Modal visible={!!selectedCardId} transparent animationType="fade" onRequestClose={() => setSelectedCardId(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Artwork Hero */}
              <View style={styles.modalArtContainer}>
                {selectedCardData.imageUri ? (
                  <Image source={{ uri: selectedCardData.imageUri }} style={styles.modalArtImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.modalArtPlaceholder, { backgroundColor: `${getCategoryColor(selectedCardData.category)}25` }]}>
                    <MaterialCommunityIcons
                      name={getCategoryIcon(selectedCardData.category)}
                      size={52}
                      color={getCategoryColor(selectedCardData.category)}
                    />
                  </View>
                )}
                {/* Close Button on Art */}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedCardId(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Overlaid Badges */}
                <View style={styles.modalArtOverlayRow}>
                  <View style={[styles.floatingCatBadge, { backgroundColor: `${getCategoryColor(selectedCardData.category)}40`, borderColor: getCategoryColor(selectedCardData.category) }]}>
                    <Text style={[styles.floatingCatText, { color: '#FFF' }]}>{selectedCardData.category}</Text>
                  </View>
                  <View style={styles.floatingCostBadge}>
                    <Text style={styles.costBadgeText}>🔘 {selectedCardData.cost} Plates</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalHeader}>
                <Text style={styles.modalCardTitle}>{selectedCardData.exerciseName}</Text>
                <Text style={styles.modalCardEquipment}>{selectedCardData.equipmentType}</Text>
              </View>

              <View style={styles.modalStatsRow}>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatNum}>⚔️ {Math.round(selectedCardData.baseAtk * (1 + bonusPct / 100))}</Text>
                  <Text style={styles.modalStatLbl}>ATK (+{bonusPct}%)</Text>
                </View>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatNum}>❤️ {Math.round(selectedCardData.baseHp * (1 + bonusPct / 100))}</Text>
                  <Text style={styles.modalStatLbl}>HP (+{bonusPct}%)</Text>
                </View>
                <View style={styles.modalStatBox}>
                  <Text style={styles.modalStatNum}>⭐ Lv {cardMasteryLv}</Text>
                  <Text style={styles.modalStatLbl}>Meisterschaft</Text>
                </View>
              </View>

              {/* Trait Box */}
              <View style={styles.traitBox}>
                <Text style={styles.traitTitle}>Synergie-Perk: {selectedCardData.traitName}</Text>
                <Text style={styles.traitDesc}>{selectedCardData.traitDesc}</Text>
              </View>

              {/* Deck Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.deckToggleBtn,
                  isCardInDeck(selectedCardData) ? styles.deckToggleRemove : styles.deckToggleAdd,
                ]}
                onPress={() => handleToggleCardInDeck(selectedCardData)}
              >
                <MaterialCommunityIcons
                  name={isCardInDeck(selectedCardData) ? 'minus-circle' : 'plus-circle'}
                  size={18}
                  color="#FFF"
                />
                <Text style={styles.deckToggleBtnText}>
                  {isCardInDeck(selectedCardData)
                    ? 'Aus aktuellem Deck entfernen'
                    : 'Zu aktuellem Deck hinzufügen'}
                </Text>
              </TouchableOpacity>

              {/* Mastery Level-Up Section */}
              <View style={styles.masteryUpgradeSection}>
                <Text style={styles.masterySectionTitle}>KARTEN-MEISTERSCHAFT (LV {cardMasteryLv}/10)</Text>
                <Text style={styles.masterySectionDesc}>
                  Erhöht ATK & HP um +2% pro Stufe (aktuell: +{bonusPct}%).
                </Text>

                {upgradeCost ? (
                  <View style={styles.costBox}>
                    <View style={styles.costItem}>
                      <Text style={styles.costVal}>
                        🧩 {cardFrags} / {upgradeCost.fragments}
                      </Text>
                      <Text style={styles.costLbl}>Fragmente</Text>
                    </View>
                    <View style={styles.costItem}>
                      <Text style={styles.costVal}>
                        🔩 {eisen} / {upgradeCost.eisen}
                      </Text>
                      <Text style={styles.costLbl}>Eisen</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: '#FFD700', fontWeight: '900', marginTop: 10, textAlign: 'center' }}>
                    👑 Maximale Meisterschaft erreicht!
                  </Text>
                )}

                {upgradeCost && (
                  <TouchableOpacity
                    style={[
                      styles.upgradeBtn,
                      (cardFrags < upgradeCost.fragments || eisen < upgradeCost.eisen) && styles.upgradeBtnDisabled,
                    ]}
                    onPress={() => {
                      const success = upgradeCardMastery(selectedCardData.id);
                      if (success) {
                        triggerSuccess();
                      } else {
                        triggerWarning();
                        Alert.alert('Nicht genug Ressourcen', 'Sammle mehr Fragmente aus Kisten oder Eisen.');
                      }
                    }}
                  >
                    <Text style={styles.upgradeBtnText}>Stufe {cardMasteryLv + 1} freischalten (+2%)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── SORT MODAL ── */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.sortModalHeader}>
              <MaterialCommunityIcons name="sort" size={18} color="#00D2FF" />
              <Text style={styles.sortModalTitle}>KARTEN SORTIEREN</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={18} color="#8E8E9F" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 6, marginVertical: 12 }}>
              {SORT_OPTIONS.map(opt => {
                const isSelected = sortBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.sortOptionRow, isSelected && styles.sortOptionRowActive]}
                    onPress={() => {
                      setSortBy(opt.id);
                      setSortModalVisible(false);
                      triggerLight();
                    }}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon as any}
                      size={18}
                      color={isSelected ? '#00D2FF' : '#8E8E9F'}
                    />
                    <Text style={[styles.sortOptionLabel, isSelected && styles.sortOptionLabelActive]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={16} color="#00D2FF" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Asc / Desc switch */}
            <View style={styles.sortDirectionRow}>
              <Text style={styles.sortDirectionLabel}>Reihenfolge:</Text>
              <View style={styles.sortDirectionButtons}>
                <TouchableOpacity
                  style={[styles.dirBtn, sortOrder === 'desc' && styles.dirBtnActive]}
                  onPress={() => {
                    setSortOrder('desc');
                    triggerLight();
                  }}
                >
                  <Text style={[styles.dirBtnText, sortOrder === 'desc' && styles.dirBtnTextActive]}>
                    ↓ Höchste zuerst
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dirBtn, sortOrder === 'asc' && styles.dirBtnActive]}
                  onPress={() => {
                    setSortOrder('asc');
                    triggerLight();
                  }}
                >
                  <Text style={[styles.dirBtnText, sortOrder === 'asc' && styles.dirBtnTextActive]}>
                    ↑ Niedrigste zuerst
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A10',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#12121A',
    borderBottomWidth: 1,
    borderBottomColor: '#222232',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#00D2FF',
  },
  tabBtnText: {
    color: '#777',
    fontSize: 12,
    fontWeight: '800',
  },
  tabBtnTextActive: {
    color: '#00D2FF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  deckSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  deckTabChip: {
    flex: 1,
    backgroundColor: '#14141E',
    borderWidth: 1.5,
    borderColor: '#26263A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  deckTabChipActive: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
  },
  deckTabChipText: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '900',
  },
  deckTabChipTextActive: {
    color: '#00D2FF',
  },
  deckTabSubText: {
    color: '#666',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
  deckSummaryCard: {
    backgroundColor: '#13131E',
    borderWidth: 1.5,
    borderColor: '#25253A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  deckHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  deckActiveTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  deckSubLabel: {
    color: '#8E8E9F',
    fontSize: 10,
    marginTop: 2,
  },
  deckStatsBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  statChip: {
    backgroundColor: '#1A1A28',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  statChipVal: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '900',
  },
  statChipLbl: {
    color: '#8E8E9F',
    fontSize: 8.5,
    fontWeight: '600',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
  },
  importBtnText: {
    color: '#FFD700',
    fontSize: 10.5,
    fontWeight: '800',
  },
  activeDeckGridLabel: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  activeDeckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deckCardItem: {
    width: '23.5%',
    backgroundColor: '#0F1A28',
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    borderRadius: 10,
    padding: 5,
    minHeight: 125,
    justifyContent: 'space-between',
  },
  deckCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  removeCardBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.85)',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckCardArtBox: {
    width: '100%',
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  deckCardArtImage: {
    width: '100%',
    height: '100%',
  },
  deckCardArtPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckCardCategory: {
    fontSize: 7.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deckCardName: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
    marginVertical: 1,
  },
  deckCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deckCardMastery: {
    backgroundColor: '#1E293B',
    borderRadius: 4,
    alignItems: 'center',
    paddingVertical: 1,
    marginTop: 2,
  },
  deckCardMasteryText: {
    color: '#FFD700',
    fontSize: 7.5,
    fontWeight: '800',
  },
  collectionSection: {
    marginTop: 4,
  },
  collectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionCountText: {
    color: '#8E8E9F',
    fontSize: 10.5,
    fontWeight: '700',
  },
  categoryFilterRow: {
    gap: 6,
    paddingBottom: 8,
    marginBottom: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#26263A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  filterChipText: {
    color: '#8E8E9F',
    fontSize: 10.5,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#000000',
  },
  sectionHeading: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionSubHeading: {
    color: '#8E8E9F',
    fontSize: 11,
    marginBottom: 8,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardItem: {
    width: '31.5%',
    backgroundColor: '#13131D',
    borderWidth: 1.5,
    borderColor: '#242436',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardItemInDeck: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.05)',
  },
  cardArtContainer: {
    width: '100%',
    height: 60,
    backgroundColor: '#101018',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArtImage: {
    width: '100%',
    height: '100%',
  },
  cardArtPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCatBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  floatingCatText: {
    fontSize: 7.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  floatingCostBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(15, 15, 24, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  costBadge: {
    backgroundColor: '#1F1F2E',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  costBadgeText: {
    color: '#FFD700',
    fontSize: 8.5,
    fontWeight: '900',
  },
  cardInfoBox: {
    padding: 6,
    justifyContent: 'space-between',
    flex: 1,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    minHeight: 26,
    lineHeight: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  atkVal: {
    color: '#FF6B00',
    fontSize: 9,
    fontWeight: '800',
  },
  hpVal: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: '800',
  },
  fragProgressBox: {
    marginTop: 3,
    backgroundColor: '#1C1C28',
    paddingVertical: 1.5,
    borderRadius: 4,
    alignItems: 'center',
  },
  fragProgressText: {
    color: '#FFD700',
    fontSize: 7.5,
    fontWeight: '800',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 5,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardActionBtnAdd: {
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderColor: 'rgba(0, 210, 255, 0.4)',
  },
  cardActionBtnInDeck: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    borderColor: 'rgba(48, 209, 88, 0.4)',
  },
  cardActionBtnText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemRarityTag: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  itemDesc: {
    color: '#8E8E9F',
    fontSize: 11,
    marginTop: 2,
  },
  coachCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#13131E',
    padding: 12,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  coachAvatar: {
    fontSize: 28,
  },
  coachName: {
    fontSize: 15,
    fontWeight: '900',
  },
  coachTitle: {
    color: '#8E8E9F',
    fontSize: 11,
  },
  coachSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#26263A',
  },
  coachSelectBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  coachLockText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
  },
  coachPerk: {
    color: '#CCC',
    fontSize: 11.5,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  renameCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#161622',
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    borderRadius: 16,
    padding: 18,
  },
  renameTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  renameInput: {
    backgroundColor: '#0F0F18',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  renameBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  renameCancelText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
  },
  renameSaveBtn: {
    backgroundColor: '#00D2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renameSaveText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#161622',
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
  },
  modalArtContainer: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#101018',
    position: 'relative',
    marginBottom: 12,
  },
  modalArtImage: {
    width: '100%',
    height: '100%',
  },
  modalArtPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalArtOverlayRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalCardTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
  },
  modalCardEquipment: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalStatBox: {
    flex: 1,
    backgroundColor: '#101018',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  modalStatNum: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  modalStatLbl: {
    color: '#8E8E9F',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  traitBox: {
    backgroundColor: '#1A1A28',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  traitTitle: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  traitDesc: {
    color: '#CCC',
    fontSize: 10.5,
    lineHeight: 14,
  },
  deckToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  deckToggleAdd: {
    backgroundColor: '#00D2FF',
  },
  deckToggleRemove: {
    backgroundColor: '#FF453A',
  },
  deckToggleBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
  masteryUpgradeSection: {
    backgroundColor: '#101018',
    borderRadius: 12,
    padding: 12,
  },
  masterySectionTitle: {
    color: '#FFD700',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  masterySectionDesc: {
    color: '#8E8E9F',
    fontSize: 10,
    marginVertical: 4,
  },
  costBox: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  costItem: {
    flex: 1,
    backgroundColor: '#1A1A28',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  costVal: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  costLbl: {
    color: '#8E8E9F',
    fontSize: 9,
  },
  upgradeBtn: {
    backgroundColor: '#30D158',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  upgradeBtnDisabled: {
    opacity: 0.4,
  },
  upgradeBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resetFilterText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#26263A',
    borderRadius: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sortControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sortSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161624',
    borderWidth: 1,
    borderColor: '#28283E',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  sortSelectorText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '800',
  },
  sortOrderToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161624',
    borderWidth: 1,
    borderColor: '#28283E',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  sortOrderToggleText: {
    color: '#FFD700',
    fontSize: 10.5,
    fontWeight: '900',
  },
  filterChipRow: {
    gap: 6,
    paddingBottom: 4,
  },
  smallFilterPill: {
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#26263A',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  smallFilterPillActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00D2FF',
  },
  smallFilterPillText: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '800',
  },
  smallFilterPillTextActive: {
    color: '#00D2FF',
  },
  pillDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#26263A',
    alignSelf: 'center',
    marginHorizontal: 3,
  },
  subFilterRow: {
    gap: 6,
    paddingBottom: 6,
    marginBottom: 4,
  },
  subFilterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subFilterChipActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: '#FFD700',
  },
  subFilterChipText: {
    color: '#A0A0B0',
    fontSize: 10,
    fontWeight: '700',
  },
  subFilterChipTextActive: {
    color: '#FFD700',
    fontWeight: '800',
  },
  emptyCollectionBox: {
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyCollectionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyCollectionDesc: {
    color: '#8E8E9F',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  emptyResetBtn: {
    backgroundColor: '#00D2FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyResetBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  cardItemUpgradeable: {
    borderColor: '#FFD700',
    borderWidth: 1.5,
  },
  floatingOriginCustom: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 210, 255, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  floatingOriginPlan: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  floatingOriginText: {
    color: '#000',
    fontSize: 7.5,
    fontWeight: '900',
  },
  floatingUpgradeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  floatingUpgradeText: {
    color: '#000',
    fontSize: 7.5,
    fontWeight: '900',
  },
  cardTargetMuscle: {
    color: '#8E8E9F',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
  sortModalCard: {
    backgroundColor: '#161624',
    borderWidth: 1.5,
    borderColor: '#2A2A40',
    borderRadius: 18,
    padding: 16,
    width: '90%',
    maxWidth: 360,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#28283C',
  },
  sortModalTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    letterSpacing: 0.5,
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A1A2A',
    borderWidth: 1,
    borderColor: '#27273C',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sortOptionRowActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderColor: '#00D2FF',
  },
  sortOptionLabel: {
    color: '#C0C0D4',
    fontSize: 12,
    fontWeight: '800',
  },
  sortOptionLabelActive: {
    color: '#00D2FF',
  },
  sortDirectionRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#28283C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortDirectionLabel: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '800',
  },
  sortDirectionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  dirBtn: {
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#28283E',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dirBtnActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700',
  },
  dirBtnText: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '800',
  },
  dirBtnTextActive: {
    color: '#FFD700',
  },
});
