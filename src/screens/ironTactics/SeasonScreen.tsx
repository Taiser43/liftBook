import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { useAppStore } from '../../store/store';
import { SEASON_REWARDS, SEASON_XP_PER_TIER, SEASON_MAX_TIER } from '../../constants/ironTacticsSeason';
import { triggerSuccess } from '../../utils/haptics';

export const SeasonScreen: React.FC = () => {
  const { season, claimSeasonTier, quests, claimQuest } = useIronTacticsMetaStore();
  const flawlessMonths = useAppStore(state => state.flawlessMonths);

  const currentTier = Math.min(SEASON_MAX_TIER, Math.floor(season.xp / SEASON_XP_PER_TIER));
  const xpInTier = season.xp % SEASON_XP_PER_TIER;

  const handleClaimTier = (tier: number) => {
    const success = claimSeasonTier(tier);
    if (success) {
      triggerSuccess();
      Alert.alert('Belohnung erhalten!', `Stufe ${tier} erfolgreich eingelöst.`);
    }
  };

  const handleClaimQuest = (questId: string) => {
    const success = claimQuest(questId);
    if (success) {
      triggerSuccess();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Season Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.seasonTitle}>Saison Oktober 2026</Text>
            <Text style={styles.seasonSub}>Gekoppelt an dein Monats-Review</Text>
          </View>
          <MaterialCommunityIcons name="trophy-award" size={32} color="#BF5AF2" />
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.tierText}>Stufe {currentTier} / {SEASON_MAX_TIER}</Text>
          <Text style={styles.xpText}>{xpInTier} / {SEASON_XP_PER_TIER} Saison-XP</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(xpInTier / SEASON_XP_PER_TIER) * 100}%` }]} />
        </View>

        {/* Flawless Months Prestige Note */}
        <View style={styles.flawlessBanner}>
          <Text style={styles.flawlessIcon}>💎</Text>
          <Text style={styles.flawlessText}>
            <Text style={{ fontWeight: '900', color: '#FFF' }}>{(flawlessMonths || []).length} Makellose Monate: </Text>
            {(flawlessMonths || []).length > 0
              ? 'Prestige-Rahmen dauerhaft aktiv & freigeschaltet!'
              : 'Schließe 30 Tage alle Ziele ab, um den Prestige-Rahmen freizuschalten.'}
          </Text>
        </View>
      </View>

      {/* 2. Horizontal 30-Tier Track */}
      <Text style={styles.sectionHeading}>SAISON-PFAD (30 STUFEN)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackScroll}>
        {SEASON_REWARDS.map(r => {
          const isClaimed = season.claimedTiers.includes(r.tier);
          const isReady = r.tier <= currentTier && !isClaimed;
          const isLocked = r.tier > currentTier;

          return (
            <TouchableOpacity
              key={r.tier}
              style={[
                styles.tierCard,
                isReady && styles.tierCardReady,
                isClaimed && styles.tierCardClaimed,
              ]}
              onPress={() => isReady && handleClaimTier(r.tier)}
              activeOpacity={isReady ? 0.75 : 1}
            >
              <Text style={styles.tierNum}>Stufe {r.tier}</Text>
              <View style={[styles.tierIconBox, isReady && { backgroundColor: '#30D15825' }]}>
                <MaterialCommunityIcons
                  name={r.icon as any}
                  size={24}
                  color={isReady ? '#30D158' : isClaimed ? '#777' : '#BF5AF2'}
                />
              </View>
              <Text style={styles.tierRewardName} numberOfLines={1}>{r.name}</Text>

              {isClaimed ? (
                <Text style={styles.claimedTag}>✓ Abgeholt</Text>
              ) : isReady ? (
                <View style={styles.readyTag}>
                  <Text style={styles.readyTagText}>ABHOLEN</Text>
                </View>
              ) : (
                <Text style={styles.lockedTag}>Gesperrt</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. Daily Quests */}
      <Text style={[styles.sectionHeading, { marginTop: 18 }]}>TAGESQUESTS</Text>
      <View style={{ gap: 8, marginTop: 4 }}>
        {quests.daily.map(q => {
          const isDone = q.progress >= q.goal;
          const progPct = Math.min(100, (q.progress / q.goal) * 100);

          return (
            <View key={q.id} style={styles.questCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>{q.title}</Text>
                <Text style={styles.questDesc}>{q.description}</Text>
                <View style={styles.questProgRow}>
                  <View style={styles.questProgBg}>
                    <View style={[styles.questProgFill, { width: `${progPct}%` }]} />
                  </View>
                  <Text style={styles.questProgText}>{q.progress}/{q.goal}</Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.questRewardChip}>🔩 {q.eisenReward} · ⭐ {q.seasonXpReward}</Text>
                {q.claimed ? (
                  <Text style={styles.questDoneText}>✓ Eingelöst</Text>
                ) : isDone ? (
                  <TouchableOpacity style={styles.questClaimBtn} onPress={() => handleClaimQuest(q.id)}>
                    <Text style={styles.questClaimBtnText}>Abholen</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.questOpenText}>In Arbeit</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* 4. Weekly Quests */}
      <Text style={[styles.sectionHeading, { marginTop: 18 }]}>WOCHENQUESTS (RESET MONTAG)</Text>
      <View style={{ gap: 8, marginTop: 4 }}>
        {quests.weekly.map(q => {
          const isDone = q.progress >= q.goal;
          const progPct = Math.min(100, (q.progress / q.goal) * 100);

          return (
            <View key={q.id} style={styles.questCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>{q.title}</Text>
                <Text style={styles.questDesc}>{q.description}</Text>
                <View style={styles.questProgRow}>
                  <View style={styles.questProgBg}>
                    <View style={[styles.questProgFill, { width: `${progPct}%`, backgroundColor: '#BF5AF2' }]} />
                  </View>
                  <Text style={styles.questProgText}>{q.progress}/{q.goal}</Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.questRewardChip}>🔩 {q.eisenReward} · ⭐ {q.seasonXpReward}</Text>
                {q.claimed ? (
                  <Text style={styles.questDoneText}>✓ Eingelöst</Text>
                ) : isDone ? (
                  <TouchableOpacity style={styles.questClaimBtn} onPress={() => handleClaimQuest(q.id)}>
                    <Text style={styles.questClaimBtnText}>Abholen</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.questOpenText}>In Arbeit</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
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
  headerCard: {
    backgroundColor: '#160F25',
    borderWidth: 1.5,
    borderColor: '#BF5AF255',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seasonTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  seasonSub: {
    color: '#B095D4',
    fontSize: 11,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  tierText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  xpText: {
    color: '#BF5AF2',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#26183D',
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#BF5AF2',
    borderRadius: 4,
  },
  flawlessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 8,
    marginTop: 12,
    gap: 8,
  },
  flawlessIcon: {
    fontSize: 18,
  },
  flawlessText: {
    flex: 1,
    color: '#E0D0F5',
    fontSize: 11,
    lineHeight: 15,
  },
  sectionHeading: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  trackScroll: {
    gap: 8,
    paddingBottom: 6,
  },
  tierCard: {
    width: 105,
    height: 125,
    backgroundColor: '#14141E',
    borderWidth: 1.5,
    borderColor: '#26263A',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierCardReady: {
    borderColor: '#30D158',
    backgroundColor: '#0E2215',
  },
  tierCardClaimed: {
    opacity: 0.6,
    borderColor: '#1F1F2B',
  },
  tierNum: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '800',
  },
  tierIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRewardName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  claimedTag: {
    color: '#666',
    fontSize: 9.5,
    fontWeight: '700',
  },
  readyTag: {
    backgroundColor: '#30D158',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readyTagText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  lockedTag: {
    color: '#555',
    fontSize: 9,
    fontWeight: '700',
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  questTitle: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  questDesc: {
    color: '#8E8E9F',
    fontSize: 10.5,
    marginTop: 2,
  },
  questProgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  questProgBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#262638',
    overflow: 'hidden',
  },
  questProgFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 3,
  },
  questProgText: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '700',
  },
  questRewardChip: {
    color: '#FFD700',
    fontSize: 10.5,
    fontWeight: '800',
  },
  questClaimBtn: {
    backgroundColor: '#30D158',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  questClaimBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  questDoneText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
  },
  questOpenText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
  },
});
