import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AutoChessUnit, AutoChessCardData, MuscleCategory, useAutoChessStore } from '../../store/useAutoChessStore';
import { WeightPlateIcon, getOlympicPlateColor } from './WeightPlateIcon';

interface Props {
  data: AutoChessUnit | AutoChessCardData;
  isShop?: boolean;
  isBoard?: boolean;
  size?: 'compact' | 'medium' | 'large';
  onPress?: () => void;
  onLongPress?: () => void;
  overrideHp?: number;
  isAttacking?: boolean;
  isHit?: boolean;
  isDead?: boolean;
  floatingDmg?: { text: string; isCrit?: boolean } | null;
  upgradeAvailable?: 'lvl2' | 'lvl3' | 'owned' | null;
  synergyHint?: string | null;
}

export const CATEGORY_THEME: Record<MuscleCategory, { title: string; color: string; icon: any; dot: string }> = {
  Chest: { title: 'Brust', color: '#F43F5E', icon: 'dumbbell', dot: '🔴' },
  Back: { title: 'Rücken', color: '#0284C7', icon: 'human-handsdown', dot: '🔵' },
  Arms: { title: 'Arme', color: '#A855F7', icon: 'arm-flex', dot: '🟣' },
  Shoulders: { title: 'Schulter', color: '#EAB308', icon: 'bullseye-arrow', dot: '🟡' },
  Legs: { title: 'Beine', color: '#10B981', icon: 'shield-check', dot: '🟢' },
  Core: { title: 'Core', color: '#E2E8F0', icon: 'circle-opacity', dot: '⚪' },
};

export const AutoChessCard: React.FC<Props> = React.memo(({
  data,
  isShop = false,
  isBoard = false,
  size = 'medium',
  onPress,
  onLongPress,
  overrideHp,
  isAttacking = false,
  isHit = false,
  isDead = false,
  floatingDmg = null,
  upgradeAvailable = null,
  synergyHint = null,
}) => {
  const isUnit = 'stars' in data;
  const stars: 1 | 2 | 3 = isUnit ? (data as AutoChessUnit).stars : 1;
  const rawHp = isUnit ? (data as AutoChessUnit).hp : (data as AutoChessCardData).baseHp;
  const currentHp = overrideHp !== undefined ? Math.max(0, overrideHp) : rawHp;
  const maxHp = isUnit ? (data as AutoChessUnit).maxHp : (data as AutoChessCardData).baseHp;
  const currentAtk = isUnit ? (data as AutoChessUnit).atk : (data as AutoChessCardData).baseAtk;

  const theme = CATEGORY_THEME[data.category] || CATEGORY_THEME.Chest;
  const isBossUnit = !!data.isBossUnit;

  // Pulse animation for upgrade available badge
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (upgradeAvailable === 'lvl2' || upgradeAvailable === 'lvl3') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [upgradeAvailable]);

  const trophies = useAutoChessStore(state => state.trophies);
  const trophyMilestonesClaimed = useAutoChessStore(state => state.trophyMilestonesClaimed || []);
  const hasSilverFrame = trophies >= 500 || trophyMilestonesClaimed.includes('silver_card_frame');
  const hasGoldFrame = trophies >= 1000 || trophyMilestonesClaimed.includes('gold_card_frame');
  const hasTitanPrismatic = trophies >= 1750 || trophyMilestonesClaimed.includes('titan_prismatic_foil');

  // Star styling
  const is2Star = stars === 2;
  const is3Star = stars === 3;
  const isUpgradable = upgradeAvailable === 'lvl2' || upgradeAvailable === 'lvl3';

  let borderColor = theme.color;
  let shadowColor = theme.color;
  let shadowRadius = isUpgradable ? 7 : 3;
  let shadowOpacity = isUpgradable ? 0.7 : 0.2;
  let borderWidth = 1.5;

  if (isBossUnit) {
    borderColor = '#C084FC'; // Vivid purple neon for Shadow Boss
    shadowColor = '#A855F7';
    borderWidth = 2.5;
  } else if (is3Star || upgradeAvailable === 'lvl3') {
    borderColor = hasTitanPrismatic ? '#00F2FE' : '#00F0FF';
    shadowColor = hasTitanPrismatic ? '#00F2FE' : '#00F0FF';
    shadowRadius = hasTitanPrismatic ? 10 : 6;
    shadowOpacity = hasTitanPrismatic ? 0.85 : 0.6;
    borderWidth = 2.5;
  } else if (is2Star || upgradeAvailable === 'lvl2') {
    borderColor = '#FFD700'; // Gold for 2-Star
    shadowColor = '#FFD700';
    shadowRadius = hasGoldFrame ? 8 : 4;
    shadowOpacity = hasGoldFrame ? 0.75 : 0.4;
    borderWidth = hasGoldFrame ? 2.5 : 2;
  } else if (upgradeAvailable === 'owned') {
    borderColor = '#38BDF8';
    shadowColor = '#38BDF8';
  } else if (hasSilverFrame && !isShop && stars === 1) {
    // Unlocked Silver Veteran Frame for 1★ Units
    borderColor = '#C0C0C0';
    shadowColor = '#A8B5C8';
    shadowRadius = 5;
    shadowOpacity = 0.55;
    borderWidth = 2;
  }

  // Dimension scaling
  const isCompact = size === 'compact';
  const isLarge = size === 'large';

  const cardWidth = isCompact ? 104 : isLarge ? 260 : 140;
  const cardHeight = isCompact ? 148 : isLarge ? 340 : 195;
  const artHeight = isCompact ? 52 : isLarge ? 130 : 75;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          minHeight: cardHeight,
          borderColor: borderColor,
          borderWidth: borderWidth,
          shadowColor: shadowColor,
          shadowRadius: shadowRadius,
          shadowOpacity: shadowOpacity,
        },
      ]}
    >
      {/* Floating Level Upgrade Badge in Shop */}
      {isShop && upgradeAvailable && (
        <Animated.View
          style={[
            styles.upgradeFloatingBadge,
            upgradeAvailable === 'lvl3'
              ? styles.upgradeBadgeLvl3
              : upgradeAvailable === 'lvl2'
              ? styles.upgradeBadgeLvl2
              : styles.upgradeBadgeOwned,
            (upgradeAvailable === 'lvl2' || upgradeAvailable === 'lvl3') && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={
              upgradeAvailable === 'lvl3'
                ? 'crown'
                : upgradeAvailable === 'lvl2'
                ? 'arrow-up-bold-circle'
                : 'check-circle-outline'
            }
            size={11}
            color={upgradeAvailable === 'owned' ? '#38BDF8' : '#000000'}
          />
          <Text
            style={[
              styles.upgradeFloatingText,
              upgradeAvailable === 'owned' && { color: '#38BDF8' },
            ]}
          >
            {upgradeAvailable === 'lvl3'
              ? 'LVL 3 BEREIT!'
              : upgradeAvailable === 'lvl2'
              ? 'LVL 2 BEREIT!'
              : 'IM TEAM'}
          </Text>
        </Animated.View>
      )}

      {/* Top Header */}
      <View style={styles.topHeader}>
        {isBossUnit ? (
          <View style={[styles.catBadge, { backgroundColor: '#A855F730', borderColor: '#C084FC' }]}>
            <Text style={[styles.catBadgeText, { color: '#C084FC' }]}>👑 BOSS</Text>
          </View>
        ) : is3Star && hasTitanPrismatic ? (
          <View style={[styles.catBadge, { backgroundColor: '#00F2FE25', borderColor: '#00F2FE90' }]}>
            <Text style={[styles.catBadgeText, { color: '#00F2FE' }]}>✨ TITAN FOIL</Text>
          </View>
        ) : (
          <View style={[styles.catBadge, { backgroundColor: `${theme.color}25`, borderColor: `${theme.color}60` }]}>
            <Text style={[styles.catBadgeText, { color: theme.color }]}>
              {theme.dot} {theme.title}
            </Text>
          </View>
        )}

        {isShop ? (
          <WeightPlateIcon
            size={isCompact ? 19 : isLarge ? 28 : 22}
            color={getOlympicPlateColor(data.cost)}
            label={data.cost}
          />
        ) : (
          <View style={styles.rightHeaderGroup}>
            <WeightPlateIcon
              size={isCompact ? 19 : isLarge ? 28 : 22}
              color={getOlympicPlateColor(data.cost)}
              label={data.cost}
            />
            <View style={styles.starsRow}>
              {stars >= 1 && <Text style={[styles.starIcon, is2Star || is3Star ? styles.starGold : null]}>★</Text>}
              {stars >= 2 && <Text style={[styles.starIcon, styles.starGold]}>★</Text>}
              {stars >= 3 && <Text style={[styles.starIcon, styles.starTitan]}>★</Text>}
            </View>
          </View>
        )}
      </View>

      {/* Exercise Title */}
      <Text style={[styles.exerciseName, isCompact && { fontSize: 11 }]} numberOfLines={isCompact ? 1 : 2}>
        {data.exerciseName}
      </Text>

      {/* Middle Artwork Window (Image or Procedural Vector Art) */}
      <View style={[styles.artWindow, { height: artHeight, backgroundColor: '#141418' }]}>
        {data.imageUri ? (
          <Image source={{ uri: data.imageUri }} style={styles.artImage} resizeMode="cover" />
        ) : (
          <View style={styles.proceduralContainer}>
            {/* Ambient Background Glow */}
            <View style={[styles.ambientGlow, { backgroundColor: `${theme.color}20` }]} />
            
            {/* Center Vector Icon */}
            <MaterialCommunityIcons 
              name={theme.icon} 
              size={isCompact ? 28 : isLarge ? 54 : 36} 
              color={theme.color} 
            />

            {/* PR Badge Overlay (if not compact) */}
            {!isCompact && (
              <View style={styles.prBadgeOverlay}>
                <Text style={styles.prBadgeText}>
                  🏆 {data.maxWeight > 0 ? `${data.maxWeight} KG PR` : `${data.totalSets} Sets`}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Health Bar (In Combat or On Board) */}
      {isBoard && maxHp > 0 && (
        <View style={styles.hpBarTrack}>
          <View style={[styles.hpBarFill, { width: `${Math.min(100, Math.max(0, (currentHp / maxHp) * 100))}%` }]} />
        </View>
      )}

      {/* Synergy Hint Badge in Shop */}
      {isShop && synergyHint && (
        <View style={[styles.synergyShopBadge, { backgroundColor: `${theme.color}25`, borderColor: theme.color }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={10} color={theme.color} />
          <Text style={[styles.synergyShopBadgeText, { color: theme.color }]}>
            {synergyHint}
          </Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>ATK</Text>
          <Text style={[styles.statValue, { color: '#F43F5E' }]}>{currentAtk}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>HP</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{currentHp}</Text>
        </View>
      </View>

      {/* Equipped Items Badges (up to 2 items) */}
      {isUnit && (data as AutoChessUnit).items && (data as AutoChessUnit).items!.length > 0 && (
        <View style={styles.cardItemsRow}>
          {(data as AutoChessUnit).items!.map((it, idx) => {
            const itemColor = it.rarity === 'epic' ? '#BF5AF2' : it.rarity === 'rare' ? '#0A84FF' : '#E0E0E6';
            return (
              <View 
                key={`${it.id}_${idx}`} 
                style={[
                  styles.cardItemBadge, 
                  { borderColor: itemColor, backgroundColor: `${itemColor}20` }
                ]}
              >
                <MaterialCommunityIcons name={it.icon as any} size={isCompact ? 9 : 11} color={itemColor} />
                {!isCompact && (
                  <Text style={[styles.cardItemBadgeText, { color: itemColor }]} numberOfLines={1}>
                    {it.name.split(' ')[0]}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Trait Footer (for large or medium) */}
      {!isCompact && (
        <View style={styles.traitFooter}>
          <Text style={styles.traitName} numberOfLines={1}>
            ⚡ {data.traitName}
          </Text>
        </View>
      )}

      {/* Floating Damage Popup Badge */}
      {floatingDmg && (
        <View style={[styles.floatingDmgContainer, floatingDmg.isCrit && styles.critDmgContainer]}>
          <Text style={[styles.floatingDmgText, floatingDmg.isCrit && styles.critDmgText]}>
            {floatingDmg.isCrit ? '🔥 CRIT ' : '💥 '}{floatingDmg.text}
          </Text>
        </View>
      )}

      {/* K.O. Dead Overlay */}
      {isDead && (
        <View style={styles.deadOverlay}>
          <MaterialCommunityIcons name="skull" size={32} color="#FF453A" />
          <Text style={styles.deadText}>K.O.</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0E0E12',
    borderRadius: 14,
    padding: 8,
    marginHorizontal: 3,
    marginVertical: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  plateNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#181822',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  plateNumberBadgeCompact: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
  },
  plateNumberBadgeLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  plateNumberText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  plateNumberTextCompact: {
    fontSize: 9.5,
  },
  plateNumberTextLarge: {
    fontSize: 14,
  },
  costBadge: {
    backgroundColor: '#FFD70025',
    borderColor: '#FFD70060',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  costBadgeText: {
    color: '#FFD700',
    fontSize: 9.5,
    fontWeight: '900',
  },
  rightHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  powerBadge: {
    backgroundColor: '#1E1E28',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#36364A',
  },
  powerBadgeText: {
    color: '#FFD700',
    fontSize: 8.5,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 11,
    color: '#8E8E93',
    marginHorizontal: 0.5,
  },
  starGold: {
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  starTitan: {
    color: '#00F0FF',
    textShadowColor: 'rgba(0, 240, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  artWindow: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#24242A',
    marginBottom: 6,
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  proceduralContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  prBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: '#FFD70050',
  },
  prBadgeText: {
    color: '#FFD700',
    fontSize: 8.5,
    fontWeight: '800',
  },
  hpBarTrack: {
    height: 4,
    backgroundColor: '#2A2A30',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: '#30D158',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#18181E',
    borderRadius: 6,
    paddingVertical: 3,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2A2A35',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 7.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  traitFooter: {
    marginTop: 4,
    backgroundColor: '#14141A',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  traitName: {
    color: '#FFD700',
    fontSize: 8.5,
    fontWeight: '700',
  },
  floatingDmgContainer: {
    position: 'absolute',
    top: '30%',
    left: 4,
    right: 4,
    backgroundColor: '#FF453AE6',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 99,
  },
  critDmgContainer: {
    backgroundColor: '#FF9500F0',
    borderColor: '#FFD700',
    borderWidth: 1.5,
    shadowColor: '#FFD700',
  },
  floatingDmgText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  critDmgText: {
    color: '#000000',
    fontWeight: '900',
  },
  deadOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(10, 10, 14, 0.85)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  deadText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },
  upgradeFloatingBadge: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  upgradeBadgeLvl2: {
    backgroundColor: '#FFD700',
    borderColor: '#FFFFFF',
    shadowColor: '#FFD700',
  },
  upgradeBadgeLvl3: {
    backgroundColor: '#00F0FF',
    borderColor: '#FFFFFF',
    shadowColor: '#00F0FF',
  },
  upgradeBadgeOwned: {
    backgroundColor: '#0B1E2E',
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
  },
  upgradeFloatingText: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  artUpgradePill: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 0.8,
    borderColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    zIndex: 10,
  },
  artUpgradeText: {
    color: '#FFD700',
    fontSize: 7.5,
    fontWeight: '800',
  },
  synergyShopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  synergyShopBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginLeft: 2,
  },
  cardItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2,
    marginBottom: 2,
  },
  cardItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
    gap: 2,
  },
  cardItemBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
  },
});
