import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAutoChessStore } from '../../store/useAutoChessStore';
import { triggerSuccess, triggerLight } from '../../utils/haptics';

export interface TrophyMilestone {
  id: string;
  trophiesRequired: number;
  icon: any;
  badgeEmoji: string;
  title: string;
  rewardType: 'badge' | 'perk' | 'cosmetic' | 'title';
  description: string;
  unlockedPerkText: string;
}

export const TROPHY_MILESTONES: TrophyMilestone[] = [
  {
    id: 'bronze_gladiator',
    trophiesRequired: 100,
    icon: 'shield-star',
    badgeEmoji: '🥉',
    title: 'Bronze Gladiator',
    rewardType: 'badge',
    description: 'Freischaltung der Bronze Arena und Gladiator-Badge (ca. 4 Titan-Siege)',
    unlockedPerkText: 'Bronze Arena & Abzeichen',
  },
  {
    id: 'tactic_upgrade_1',
    trophiesRequired: 250,
    icon: 'disc',
    badgeEmoji: '🥈',
    title: 'Taktik-Upgrade (+1 Start-Plate)',
    rewardType: 'perk',
    description: 'Starte jedes Workout dauerhaft mit 1 statt 0 Start-Plates! (ca. 10 Workouts)',
    unlockedPerkText: '+1 Start-Plate (Dauerhaft)',
  },
  {
    id: 'silver_card_frame',
    trophiesRequired: 500,
    icon: 'shield-outline',
    badgeEmoji: '🛡️',
    title: 'Silber Veteran Frame',
    rewardType: 'cosmetic',
    description: 'Silber-Glanz Rahmen für deine 1★-Einheiten (ca. 20 Workouts)',
    unlockedPerkText: 'Silber-Rahmen aktiviert',
  },
  {
    id: 'gold_card_frame',
    trophiesRequired: 1000,
    icon: 'card-bulleted',
    badgeEmoji: '🥇',
    title: 'Gold Card Frame',
    rewardType: 'cosmetic',
    description: 'Exklusiver Gold-Rahmen für alle 2★-Karten (ca. 40 Workouts)',
    unlockedPerkText: 'Gold-Rahmen aktiviert',
  },
  {
    id: 'titan_prismatic_foil',
    trophiesRequired: 1750,
    icon: 'creation',
    badgeEmoji: '💎',
    title: 'Titan Prismatic Foil',
    rewardType: 'cosmetic',
    description: 'Holografischer Glanz für 3★-Titan-Karten (ca. 70 Workouts)',
    unlockedPerkText: 'Holo-Prism Frame',
  },
  {
    id: 'iron_tactician',
    trophiesRequired: 2500,
    icon: 'crown',
    badgeEmoji: '👑',
    title: 'Iron Tactician',
    rewardType: 'title',
    description: 'Freischaltung der Challenger-Arena & Titel (ca. 100 Workouts)',
    unlockedPerkText: 'Challenger Rang & Titel',
  },
  {
    id: 'diamond_boss_slayer',
    trophiesRequired: 3200,
    icon: 'sword-cross',
    badgeEmoji: '⚔️',
    title: 'Shadow Titan Slayer',
    rewardType: 'badge',
    description: 'Meister-Emblem für wahre Auto-Battler Titanen (ca. 128 Workouts)',
    unlockedPerkText: 'Titan Slayer Emblem',
  },
  {
    id: 'legendary_iron_god',
    trophiesRequired: 3750,
    icon: 'fire',
    badgeEmoji: '⚡',
    title: 'Legendary Iron God',
    rewardType: 'title',
    description: 'Höchster erreichbarer Taktiker-Rang! (ca. 150 stramme Trainings absolviert)',
    unlockedPerkText: 'Gott des Eisens Status',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const TrophyRoadModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44);

  const trophies = useAutoChessStore(state => state.trophies);
  const trophyMilestonesClaimed = useAutoChessStore(state => state.trophyMilestonesClaimed || []);
  const claimTrophyMilestone = useAutoChessStore(state => (state as any).claimTrophyMilestone);

  // Find next milestone
  const nextMilestone = TROPHY_MILESTONES.find(m => m.trophiesRequired > trophies);
  const currentProgressPct = nextMilestone
    ? Math.min(100, Math.round((trophies / nextMilestone.trophiesRequired) * 100))
    : 100;

  const handleClaim = (milestone: TrophyMilestone) => {
    if (claimTrophyMilestone) {
      claimTrophyMilestone(milestone.id);
      triggerSuccess();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={[styles.header, { paddingTop: topInset + 6 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Trophäen-Pfad 🏆</Text>
            <Text style={styles.headerSubtitle}>Iron Tactics Ranglisten-Belohnungen</Text>
          </View>
          <View style={styles.trophyCountBadge}>
            <Text style={styles.trophyText}>🏆 {trophies}</Text>
          </View>
        </View>

        {/* Big Progress Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>AKTUELLER STATUS</Text>
              <Text style={styles.summaryRankText}>
                {trophies >= 3750 ? '⚡ Legendary Iron God' : trophies >= 2500 ? '👑 Challenger Tactician' : trophies >= 1000 ? '🥇 Gold Veteran' : trophies >= 250 ? '🥈 Silber Kämpfer' : trophies >= 100 ? '🥉 Bronze Gladiator' : 'Gym Rookie'}
              </Text>
            </View>
            <View style={styles.nextInfoRight}>
              <Text style={styles.nextLabel}>NÄCHSTES ZIEL</Text>
              <Text style={styles.nextValueText}>
                {nextMilestone ? `${nextMilestone.trophiesRequired} 🏆` : 'MAX LEVEL'}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${currentProgressPct}%` }]} />
          </View>
          <View style={styles.progressSubRow}>
            <Text style={styles.progressSubText}>{trophies} 🏆 erreicht</Text>
            {nextMilestone && (
              <Text style={styles.progressSubRemaining}>
                Noch {nextMilestone.trophiesRequired - trophies} 🏆 bis {nextMilestone.title}
              </Text>
            )}
          </View>
        </View>

        {/* Milestones Vertical Road */}
        <ScrollView style={styles.roadScroll} contentContainerStyle={styles.roadContent} showsVerticalScrollIndicator={false}>
          {TROPHY_MILESTONES.map((m, idx) => {
            const isReached = trophies >= m.trophiesRequired;
            const isClaimed = trophyMilestonesClaimed.includes(m.id);
            const canClaim = isReached && !isClaimed;

            return (
              <View key={m.id} style={styles.milestoneRow}>
                {/* Vertical Road Line & Node */}
                <View style={styles.roadLineContainer}>
                  <View style={[styles.roadNode, isReached ? styles.roadNodeReached : styles.roadNodeLocked]}>
                    <Text style={styles.nodeEmoji}>{m.badgeEmoji}</Text>
                  </View>
                  {idx < TROPHY_MILESTONES.length - 1 && (
                    <View style={[styles.verticalLine, isReached ? styles.verticalLineActive : styles.verticalLineInactive]} />
                  )}
                </View>

                {/* Milestone Reward Card */}
                <View style={[styles.milestoneCard, isReached ? styles.milestoneCardReached : styles.milestoneCardLocked]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <MaterialCommunityIcons 
                        name={m.icon} 
                        size={18} 
                        color={isReached ? '#FFD700' : '#8E8E93'} 
                        style={{ marginRight: 6 }} 
                      />
                      <Text style={[styles.milestoneTitle, isReached && { color: '#FFFFFF' }]}>
                        {m.title}
                      </Text>
                    </View>
                    <View style={[styles.reqBadge, isReached && styles.reqBadgeReached]}>
                      <Text style={[styles.reqBadgeText, isReached && { color: '#FFD700' }]}>
                        {m.trophiesRequired} 🏆
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.milestoneDesc}>{m.description}</Text>

                  {/* Footer status / Claim button */}
                  <View style={styles.cardFooter}>
                    <Text style={[styles.perkTag, isReached && { color: '#30D158' }]}>
                      ✨ {m.unlockedPerkText}
                    </Text>

                    {canClaim ? (
                      <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(m)}>
                        <Text style={styles.claimBtnText}>Einsammeln 🎉</Text>
                      </TouchableOpacity>
                    ) : isClaimed ? (
                      <View style={styles.claimedBadge}>
                        <MaterialCommunityIcons name="check" size={14} color="#30D158" style={{ marginRight: 2 }} />
                        <Text style={styles.claimedText}>Aktiv</Text>
                      </View>
                    ) : (
                      <Text style={styles.lockedText}>Noch {m.trophiesRequired - trophies} 🏆</Text>
                    )}
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
    backgroundColor: '#09090D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#20202A',
  },
  backBtn: {
    padding: 6,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#8E8E93',
    fontSize: 10.5,
    fontWeight: '600',
  },
  trophyCountBadge: {
    backgroundColor: '#1E1E28',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD70060',
  },
  trophyText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryCard: {
    backgroundColor: '#13131A',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242430',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryRankText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  nextInfoRight: {
    alignItems: 'flex-end',
  },
  nextLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
  },
  nextValueText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#202028',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSubText: {
    color: '#A0A0AA',
    fontSize: 10,
    fontWeight: '700',
  },
  progressSubRemaining: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  roadScroll: {
    flex: 1,
  },
  roadContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  milestoneRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  roadLineContainer: {
    width: 44,
    alignItems: 'center',
  },
  roadNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  roadNodeReached: {
    backgroundColor: '#222216',
    borderColor: '#FFD700',
  },
  roadNodeLocked: {
    backgroundColor: '#141418',
    borderColor: '#2A2A35',
  },
  nodeEmoji: {
    fontSize: 16,
  },
  verticalLine: {
    width: 3,
    flex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  verticalLineActive: {
    backgroundColor: '#FFD70080',
  },
  verticalLineInactive: {
    backgroundColor: '#1E1E26',
  },
  milestoneCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginLeft: 10,
    borderWidth: 1,
  },
  milestoneCardReached: {
    backgroundColor: '#14141E',
    borderColor: '#FFD70040',
  },
  milestoneCardLocked: {
    backgroundColor: '#0F0F14',
    borderColor: '#1C1C24',
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  milestoneTitle: {
    color: '#A0A0AA',
    fontSize: 13,
    fontWeight: '800',
  },
  reqBadge: {
    backgroundColor: '#1C1C24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#2E2E38',
  },
  reqBadgeReached: {
    backgroundColor: '#FFD70020',
    borderColor: '#FFD70060',
  },
  reqBadgeText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '900',
  },
  milestoneDesc: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#242430',
  },
  perkTag: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
  },
  claimBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  claimBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#30D15820',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#30D158',
  },
  claimedText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
  },
  lockedText: {
    color: '#6E6E78',
    fontSize: 10,
    fontWeight: '700',
  },
});
