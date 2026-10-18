import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Share,
  ScrollView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Ingredient, StorePrice, DietPlan } from '../store/store';
import SwipeableModal from './SwipeableModal';
import { showCustomAlert } from '../store/store';
import { triggerLight, triggerSuccess } from '../utils/haptics';

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  targetPlanId?: string | null;
}

const PRESET_DAYS = [1, 3, 5, 7, 14];
const DEFAULT_STORES = ['Aldi', 'Lidl', 'Migros', 'Coop', 'Denner', 'Spar'];

interface AggregatedItem {
  id: string;
  name: string;
  totalGrams: number;
  baseAmount: number;
  packSize: number;
  sources: Record<string, number>; // meal name -> count
  ingredient: Ingredient;
  prices: Record<string, number>; // storeName -> price per pack
}

export default function ShoppingListModal({ visible, onClose, targetPlanId }: ShoppingListModalProps) {
  const insets = useSafeAreaInsets();
  const {
    dietPlans,
    savedMeals,
    shoppingListCheckedIds,
    toggleShoppingItemChecked,
    clearShoppingChecked,
    customShoppingItems,
    addCustomShoppingItem,
    toggleCustomShoppingItem,
    deleteCustomShoppingItem,
    stores,
    setIngredientPrices
  } = useAppStore();

  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(targetPlanId || null);

  // Price Editor State
  const [editingItem, setEditingItem] = useState<AggregatedItem | null>(null);
  const [editPackSize, setEditPackSize] = useState('500');
  const [storePriceInputs, setStorePriceInputs] = useState<Record<string, string>>({});

  // Custom Item Modal State
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('');

  // Active Diet Plan
  const activePlan = useMemo(() => {
    if (selectedPlanId) {
      const p = dietPlans.find(plan => plan.id === selectedPlanId);
      if (p) return p;
    }
    return dietPlans.find(p => p.isActive) || dietPlans[0] || null;
  }, [dietPlans, selectedPlanId]);

  // Aggregate Ingredients over selectedDays
  const aggregatedItems = useMemo(() => {
    if (!activePlan || !activePlan.scheduledMeals) return [];

    const itemMap: Record<string, AggregatedItem> = {};
    const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayIndex = new Date().getDay();

    // Loop through each day of the selected period
    for (let dayOffset = 0; dayOffset < selectedDays; dayOffset++) {
      const targetDayName = daysList[(todayIndex + dayOffset) % 7];

      // Find all meals scheduled for this day
      const mealsForDay = activePlan.scheduledMeals.filter(m =>
        m.dayOfWeek.includes('Everyday') || m.dayOfWeek.includes(targetDayName)
      );

      mealsForDay.forEach(schedMeal => {
        const recipe = savedMeals.find(r => r.id === schedMeal.recipeId);
        if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return;

        const recipeServings = recipe.totalServings || 1;
        const mealServings = schedMeal.servings || 1;
        const ratio = mealServings / recipeServings;
        const mealLabel = schedMeal.customName || recipe.name;

        recipe.ingredients.forEach(ri => {
          if (!ri.ingredient) return;
          const ingId = ri.ingredient.id || ri.ingredient.name.toLowerCase().trim();
          const grams = ri.amount * ratio;

          if (!itemMap[ingId]) {
            // Find existing prices
            const pricesMap: Record<string, number> = {};
            (ri.ingredient.prices || []).forEach(p => {
              pricesMap[p.storeName] = p.price;
            });

            // Default pack size from first price or 500g
            const defaultPack = (ri.ingredient.prices && ri.ingredient.prices[0]?.packageSize) || 500;

            itemMap[ingId] = {
              id: ingId,
              name: ri.ingredient.name,
              totalGrams: 0,
              baseAmount: ri.ingredient.baseAmount || 100,
              packSize: defaultPack,
              sources: {},
              ingredient: ri.ingredient,
              prices: pricesMap
            };
          }

          itemMap[ingId].totalGrams += grams;
          itemMap[ingId].sources[mealLabel] = (itemMap[ingId].sources[mealLabel] || 0) + 1;
        });
      });
    }

    return Object.values(itemMap).sort((a, b) => {
      const aChecked = (shoppingListCheckedIds || []).includes(a.id);
      const bChecked = (shoppingListCheckedIds || []).includes(b.id);
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [activePlan, selectedDays, savedMeals, shoppingListCheckedIds]);

  // Store Cost Analysis & Best Deals
  const storeAnalytics = useMemo(() => {
    const storeList = stores && stores.length > 0 ? stores : DEFAULT_STORES;
    const storeTotals: Record<string, { total: number; itemCount: number }> = {};
    storeList.forEach(s => {
      storeTotals[s] = { total: 0, itemCount: 0 };
    });

    let bestSplitTotal = 0;
    let itemsWithPrices = 0;

    aggregatedItems.forEach(item => {
      const packagesNeeded = Math.max(1, Math.ceil(item.totalGrams / item.packSize));
      let bestStorePrice: { store: string; price: number; total: number } | undefined = undefined;

      for (const store of storeList) {
        const p = item.prices[store];
        if (p && p > 0) {
          const cost = packagesNeeded * p;
          storeTotals[store].total += cost;
          storeTotals[store].itemCount += 1;

          if (!bestStorePrice || p < bestStorePrice.price) {
            bestStorePrice = { store, price: p, total: cost };
          }
        }
      }

      if (bestStorePrice) {
        bestSplitTotal += bestStorePrice.total;
        itemsWithPrices++;
      }
    });

    // Find ranking of stores
    const rankings = storeList
      .map(store => ({
        store,
        total: storeTotals[store].total,
        count: storeTotals[store].itemCount
      }))
      .filter(r => r.count > 0)
      .sort((a, b) => a.total - b.total);

    const cheapestStore = rankings[0] || null;
    const expensiveStore = rankings.length > 1 ? rankings[rankings.length - 1] : null;
    const maxSavings = expensiveStore && bestSplitTotal > 0 ? expensiveStore.total - bestSplitTotal : 0;

    return {
      rankings,
      bestSplitTotal,
      cheapestStore,
      expensiveStore,
      maxSavings,
      itemsWithPrices,
      totalItems: aggregatedItems.length
    };
  }, [aggregatedItems, stores]);

  // Open Price Editor Modal
  const handleOpenPriceEditor = (item: AggregatedItem) => {
    setEditingItem(item);
    setEditPackSize(item.packSize.toString());
    const inputs: Record<string, string> = {};
    const storeList = stores && stores.length > 0 ? stores : DEFAULT_STORES;
    storeList.forEach(s => {
      inputs[s] = item.prices[s] !== undefined ? item.prices[s].toString() : '';
    });
    setStorePriceInputs(inputs);
  };

  // Save Prices
  const handleSavePrices = () => {
    if (!editingItem) return;
    const pSize = parseFloat(editPackSize) || 500;
    const newPrices: StorePrice[] = [];

    Object.entries(storePriceInputs).forEach(([storeName, valStr]) => {
      const p = parseFloat(valStr);
      if (!isNaN(p) && p > 0) {
        newPrices.push({
          storeName,
          price: p,
          packageSize: pSize,
          packageUnit: 'g'
        });
      }
    });

    setIngredientPrices(editingItem.ingredient.id, newPrices);
    triggerSuccess();
    setEditingItem(null);
  };

  // Share List
  const handleShareList = async () => {
    if (!activePlan) return;
    triggerLight();

    let text = `🛒 EINKAUFSLISTE (${selectedDays} Tage • ${activePlan.name})\n`;
    text += `════════════════════════════════\n\n`;

    aggregatedItems.forEach(item => {
      const isChecked = (shoppingListCheckedIds || []).includes(item.id);
      const mark = isChecked ? '[✓]' : '[ ]';
      const packages = Math.max(1, Math.ceil(item.totalGrams / item.packSize));
      const amountStr = item.totalGrams >= 1000 ? `${(item.totalGrams / 1000).toFixed(1)}kg` : `${Math.round(item.totalGrams)}g`;

      // Best deal store
      let bestInfo = '';
      const storePrices = Object.entries(item.prices).filter(([_, p]) => p > 0);
      if (storePrices.length > 0) {
        storePrices.sort((a, b) => a[1] - b[1]);
        bestInfo = ` • Best: ${storePrices[0][0]} (CHF ${storePrices[0][1].toFixed(2)})`;
      }

      text += `${mark} ${item.name}: ${amountStr} (${packages}x ${item.packSize}g)${bestInfo}\n`;
    });

    if (customShoppingItems && customShoppingItems.length > 0) {
      text += `\n📦 ZUSATZARTIKEL:\n`;
      customShoppingItems.forEach(c => {
        text += `${c.checked ? '[✓]' : '[ ]'} ${c.name} (${c.amount || '1 Stk'})\n`;
      });
    }

    if (storeAnalytics.bestSplitTotal > 0) {
      text += `\n════════════════════════════════\n`;
      text += `💡 Günstigster Kombi-Deal: CHF ${storeAnalytics.bestSplitTotal.toFixed(2)}\n`;
      if (storeAnalytics.cheapestStore) {
        text += `🏪 Bester Einzelladen: ${storeAnalytics.cheapestStore.store} (CHF ${storeAnalytics.cheapestStore.total.toFixed(2)})\n`;
      }
      if (storeAnalytics.maxSavings > 0) {
        text += `💰 Ersparnis: Bis zu CHF ${storeAnalytics.maxSavings.toFixed(2)}!\n`;
      }
    }

    try {
      await Share.share({
        message: text,
        title: `Einkaufsliste - ${activePlan.name}`
      });
    } catch (e) {
      console.warn('Error sharing list:', e);
    }
  };

  // Add Custom Item
  const handleAddCustom = () => {
    if (!customName.trim()) return;
    addCustomShoppingItem({
      name: customName.trim(),
      amount: customQty.trim() || '1 Stk'
    });
    setCustomName('');
    setCustomQty('');
    setCustomModalVisible(false);
    triggerSuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.planBadge}>
              <MaterialCommunityIcons name="calendar-check" size={14} color="#00D2FF" />
              <Text style={styles.planBadgeText}>
                {activePlan ? activePlan.name.toUpperCase() : 'KEIN AKTIVER PLAN'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>Einkaufsliste</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleShareList}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#00D2FF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {/* Day Selector Chips */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionLabel}>ZEITRAUM AUSWÄHLEN</Text>
              <Text style={styles.selectedDaysText}>
                {selectedDays === 7 ? '7 Tage (1 Woche)' : `${selectedDays} Tage`}
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {PRESET_DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, selectedDays === d && styles.dayChipActive]}
                  onPress={() => {
                    setSelectedDays(d);
                    triggerLight();
                  }}
                >
                  <Text style={[styles.dayChipText, selectedDays === d && styles.dayChipTextActive]}>
                    {d === 7 ? '7 Tage' : `${d}T`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Smart Deal Hero Card */}
          {storeAnalytics.bestSplitTotal > 0 && (
            <View style={styles.dealsHeroCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={styles.smartBadge}>
                    <Text style={styles.smartBadgeText}>SMART DEAL FINDER</Text>
                  </View>
                  <Text style={styles.dealsHeroSub}>Günstigster Kombi-Einkauf:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                    <Text style={styles.dealsHeroPrice}>
                      CHF {storeAnalytics.bestSplitTotal.toFixed(2)}
                    </Text>
                    {storeAnalytics.maxSavings > 0 && storeAnalytics.expensiveStore && (
                      <View style={styles.savingsPill}>
                        <Text style={styles.savingsPillText}>
                          Sparst CHF {storeAnalytics.maxSavings.toFixed(2)} vs {storeAnalytics.expensiveStore.store}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Store Breakdown Badges */}
              {storeAnalytics.rankings.length > 0 && (
                <View style={styles.storeBreakdownRow}>
                  {storeAnalytics.rankings.slice(0, 3).map((r, idx) => (
                    <View key={r.store} style={styles.storeMiniBox}>
                      <Text style={styles.storeMiniName}>{r.store}</Text>
                      <Text style={styles.storeMiniPrice}>CHF {r.total.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Ingredients Checklist Header */}
          <View style={[styles.listHeaderRow, { marginTop: 16 }]}>
            <Text style={styles.listSectionTitle}>
              Zutaten aus Plan ({aggregatedItems.length})
            </Text>
            <TouchableOpacity onPress={clearShoppingChecked}>
              <Text style={styles.clearBtnText}>Haken löschen</Text>
            </TouchableOpacity>
          </View>

          {aggregatedItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="food-apple-outline" size={36} color="#666" />
              <Text style={styles.emptyText}>Keine Zutaten im gewählten Plan gefunden.</Text>
              <Text style={styles.emptySubtext}>Stelle sicher, dass Gerichte im Plan Rezepte mit Zutaten enthalten.</Text>
            </View>
          ) : (
            aggregatedItems.map(item => {
              const isChecked = (shoppingListCheckedIds || []).includes(item.id);
              const packagesNeeded = Math.max(1, Math.ceil(item.totalGrams / item.packSize));
              const amountStr = item.totalGrams >= 1000
                ? `${(item.totalGrams / 1000).toFixed(1)} kg`
                : `${Math.round(item.totalGrams)} g`;

              // Find best store for this item
              const storeEntries = Object.entries(item.prices).filter(([_, p]) => p > 0);
              let bestStore: { store: string; price: number; total: number } | null = null;
              if (storeEntries.length > 0) {
                storeEntries.sort((a, b) => a[1] - b[1]);
                bestStore = {
                  store: storeEntries[0][0],
                  price: storeEntries[0][1],
                  total: packagesNeeded * storeEntries[0][1]
                };
              }

              return (
                <View key={item.id} style={[styles.itemCard, isChecked && styles.itemCardChecked]}>
                  <TouchableOpacity
                    style={styles.itemMainRow}
                    activeOpacity={0.8}
                    onPress={() => {
                      toggleShoppingItemChecked(item.id);
                      triggerLight();
                    }}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                      {isChecked && <MaterialCommunityIcons name="check" size={16} color="#000" />}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemAmount}>
                        {amountStr}{' '}
                        <Text style={styles.itemPackInfo}>
                          ({packagesNeeded}x {item.packSize}g)
                        </Text>
                      </Text>
                      <Text style={styles.itemUsage} numberOfLines={1}>
                        {Object.entries(item.sources).map(([k, v]) => `${v}x ${k}`).join(', ')}
                      </Text>
                    </View>

                    {/* Price and Best Deal Display */}
                    <View style={{ alignItems: 'flex-end' }}>
                      {bestStore ? (
                        <View style={styles.bestDealTag}>
                          <Text style={styles.bestDealText}>
                            ⭐ {bestStore.store}: CHF {bestStore.total.toFixed(2)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.noPriceTag}>
                          <Text style={styles.noPriceText}>Kein Preis</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={{ marginTop: 6 }}
                        onPress={() => handleOpenPriceEditor(item)}
                      >
                        <Text style={styles.editPriceText}>Preise anpassen</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Custom Shopping Items Section */}
          <View style={[styles.listHeaderRow, { marginTop: 24 }]}>
            <Text style={styles.listSectionTitle}>
              Zusätzliche Artikel ({(customShoppingItems || []).length})
            </Text>
            <TouchableOpacity onPress={() => setCustomModalVisible(true)}>
              <Text style={styles.addCustomBtnText}>+ Hinzufügen</Text>
            </TouchableOpacity>
          </View>

          {(customShoppingItems || []).map(custom => (
            <View key={custom.id} style={[styles.customCard, custom.checked && styles.itemCardChecked]}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => toggleCustomShoppingItem(custom.id)}
              >
                <View style={[styles.checkbox, custom.checked && styles.checkboxActive]}>
                  {custom.checked && <MaterialCommunityIcons name="check" size={16} color="#000" />}
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.customName, custom.checked && styles.itemNameChecked]}>
                    {custom.name}
                  </Text>
                  {custom.amount ? <Text style={styles.customAmount}>{custom.amount}</Text> : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCustomShoppingItem(custom.id)} style={{ padding: 6 }}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF453A" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* PRICE EDITOR MODAL */}
        <SwipeableModal visible={!!editingItem} onClose={() => setEditingItem(null)}>
          {editingItem && (
            <View style={{ paddingBottom: 24 }}>
              <Text style={styles.modalTitle}>Preise für {editingItem.name}</Text>
              <Text style={styles.modalSub}>
                Passe die Packungsgrösse und die Preise in den verschiedenen Läden an:
              </Text>

              <View style={styles.packSizeRow}>
                <Text style={styles.formLabel}>Packungsgrösse (Gramm / Stück):</Text>
                <TextInput
                  style={styles.packInput}
                  value={editPackSize}
                  onChangeText={setEditPackSize}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor="#666"
                />
              </View>

              <Text style={[styles.formLabel, { marginTop: 16, marginBottom: 8 }]}>PREISE NACH LÄDEN (CHF):</Text>
              {(stores && stores.length > 0 ? stores : DEFAULT_STORES).map(s => (
                <View key={s} style={styles.storePriceRow}>
                  <Text style={styles.storePriceLabel}>{s}:</Text>
                  <TextInput
                    style={styles.storePriceInput}
                    value={storePriceInputs[s] || ''}
                    onChangeText={txt => setStorePriceInputs(prev => ({ ...prev, [s]: txt }))}
                    keyboardType="numeric"
                    placeholder="z.B. 1.45"
                    placeholderTextColor="#666"
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrices}>
                <Text style={styles.saveBtnText}>Preise Speichern</Text>
              </TouchableOpacity>
            </View>
          )}
        </SwipeableModal>

        {/* CUSTOM ITEM ADD MODAL */}
        <SwipeableModal visible={customModalVisible} onClose={() => setCustomModalVisible(false)}>
          <View style={{ paddingBottom: 24 }}>
            <Text style={styles.modalTitle}>Zusätzlichen Artikel hinzufügen</Text>
            <Text style={styles.formLabel}>Artikelname:</Text>
            <TextInput
              style={styles.textInputFull}
              value={customName}
              onChangeText={setCustomName}
              placeholder="z.B. Mineralwasser, Zahnpasta, Backpapier"
              placeholderTextColor="#666"
            />
            <Text style={[styles.formLabel, { marginTop: 12 }]}>Menge / Einheit:</Text>
            <TextInput
              style={styles.textInputFull}
              value={customQty}
              onChangeText={setCustomQty}
              placeholder="z.B. 6 Flaschen oder 1 Packung"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={handleAddCustom}>
              <Text style={styles.saveBtnText}>Artikel Hinzufügen</Text>
            </TouchableOpacity>
          </View>
        </SwipeableModal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828'
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2
  },
  planBadgeText: { color: '#00D2FF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },

  section: { marginBottom: 12 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  selectedDaysText: { color: '#00D2FF', fontSize: 12, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E'
  },
  dayChipActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF'
  },
  dayChipText: { color: '#888', fontSize: 12, fontWeight: '700' },
  dayChipTextActive: { color: '#000', fontWeight: '900' },

  dealsHeroCard: {
    backgroundColor: '#1A1A1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00D2FF40',
    marginBottom: 8
  },
  smartBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#30D15820',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30D15840',
    marginBottom: 6
  },
  smartBadgeText: { color: '#30D158', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dealsHeroSub: { color: '#AAA', fontSize: 12, fontWeight: '500' },
  dealsHeroPrice: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  savingsPill: {
    backgroundColor: '#30D15815',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  savingsPillText: { color: '#30D158', fontSize: 11, fontWeight: '700' },
  storeBreakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#282828'
  },
  storeMiniBox: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828'
  },
  storeMiniName: { color: '#888', fontSize: 10, fontWeight: '600' },
  storeMiniPrice: { color: '#FFF', fontSize: 12, fontWeight: '800', marginTop: 2 },

  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  listSectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  clearBtnText: { color: '#888', fontSize: 11, fontWeight: '600' },
  addCustomBtnText: { color: '#00D2FF', fontSize: 12, fontWeight: '800' },

  itemCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E'
  },
  itemCardChecked: {
    backgroundColor: '#161616',
    borderColor: '#222',
    opacity: 0.6
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#30D158',
    borderColor: '#30D158'
  },
  itemName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#777' },
  itemAmount: { color: '#00D2FF', fontSize: 12, fontWeight: '700', marginTop: 2 },
  itemPackInfo: { color: '#888', fontWeight: '400' },
  itemUsage: { color: '#666', fontSize: 10, marginTop: 2 },
  bestDealTag: {
    backgroundColor: '#30D15815',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30D15830'
  },
  bestDealText: { color: '#30D158', fontSize: 11, fontWeight: '800' },
  noPriceTag: {
    backgroundColor: '#282828',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  noPriceText: { color: '#888', fontSize: 10, fontWeight: '600' },
  editPriceText: { color: '#00D2FF', fontSize: 10, fontWeight: '700' },

  customCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  customName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  customAmount: { color: '#888', fontSize: 11, marginTop: 1 },

  emptyBox: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#18181A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#282828',
    marginTop: 8
  },
  emptyText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  emptySubtext: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Modal styles
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#888', fontSize: 12, marginBottom: 16 },
  packSizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packInput: {
    backgroundColor: '#121212',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: 100,
    textAlign: 'center',
    fontWeight: '800'
  },
  storePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  storePriceLabel: { color: '#CCC', fontSize: 13, fontWeight: '700' },
  storePriceInput: {
    backgroundColor: '#121212',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: 120,
    textAlign: 'right',
    fontWeight: '800'
  },
  formLabel: { color: '#888', fontSize: 11, fontWeight: '800' },
  textInputFull: {
    backgroundColor: '#121212',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    marginTop: 6
  },
  saveBtn: {
    backgroundColor: '#00D2FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18
  },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900' }
});
