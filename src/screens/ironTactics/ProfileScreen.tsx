import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { useAppStore } from '../../store/store';
import { getActiveIronTacticsArena } from '../../constants/ironTacticsArenas';
import { getXpRequiredForLevel } from '../../engine/ironTactics/economy';
import { IronTacticsArenaRoadModal } from '../../components/ironTactics/IronTacticsArenaRoadModal';

export const ProfileScreen: React.FC = () => {
  const { trophies, level, xp, stats, codex } = useIronTacticsMetaStore();
  const flawlessMonths = useAppStore(state => state.flawlessMonths);

  const [roadModalVisible, setRoadModalVisible] = useState(false);

  const currentArena = getActiveIronTacticsArena(trophies);
  const xpNeeded = getXpRequiredForLevel(level);

  const winRate = stats.runsPlayed > 0 ? Math.round((stats.wavesWon / (stats.runsPlayed * 4)) * 100) : 0;

  const BADGES = [
    { id: 'boss_slayer', icon: 'skull', title: 'Boss-Slayer', unlocked: stats.bossKills >= 3 },
    { id: 'merge_master', icon: 'star', title: 'Merge-Meister', unlocked: true },
    { id: 'streak_7', icon: 'calendar-check', title: '7-Tage-Serie', unlocked: true },
    { id: 'flawless', icon: 'diamond', title: 'Makellos', unlocked: (flawlessMonths || []).length > 0 },
    { id: 'iron_god', icon: 'lightning-bolt', title: 'Iron God', unlocked: trophies >= 3750 },
    { id: 'collector', icon: 'bag-personal', title: 'Item-Codex', unlocked: codex.length >= 10 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Player Card */}
      <View style={[styles.playerCard, { borderColor: currentArena.borderColor, backgroundColor: currentArena.backgroundColor }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarBox, { borderColor: currentArena.primaryColor }]}>
            <Text style={styles.avatarLevel}>{level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>David</Text>
            <Text style={[styles.arenaTitle, { color: currentArena.primaryColor }]}>
              {currentArena.badgeEmoji} {currentArena.name}
            </Text>
            <Text style={styles.trophyCount}>🏆 {trophies} Trophäen</Text>
          </View>
          {(flawlessMonths || []).length > 0 && (
            <View style={styles.flawlessTag}>
              <Text style={{ fontSize: 13 }}>💎</Text>
              <Text style={styles.flawlessTagText}>{(flawlessMonths || []).length}</Text>
            </View>
          )}
        </View>

        {/* Level XP Bar */}
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>Tactician-XP</Text>
          <Text style={styles.xpNums}>{xp} / {xpNeeded} XP</Text>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${Math.min(100, (xp / xpNeeded) * 100)}%`, backgroundColor: currentArena.primaryColor }]} />
        </View>
      </View>

      {/* 2. Lifetime Stats Grid */}
      <Text style={styles.sectionHeading}>STATISTIKEN</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.runsPlayed}</Text>
          <Text style={styles.statLbl}>Runs absolviert</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.wavesWon}</Text>
          <Text style={styles.statLbl}>Wellen siegreich</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>Stage {stats.highestStage}</Text>
          <Text style={styles.statLbl}>Beste Stage</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.bossKills}</Text>
          <Text style={styles.statLbl}>Titanen bezwungen</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{winRate}%</Text>
          <Text style={styles.statLbl}>Wellen-Siegquote</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{codex.length} / 15</Text>
          <Text style={styles.statLbl}>Codex freigeschaltet</Text>
        </View>
      </View>

      {/* 3. Badges */}
      <Text style={[styles.sectionHeading, { marginTop: 18 }]}>ABZEICHEN & MEILENSTEINE</Text>
      <View style={styles.badgesGrid}>
        {BADGES.map(b => (
          <View key={b.id} style={[styles.badgeCard, !b.unlocked && { opacity: 0.35 }]}>
            <View style={[styles.badgeIconWrap, b.unlocked && { backgroundColor: '#FFD70020' }]}>
              <MaterialCommunityIcons
                name={b.icon as any}
                size={22}
                color={b.unlocked ? '#FFD700' : '#666'}
              />
            </View>
            <Text style={styles.badgeName}>{b.title}</Text>
          </View>
        ))}
      </View>

      {/* 4. Arena Road Action */}
      <TouchableOpacity style={styles.roadBtn} onPress={() => setRoadModalVisible(true)} activeOpacity={0.85}>
        <MaterialCommunityIcons name="map-marker-path" size={20} color="#00D2FF" />
        <Text style={styles.roadBtnText}>Arena-Pfad & 10 Arenen ansehen</Text>
      </TouchableOpacity>

      <IronTacticsArenaRoadModal visible={roadModalVisible} onClose={() => setRoadModalVisible(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A10',
  },
  content: {
    padding: 14,
    paddingBottom: 30,
  },
  playerCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E2C',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLevel: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  playerName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  arenaTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  trophyCount: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  flawlessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(191, 90, 242, 0.25)',
    borderWidth: 1,
    borderColor: '#BF5AF280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  flawlessTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  xpLabel: {
    color: '#8E8E9F',
    fontSize: 10.5,
    fontWeight: '700',
  },
  xpNums: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20202E',
    marginTop: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeading: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '31.5%',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statVal: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
  statLbl: {
    color: '#8E8E9F',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '31.5%',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  badgeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeName: {
    color: '#B0B0C4',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  roadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#141E28',
    borderWidth: 1,
    borderColor: '#00D2FF60',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 20,
  },
  roadBtnText: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '900',
  },
});
