import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAutoChessStore, MuscleCategory, AutoChessUnit } from '../../store/useAutoChessStore';
import { AutoChessCard, CATEGORY_THEME } from './AutoChessCard';
import { WeightPlateIcon } from './WeightPlateIcon';
import { AutoChessItem, RARITY_THEMES } from '../../constants/autoChessItems';
import { triggerSuccess, triggerLight, triggerWarning } from '../../utils/haptics';

export const AutoChessShop: React.FC = () => {
  const {
    coins,
    shop,
    shopItem,
    itemInventory,
    isShopLocked,
    buyShopCard,
    buyShopItem,
    equipItem,
    useConsumableItem,
    rerollShop,
    toggleShopLock,
    round,
    board,
    bench,
    activeWaveBonusStacks,
    pendingWaveBonusStacks,
  } = useAutoChessStore();

  const [selectedInventoryItem, setSelectedInventoryItem] = useState<AutoChessItem | null>(null);

  // Animation values for the 3 shop card slots
  const cardScaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const cardOpacityAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const isAnimatingRef = useRef(false);

  // Helper to determine if buying a card enables Level 2 (2★) or Level 3 (3★)
  const getUpgradeStatus = (cardId: string): 'lvl2' | 'lvl3' | 'owned' | null => {
    let oneStarCount = 0;
    let twoStarCount = 0;

    board.forEach(u => {
      if (u && u.cardId === cardId) {
        if (u.stars === 1) oneStarCount++;
        else if (u.stars === 2) twoStarCount++;
      }
    });

    bench.forEach(u => {
      if (u && u.cardId === cardId) {
        if (u.stars === 1) oneStarCount++;
        else if (u.stars === 2) twoStarCount++;
      }
    });

    if (twoStarCount >= 1 && oneStarCount >= 1) return 'lvl3';
    if (oneStarCount >= 1) return 'lvl2';
    if (twoStarCount >= 1) return 'owned';
    return null;
  };

  // Helper to determine if buying a card activates/advances a category synergy
  const getSynergyStatus = (category: MuscleCategory): string | null => {
    const boardCount = board.filter(u => u !== null && u.category === category).length;
    const catTitle = CATEGORY_THEME[category]?.title.toUpperCase() || category;
    if (boardCount === 1) {
      return `+1 ${catTitle} (2)`;
    }
    if (boardCount === 2) {
      return `MAX ${catTitle} (3)`;
    }
    return null;
  };

  // Pop-in spring animation for fresh cards
  const playPopInAnimation = () => {
    cardScaleAnims.forEach(anim => anim.setValue(0.6));
    cardOpacityAnims.forEach(anim => anim.setValue(0));

    Animated.stagger(
      50,
      [0, 1, 2].map(i =>
        Animated.parallel([
          Animated.spring(cardScaleAnims[i], {
            toValue: 1,
            friction: 5.5,
            tension: 85,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacityAnims[i], {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ])
      )
    ).start(() => {
      isAnimatingRef.current = false;
    });
  };

  // Trigger pop-in when round changes
  const prevRoundRef = useRef(round);
  useEffect(() => {
    if (prevRoundRef.current !== round) {
      prevRoundRef.current = round;
      playPopInAnimation();
    }
  }, [round]);

  const handleBuy = (index: number) => {
    if (isAnimatingRef.current) return;
    const card = shop[index];
    if (!card) return;

    if (coins < card.cost) {
      Alert.alert(
        'Zu wenig Plates',
        `Diese Karte kostet ${card.cost} Plates. Beende deinen nächsten Satz für mehr Plates (1 Rep = 1 Plate)!`
      );
      return;
    }

    const upgradeStatus = getUpgradeStatus(card.id);
    const isUpgrade = upgradeStatus === 'lvl2' || upgradeStatus === 'lvl3';
    const hasSpace = board.some(u => u === null) || bench.some(u => u === null);

    if (!isUpgrade && !hasSpace) {
      Alert.alert(
        'Feld voll',
        'Dein Board und deine Bank sind voll! Verkaufe oder fusioniere erst eine Einheit.'
      );
      return;
    }

    isAnimatingRef.current = true;

    // Disappear animation: Old cards scale down & fade out
    Animated.parallel(
      [0, 1, 2].map(i =>
        Animated.parallel([
          Animated.timing(cardScaleAnims[i], {
            toValue: 0.6,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacityAnims[i], {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ])
      )
    ).start(() => {
      // Execute purchase in store (which rerolls the shop)
      const success = buyShopCard(index);
      if (success) {
        triggerSuccess();
      }
      // New cards pop in with spring bounce!
      playPopInAnimation();
    });
  };

  const handleReroll = () => {
    if (isAnimatingRef.current) return;
    if (coins < 1) return;

    isAnimatingRef.current = true;

    // Disappear animation
    Animated.parallel(
      [0, 1, 2].map(i =>
        Animated.parallel([
          Animated.timing(cardScaleAnims[i], {
            toValue: 0.6,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacityAnims[i], {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ])
      )
    ).start(() => {
      rerollShop(false);
      triggerLight();
      playPopInAnimation();
    });
  };

  const handleBuyItem = () => {
    if (!shopItem) return;
    if (coins < shopItem.cost) {
      Alert.alert(
        'Zu wenig Plates',
        `Dieses Item kostet ${shopItem.cost} Plates. Beende deinen nächsten Satz für mehr Plates (1 Rep = 1 Plate)!`
      );
      return;
    }
    if (itemInventory.length >= 4) {
      Alert.alert(
        'Gym-Tasche voll',
        'Deine Gym-Tasche hat nur 4 Plätze! Rüste erst ein Item auf deine Einheiten aus.'
      );
      return;
    }
    const success = buyShopItem();
    if (success) {
      triggerSuccess();
    }
  };

  const handleEquipToUnit = (unitId: string) => {
    if (!selectedInventoryItem) return;
    const success = equipItem(unitId, selectedInventoryItem.id);
    if (success) {
      triggerSuccess();
      setSelectedInventoryItem(null);
    } else {
      triggerWarning();
      Alert.alert('Bereits voll', 'Diese Einheit hat bereits die maximalen 2 Items ausgerüstet!');
    }
  };

  const handleUseConsumable = (unitId: string) => {
    if (!selectedInventoryItem) return;
    const success = useConsumableItem(selectedInventoryItem.id, unitId);
    if (success) {
      triggerSuccess();
      setSelectedInventoryItem(null);
      Alert.alert('Erfolgreich geheilt! 💚', `Die Einheit wurde durch "${selectedInventoryItem.name}" geheilt / wiederbelebt!`);
    } else {
      triggerWarning();
    }
  };

  // Collect all squad members for equip picker
  const allSquadUnits: { unit: AutoChessUnit; location: 'board' | 'bench'; index: number }[] = [];
  board.forEach((u, i) => {
    if (u) allSquadUnits.push({ unit: u, location: 'board', index: i });
  });
  bench.forEach((u, i) => {
    if (u) allSquadUnits.push({ unit: u, location: 'bench', index: i });
  });

  return (
    <View style={styles.shopContainer}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.coinsDisplay}>
          <WeightPlateIcon size={18} color="#FFD700" style={{ marginRight: 6 }} />
          <Text style={styles.coinsAmount}>{coins}</Text>
          <Text style={styles.coinsLabel}>Plates</Text>
        </View>

        <View style={styles.roundInfo}>
          <Text style={styles.roundText}>Satz {round}</Text>
          <Text style={styles.subHint}>
            {activeWaveBonusStacks > 0 
              ? `🔥 +${activeWaveBonusStacks} Bonus-Plates aktiv` 
              : '1 Rep = 1 Plate pro Satz'}
          </Text>
        </View>

        <View style={styles.actionButtonsRow}>
          {/* Lock Button */}
          <TouchableOpacity
            style={[styles.smallBtn, isShopLocked && styles.lockBtnActive]}
            onPress={toggleShopLock}
          >
            <MaterialCommunityIcons
              name={isShopLocked ? 'lock' : 'lock-open-outline'}
              size={18}
              color={isShopLocked ? '#FFD700' : '#8E8E93'}
            />
          </TouchableOpacity>

          {/* Reroll Button */}
          <TouchableOpacity
            style={[styles.rerollBtn, coins < 1 && styles.btnDisabled]}
            disabled={coins < 1}
            onPress={handleReroll}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.rerollText}>Reroll (1 Plate)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wave Bonus Banner */}
      <View style={styles.bonusBanner}>
        <View style={styles.bonusPillLeft}>
          <Text style={styles.bonusTextTitle}>🔥 Aktiver Bonus:</Text>
          <Text style={styles.bonusTextSub}>+{activeWaveBonusStacks * 10}% Stats</Text>
        </View>
        <View style={styles.bonusDivider} />
        <View style={styles.bonusPillRight}>
          <Text style={styles.bonusTextTitle}>⭐ In dieser Pause:</Text>
          <Text style={[styles.bonusTextSub, { color: '#30D158' }]}>+{pendingWaveBonusStacks} Stacks aufgebaut</Text>
        </View>
      </View>

      {/* Cards Row (3 Cards with disappear & pop-in animations) */}
      <View style={styles.cardsRow}>
        {shop.map((card, idx) => {
          if (!card) {
            return (
              <Animated.View
                key={`empty_shop_${idx}`}
                style={[
                  styles.boughtSlot,
                  {
                    transform: [{ scale: cardScaleAnims[idx] }],
                    opacity: cardOpacityAnims[idx],
                  },
                ]}
              >
                <MaterialCommunityIcons name="check-circle" size={24} color="#30D158" />
                <Text style={styles.boughtText}>Gekauft</Text>
              </Animated.View>
            );
          }

          const canAfford = coins >= card.cost;
          const upgradeStatus = getUpgradeStatus(card.id);
          const synergyHint = getSynergyStatus(card.category);

          return (
            <Animated.View
              key={`shop_${card.id}_${idx}`}
              style={{
                transform: [{ scale: cardScaleAnims[idx] }],
                opacity: cardOpacityAnims[idx],
              }}
            >
              <View style={{ opacity: canAfford ? 1 : 0.6 }}>
                <AutoChessCard
                  data={card}
                  isShop={true}
                  size="compact"
                  onPress={() => handleBuy(idx)}
                  upgradeAvailable={upgradeStatus}
                  synergyHint={synergyHint}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* ── GEAR DEAL (Rare Item in Shop) ────────────────────────── */}
      <View style={styles.gearDealSection}>
        {shopItem ? (
          <View style={[styles.gearDealCard, { borderColor: RARITY_THEMES[shopItem.rarity].border }]}>
            <View style={styles.gearDealHeader}>
              <View style={styles.gearDealTag}>
                <MaterialCommunityIcons name="lightning-bolt" size={13} color="#FFD700" />
                <Text style={styles.gearDealTagText}>GEAR DEAL DES SATZES</Text>
              </View>
              <View style={[styles.rarityBadge, { backgroundColor: RARITY_THEMES[shopItem.rarity].bg, borderColor: RARITY_THEMES[shopItem.rarity].border }]}>
                <Text style={[styles.rarityBadgeText, { color: RARITY_THEMES[shopItem.rarity].color }]}>
                  {RARITY_THEMES[shopItem.rarity].label.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.gearDealBody}>
              <View style={[styles.gearIconContainer, { borderColor: RARITY_THEMES[shopItem.rarity].border }]}>
                <MaterialCommunityIcons name={shopItem.icon as any} size={28} color={RARITY_THEMES[shopItem.rarity].color} />
              </View>

              <View style={styles.gearDealInfo}>
                <Text style={styles.gearDealName}>{shopItem.name}</Text>
                <Text style={styles.gearDealDesc}>{shopItem.description}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.gearBuyBtn,
                  (coins < shopItem.cost || itemInventory.length >= 4) && styles.btnDisabled
                ]}
                disabled={coins < shopItem.cost || itemInventory.length >= 4}
                onPress={handleBuyItem}
              >
                <WeightPlateIcon size={16} color="#FFD700" style={{ marginRight: 4 }} />
                <Text style={styles.gearBuyText}>{shopItem.cost} Plates</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.gearStandbyCard}>
            <MaterialCommunityIcons name="bag-personal-outline" size={20} color="#555" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gearStandbyTitle}>Ausrüster unterwegs... (30% Spawn-Chance)</Text>
              <Text style={styles.gearStandbySub}>Tipp: Besiege den Mini-Boss in Welle 4 für garantierten Loot!</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── GYM-TASCHE (STASH / INVENTORY) ────────────────────────── */}
      <View style={styles.stashSection}>
        <View style={styles.stashHeader}>
          <View style={styles.stashTitleRow}>
            <MaterialCommunityIcons name="bag-personal" size={16} color="#FF9500" style={{ marginRight: 5 }} />
            <Text style={styles.stashTitle}>Gym-Tasche (Inventar)</Text>
          </View>
          <Text style={styles.stashCount}>{itemInventory.length} / 4 Plätze</Text>
        </View>

        <View style={styles.stashSlotsRow}>
          {[0, 1, 2, 3].map(slotIdx => {
            const item = itemInventory[slotIdx];
            if (!item) {
              return (
                <View key={`stash_empty_${slotIdx}`} style={styles.stashSlotEmpty}>
                  <MaterialCommunityIcons name="plus" size={18} color="#333344" />
                  <Text style={styles.stashSlotEmptyText}>Frei</Text>
                </View>
              );
            }

            const theme = RARITY_THEMES[item.rarity];
            return (
              <TouchableOpacity
                key={`stash_item_${item.id}_${slotIdx}`}
                style={[styles.stashSlotFilled, { borderColor: theme.border, backgroundColor: theme.bg }]}
                onPress={() => setSelectedInventoryItem(item)}
              >
                <MaterialCommunityIcons name={item.icon as any} size={24} color={theme.color} />
                <Text style={[styles.stashItemName, { color: theme.color }]} numberOfLines={1}>
                  {item.name.split(' ')[0]}
                </Text>
                <View style={[styles.stashEquipHint, item.isConsumable && styles.stashConsumableHint]}>
                  <Text style={[styles.stashEquipHintText, item.isConsumable && styles.stashConsumableHintText]}>
                    {item.isConsumable ? 'Heilen ⚡' : 'Rüsten ➔'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Fusion & Shuffle Tip Banner */}
      <View style={styles.tipBanner}>
        <Text style={styles.tipText}>
          ⚡ <Text style={{ color: '#FFD700', fontWeight: '800' }}>Kauf-Shuffle:</Text> Jeder Kauf zieht 3 neue Karten • <Text style={{ color: '#00F0FF', fontWeight: '800' }}>Fusion:</Text> 2x 1★ = ★★ • 2x 2★ = ★★★ Titan
        </Text>
      </View>

      {/* ── EQUIP ITEM MODAL ────────────────────────────────────── */}
      <Modal
        visible={!!selectedInventoryItem}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedInventoryItem(null)}
      >
        <TouchableOpacity
          style={styles.equipModalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedInventoryItem(null)}
        >
          <View style={styles.equipModalCard} onStartShouldSetResponder={() => true}>
            {selectedInventoryItem && (
              <>
                <View style={styles.equipItemHeader}>
                  <View style={[styles.equipModalIconBox, { borderColor: RARITY_THEMES[selectedInventoryItem.rarity].border, backgroundColor: RARITY_THEMES[selectedInventoryItem.rarity].bg }]}>
                    <MaterialCommunityIcons name={selectedInventoryItem.icon as any} size={36} color={RARITY_THEMES[selectedInventoryItem.rarity].color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.equipModalRarityRow}>
                      <Text style={[styles.equipModalRarityText, { color: RARITY_THEMES[selectedInventoryItem.rarity].color }]}>
                        {RARITY_THEMES[selectedInventoryItem.rarity].label.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.equipModalItemName}>{selectedInventoryItem.name}</Text>
                    <Text style={styles.equipModalItemDesc}>{selectedInventoryItem.description}</Text>
                  </View>
                </View>

                <View style={styles.equipModalDivider} />

                <Text style={styles.equipModalSectionTitle}>
                  {selectedInventoryItem.isConsumable
                    ? 'Wähle eine Einheit zum Wiederbeleben / Heilen:'
                    : 'Wähle eine Einheit zum Ausrüsten (Max. 2 Items):'}
                </Text>

                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {allSquadUnits.length === 0 ? (
                    <Text style={styles.noUnitsText}>Keine Einheiten auf Feld oder Bank vorhanden.</Text>
                  ) : (
                    allSquadUnits.map(({ unit, location }) => {
                      const currentItemCount = unit.items?.length || 0;
                      const isFull = currentItemCount >= 2;
                      const isDead = typeof unit.hp === 'number' && unit.hp <= 0;
                      const isInjured = typeof unit.hp === 'number' && unit.hp > 0 && unit.hp < unit.maxHp;

                      return (
                        <View key={unit.instanceId} style={styles.unitEquipRow}>
                          <View style={styles.unitEquipInfo}>
                            <View style={[styles.locationTag, location === 'board' ? styles.boardTag : styles.benchTag]}>
                              <Text style={styles.locationTagText}>{location === 'board' ? 'FELD' : 'BANK'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.unitEquipName} numberOfLines={1}>
                                {unit.stars}★ {unit.exerciseName}
                              </Text>
                              <Text style={[styles.unitEquipHpText, isDead ? { color: '#FF453A' } : isInjured ? { color: '#FF9500' } : { color: '#30D158' }]}>
                                {isDead ? '💀 K.O. (0 HP)' : isInjured ? `🩹 ${unit.hp}/${unit.maxHp} HP` : `💚 ${unit.hp}/${unit.maxHp} HP (Voll)`}
                              </Text>
                            </View>
                          </View>

                          {selectedInventoryItem.isConsumable ? (
                            <TouchableOpacity
                              style={[
                                styles.consumableApplyBtn,
                                isDead ? styles.reviveBtnActive : isInjured ? styles.healBtnActive : styles.equipConfirmBtnDisabled
                              ]}
                              disabled={!isDead && !isInjured}
                              onPress={() => handleUseConsumable(unit.instanceId)}
                            >
                              <Text style={styles.consumableApplyBtnText}>
                                {isDead ? 'Wiederbeleben ⚡' : isInjured ? 'Heilen 💚' : 'Fit 💚'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <>
                              {/* Existing items icons */}
                              <View style={styles.unitEquippedIcons}>
                                {(unit.items || []).map((it, idx) => (
                                  <View key={`${it.id}_${idx}`} style={styles.tinyItemBadge}>
                                    <MaterialCommunityIcons name={it.icon as any} size={12} color="#FFF" />
                                  </View>
                                ))}
                              </View>

                              <TouchableOpacity
                                style={[styles.equipConfirmBtn, isFull && styles.equipConfirmBtnDisabled]}
                                disabled={isFull}
                                onPress={() => handleEquipToUnit(unit.instanceId)}
                              >
                                <Text style={styles.equipConfirmBtnText}>
                                  {isFull ? 'Voll (2/2)' : 'Ausrüsten 🎒'}
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.equipModalCloseBtn}
                  onPress={() => setSelectedInventoryItem(null)}
                >
                  <Text style={styles.equipModalCloseText}>Schließen</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  shopContainer: {
    backgroundColor: '#0D0D11',
    borderTopWidth: 1.5,
    borderTopColor: '#24242E',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coinsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  coinsIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  coinsAmount: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 4,
  },
  coinsLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
  },
  roundInfo: {
    alignItems: 'center',
  },
  roundText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  subHint: {
    color: '#30D158',
    fontSize: 9.5,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallBtn: {
    backgroundColor: '#1E1E26',
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  lockBtnActive: {
    backgroundColor: '#FFD70020',
    borderColor: '#FFD700',
  },
  rerollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C38',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3E3E4E',
  },
  rerollText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    minHeight: 150,
  },
  boughtSlot: {
    width: 100,
    height: 145,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#202028',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111116',
    marginHorizontal: 4,
  },
  boughtText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  tipBanner: {
    marginTop: 6,
    backgroundColor: '#16161E',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tipText: {
    color: '#A0A0AA',
    fontSize: 10,
    fontWeight: '600',
  },
  bonusBanner: {
    flexDirection: 'row',
    backgroundColor: '#12121A',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242434',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bonusPillLeft: {
    flex: 1,
  },
  bonusPillRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bonusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A38',
    marginHorizontal: 8,
  },
  bonusTextTitle: {
    color: '#8E8E93',
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bonusTextSub: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  gearDealSection: {
    marginVertical: 8,
  },
  gearDealCard: {
    backgroundColor: '#13131A',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
  },
  gearDealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gearDealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gearDealTagText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rarityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rarityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  gearDealBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gearIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#0D0D14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearDealInfo: {
    flex: 1,
  },
  gearDealName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  gearDealDesc: {
    color: '#A0A0B0',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  gearBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gearBuyText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  gearStandbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#202028',
    borderRadius: 10,
    padding: 8,
    marginVertical: 4,
  },
  gearStandbyTitle: {
    color: '#8E8E93',
    fontSize: 10.5,
    fontWeight: '700',
  },
  gearStandbySub: {
    color: '#555566',
    fontSize: 9.5,
    marginTop: 1,
  },
  stashSection: {
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#22222E',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
  },
  stashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stashTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stashTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stashCount: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '800',
  },
  stashSlotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stashSlotEmpty: {
    flex: 1,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A38',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  stashSlotEmptyText: {
    color: '#444455',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },
  stashSlotFilled: {
    flex: 1,
    height: 60,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  stashItemName: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  stashEquipHint: {
    backgroundColor: '#00000060',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
  },
  stashEquipHintText: {
    color: '#FFF',
    fontSize: 7.5,
    fontWeight: '700',
  },
  equipModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  equipModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#16161F',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#333345',
    padding: 16,
  },
  equipItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipModalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipModalRarityRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  equipModalRarityText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  equipModalItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  equipModalItemDesc: {
    color: '#A0A0B5',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  equipModalDivider: {
    height: 1,
    backgroundColor: '#292938',
    marginVertical: 12,
  },
  equipModalSectionTitle: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  noUnitsText: {
    color: '#8E8E93',
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 12,
  },
  unitEquipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E2A',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2C2C3A',
  },
  unitEquipInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  boardTag: {
    backgroundColor: '#30D15825',
  },
  benchTag: {
    backgroundColor: '#0A84FF25',
  },
  locationTagText: {
    color: '#FFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  unitEquipName: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  unitEquippedIcons: {
    flexDirection: 'row',
    gap: 3,
    marginRight: 8,
  },
  tinyItemBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3A3A4C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipConfirmBtn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  equipConfirmBtnDisabled: {
    backgroundColor: '#333340',
    opacity: 0.6,
  },
  equipConfirmBtnText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  stashConsumableHint: {
    backgroundColor: '#10B98130',
  },
  stashConsumableHintText: {
    color: '#34D399',
    fontWeight: '900',
  },
  unitEquipHpText: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  consumableApplyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumableApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  reviveBtnActive: {
    backgroundColor: '#FF453A',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  healBtnActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  equipModalCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#242432',
  },
  equipModalCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
