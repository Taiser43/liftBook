import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { AUTO_CHESS_ITEMS, RARITY_THEMES } from '../../constants/autoChessItems';
import { getTimeUntilMidnight, DailyShopOffer } from '../../engine/ironTactics/dailyShopEngine';
import { triggerSuccess, triggerWarning } from '../../utils/haptics';

const COSMETIC_FRAMES = [
  { id: 'frame_cyber_neon', name: 'Cyber-Neon', color: '#00D2FF', costEisen: 350 },
  { id: 'frame_flame_gold', name: 'Goldene Flamme', color: '#FFD700', costEisen: 600 },
  { id: 'frame_emerald_glow', name: 'Smaragd-Aura', color: '#30D158', costEisen: 400 },
  { id: 'frame_prismatic', name: 'Prismatic Titan', color: '#BF5AF2', costEisen: 1000 },
];

export const GameShopScreen: React.FC = () => {
  const {
    eisen,
    addEisen,
    codex,
    unlockItemBlueprint,
    ownedFrames,
    equippedFrame,
    setEquippedFrame,
    dailyShop,
    refreshDailyShopIfNeeded,
    buyDailyCardOffer,
  } = useIronTacticsMetaStore();

  const [countdown, setCountdown] = useState(getTimeUntilMidnight());

  // Ensure daily shop is initialized & tick countdown to midnight
  useEffect(() => {
    refreshDailyShopIfNeeded();

    const interval = setInterval(() => {
      const nextTime = getTimeUntilMidnight();
      setCountdown(nextTime);

      // Midnight threshold reached: automatically refresh shop offers
      if (nextTime.totalMs <= 1000) {
        refreshDailyShopIfNeeded(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleBuyCardFragments = (offer: DailyShopOffer) => {
    if (offer.purchased) {
      triggerWarning();
      Alert.alert('Bereits gekauft', 'Dieses Tagesangebot hast du heute bereits gekauft. Neuer Reset um 24:00 Uhr!');
      return;
    }

    if (eisen < offer.costEisen) {
      triggerWarning();
      Alert.alert('Nicht genug Eisen', `Du benötigst ${offer.costEisen} Eisen (aktuell: ${eisen}).`);
      return;
    }

    const result = buyDailyCardOffer(offer.id);
    if (result.success) {
      triggerSuccess();
      Alert.alert('Kauf erfolgreich', result.message);
    } else {
      triggerWarning();
      Alert.alert('Hinweis', result.message);
    }
  };

  const handleBuyBlueprint = (itemId: string, costEisen: number, itemName: string) => {
    if (eisen < costEisen) {
      triggerWarning();
      Alert.alert('Nicht genug Eisen', `Du benötigst ${costEisen} Eisen.`);
      return;
    }
    addEisen(-costEisen);
    unlockItemBlueprint(itemId);
    triggerSuccess();
    Alert.alert('Blaupause freigeschaltet!', `„${itemName}“ ist ab sofort dauerhaft in deinem Run-Pool.`);
  };

  const handleFrameAction = (frameId: string, costEisen: number) => {
    const isOwned = ownedFrames.includes(frameId);
    if (isOwned) {
      setEquippedFrame(frameId);
      triggerSuccess();
      return;
    }
    if (eisen < costEisen) {
      triggerWarning();
      Alert.alert('Nicht genug Eisen', `Du benötigst ${costEisen} Eisen.`);
      return;
    }
    addEisen(-costEisen);
    useIronTacticsMetaStore.setState(state => ({
      ownedFrames: [...state.ownedFrames, frameId],
      equippedFrame: frameId,
    }));
    triggerSuccess();
  };

  // Locked items for blueprint section
  const lockedItems = AUTO_CHESS_ITEMS.filter(it => !codex.includes(it.id));
  const offers = dailyShop?.offers || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Fitness Guarantee Notice */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeIcon}>🥤</Text>
        <Text style={styles.noticeText}>
          <Text style={{ fontWeight: '900', color: '#FFF' }}>Protein-Shakes sind unverkäuflich.</Text>{' '}
          Sie können ausschließlich durch echtes Training, Ernährung & Cardio verdient werden.
        </Text>
      </View>

      {/* 1. Daily Card Fragment Deals with Midnight 24:00 countdown */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionHeading}>TAGESANGEBOTE · 4 KARTEN</Text>
          <Text style={styles.sectionSubHeading}>Aus deinen eigenen Übungen & aktivem Trainingsplan</Text>
        </View>
        <View style={styles.timerBadge}>
          <MaterialCommunityIcons name="clock-outline" size={13} color="#FFD700" />
          <Text style={styles.timerBadgeText}>Reset um 24:00 ({countdown.hours}h {countdown.minutes}m)</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        {offers.map(offer => {
          const isPurchased = offer.purchased;
          const canAfford = eisen >= offer.costEisen;

          // Color & tag based on exercise origin
          const sourceBadge =
            offer.source === 'custom'
              ? { label: 'Eigene Übung', bg: '#00D2FF20', text: '#00D2FF', border: '#00D2FF50' }
              : offer.source === 'active_tp'
              ? { label: 'Aktiver Plan', bg: '#30D15820', text: '#30D158', border: '#30D15850' }
              : { label: 'Standard', bg: '#8E8E9F20', text: '#8E8E9F', border: '#8E8E9F40' };

          return (
            <View
              key={offer.id}
              style={[
                styles.offerCard,
                isPurchased && styles.offerCardPurchased,
              ]}
            >
              {/* Top Source Chip */}
              <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bg, borderColor: sourceBadge.border }]}>
                <Text style={[styles.sourceBadgeText, { color: sourceBadge.text }]}>{sourceBadge.label}</Text>
              </View>

              {/* Artwork or Icon */}
              <View style={styles.offerArtBox}>
                {offer.imageUri ? (
                  <Image source={{ uri: offer.imageUri }} style={styles.offerArtImage} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="dumbbell" size={26} color="#00D2FF" />
                )}
              </View>

              <Text style={styles.offerCategory}>
                {offer.category}{offer.targetMuscle && offer.targetMuscle !== 'Standard' ? ` · ${offer.targetMuscle}` : ''}
              </Text>
              <Text style={styles.offerCardTitle} numberOfLines={2}>{offer.name}</Text>

              {/* Fragment reward */}
              <View style={styles.fragChip}>
                <MaterialCommunityIcons name="puzzle" size={14} color="#00D2FF" />
                <Text style={styles.fragChipText}>+ {offer.fragments} Fragmente</Text>
              </View>

              {/* Buy button */}
              <TouchableOpacity
                style={[
                  styles.buyBtn,
                  isPurchased ? styles.buyBtnPurchased : !canAfford ? styles.buyBtnDisabled : null,
                ]}
                onPress={() => handleBuyCardFragments(offer)}
                disabled={isPurchased}
                activeOpacity={0.8}
              >
                {isPurchased ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="check" size={14} color="#8E8E9F" />
                    <Text style={styles.buyBtnPurchasedText}>Gekauft ✓</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="nut" size={14} color="#000" />
                    <Text style={styles.buyBtnText}>{offer.costEisen} Eisen</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* 2. Item Blueprints */}
      <Text style={[styles.sectionHeading, { marginTop: 22 }]}>ITEM-BLAUPAUSEN ({lockedItems.length} noch unentdeckt)</Text>
      <View style={{ gap: 8, marginTop: 6 }}>
        {lockedItems.slice(0, 3).map(item => {
          const theme = RARITY_THEMES[item.rarity];
          const cost = item.rarity === 'epic' ? 450 : item.rarity === 'rare' ? 250 : 150;

          return (
            <View key={item.id} style={[styles.bpRow, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              <View style={[styles.bpIconBox, { backgroundColor: `${theme.color}25` }]}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={theme.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bpName, { color: theme.color }]}>{item.name}</Text>
                <Text style={styles.bpDesc}>{item.description}</Text>
              </View>
              <TouchableOpacity
                style={[styles.bpBuyBtn, eisen < cost && styles.buyBtnDisabled]}
                onPress={() => handleBuyBlueprint(item.id, cost, item.name)}
              >
                <MaterialCommunityIcons name="nut" size={13} color="#000" />
                <Text style={styles.bpBuyBtnText}>{cost}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* 3. Cosmetic Frames */}
      <Text style={[styles.sectionHeading, { marginTop: 22 }]}>KARTENRAHMEN (KOSMETIK)</Text>
      <View style={styles.gridRow}>
        {COSMETIC_FRAMES.map(f => {
          const isOwned = ownedFrames.includes(f.id);
          const isEquipped = equippedFrame === f.id;

          return (
            <View key={f.id} style={[styles.frameCard, { borderColor: f.color }]}>
              <View style={[styles.framePreview, { borderColor: f.color }]}>
                <Text style={{ fontSize: 24 }}>🃏</Text>
              </View>
              <Text style={styles.frameName}>{f.name}</Text>
              <TouchableOpacity
                style={[
                  styles.frameBtn,
                  isEquipped ? styles.frameBtnEquipped : isOwned ? styles.frameBtnOwned : styles.frameBtnBuy,
                ]}
                onPress={() => handleFrameAction(f.id, f.costEisen)}
              >
                <Text style={[styles.frameBtnText, (isEquipped || !isOwned) && { color: '#000' }]}>
                  {isEquipped ? 'Aktiv' : isOwned ? 'Anlegen' : `🔩 ${f.costEisen}`}
                </Text>
              </TouchableOpacity>
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
    paddingBottom: 40,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161322',
    borderWidth: 1,
    borderColor: '#BF5AF240',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  noticeIcon: {
    fontSize: 22,
  },
  noticeText: {
    flex: 1,
    color: '#B0B0C4',
    fontSize: 11,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionSubHeading: {
    color: '#8E8E9F',
    fontSize: 10,
    marginTop: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262215',
    borderWidth: 1,
    borderColor: '#FFD70040',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  timerBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  offerCard: {
    width: '48.5%',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#26263A',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  offerCardPurchased: {
    opacity: 0.6,
    backgroundColor: '#0E0E14',
    borderColor: '#1C1C26',
  },
  sourceBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  offerArtBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  offerArtImage: {
    width: '100%',
    height: '100%',
  },
  offerCategory: {
    color: '#8E8E9F',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  offerCardTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
    minHeight: 28,
  },
  fragChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginVertical: 6,
    gap: 4,
  },
  fragChipText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF',
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  buyBtnDisabled: {
    backgroundColor: '#26333C',
    opacity: 0.6,
  },
  buyBtnPurchased: {
    backgroundColor: '#1E1E28',
    borderWidth: 1,
    borderColor: '#2D2D3E',
  },
  buyBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  buyBtnPurchasedText: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '800',
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  bpIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpName: {
    fontSize: 13,
    fontWeight: '800',
  },
  bpDesc: {
    color: '#8E8E9F',
    fontSize: 10.5,
    marginTop: 1,
  },
  bpBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  bpBuyBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  frameCard: {
    width: '48.5%',
    backgroundColor: '#14141E',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  framePreview: {
    width: 54,
    height: 64,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#0E0E14',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  frameName: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 2,
  },
  frameBtn: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  frameBtnBuy: {
    backgroundColor: '#00D2FF',
  },
  frameBtnOwned: {
    backgroundColor: '#26263A',
  },
  frameBtnEquipped: {
    backgroundColor: '#30D158',
  },
  frameBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
});
