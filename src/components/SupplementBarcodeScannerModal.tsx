import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Vibration,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, SupplementLibraryItem, showCustomAlert } from '../store/store';
import { getAppTheme } from '../utils/theme';

export interface ScannedSupplementResult {
  name: string;
  brand?: string;
  category: 'Daily Health' | 'Performance' | 'Recovery' | 'Vitamins';
  unit: string;
  contentPerUnit: number;
  unitsPerBox?: number;
  currentInventory?: number;
  imageUri?: string;
  barcode: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectSupplement?: (item: ScannedSupplementResult) => void;
  onAddedDirectly?: (item: SupplementLibraryItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export default function SupplementBarcodeScannerModal({
  visible,
  onClose,
  onSelectSupplement,
  onAddedDirectly,
}: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { supplementLibrary, addSupplementLibraryItem, updateSupplementLibraryItem, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // Result state
  const [detectedProduct, setDetectedProduct] = useState<ScannedSupplementResult | null>(null);
  const [existingItem, setExistingItem] = useState<SupplementLibraryItem | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  // Fallback manual entry inside preview
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualUnit, setManualUnit] = useState('capsule');
  const [manualInventory, setManualInventory] = useState('100');

  // Animated laser line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !scanned && !manualInputVisible && !detectedProduct && !notFoundBarcode) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: SCAN_BOX_SIZE - 6,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible, scanned, manualInputVisible, detectedProduct, notFoundBarcode]);

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setScanned(false);
    setLoading(false);
    setManualInputVisible(false);
    setManualBarcode('');
    setTorch(false);
    setDetectedProduct(null);
    setExistingItem(null);
    setNotFoundBarcode(null);
    setManualName('');
    setManualBrand('');
    setManualUnit('capsule');
    setManualInventory('100');
  };

  // ── Smart Parser for Supplements ──────────────────────────────────────────
  const parseSupplementData = (barcode: string, p: any): ScannedSupplementResult => {
    const rawName = p.product_name_de || p.product_name || p.product_name_en || 'Supplement';
    const brand = p.brands || p.brand_owner || undefined;
    const img = p.image_front_url || p.image_url || p.image_small_url || undefined;
    const quantityStr = `${p.quantity || ''} ${rawName}`.toLowerCase();

    // 1. Determine Unit & Content from Quantity string
    let unit = 'capsule';
    let unitsPerBox = 100;
    let currentInventory = 100;

    const capsuleMatch = quantityStr.match(/(\d+)\s*(kapsel|kapseln|capsule|capsules|tab|tabs|tablette|tabletten|softgel|softgels|pastille|gummie|gummies)/i);
    const gramMatch = quantityStr.match(/(\d+)\s*(g|gramm|grams|kg)/i);
    const mlMatch = quantityStr.match(/(\d+)\s*(ml|milliliter|liter|l)/i);

    if (capsuleMatch) {
      unit = 'capsule';
      unitsPerBox = parseInt(capsuleMatch[1], 10) || 120;
      currentInventory = unitsPerBox;
    } else if (gramMatch) {
      let val = parseInt(gramMatch[1], 10) || 500;
      if (gramMatch[2]?.toLowerCase() === 'kg') val = val * 1000;
      unit = 'g';
      unitsPerBox = val;
      currentInventory = val;
    } else if (mlMatch) {
      let val = parseInt(mlMatch[1], 10) || 500;
      if (mlMatch[2]?.toLowerCase() === 'l') val = val * 1000;
      unit = 'ml';
      unitsPerBox = val;
      currentInventory = val;
    }

    // 2. Classify Category
    const textCorpus = `${rawName} ${p.categories || ''} ${p.generic_name || ''} ${p._keywords?.join(' ') || ''}`.toLowerCase();
    let category: 'Daily Health' | 'Performance' | 'Recovery' | 'Vitamins' = 'Daily Health';

    if (
      textCorpus.includes('creatin') ||
      textCorpus.includes('kreatin') ||
      textCorpus.includes('protein') ||
      textCorpus.includes('whey') ||
      textCorpus.includes('isolate') ||
      textCorpus.includes('casein') ||
      textCorpus.includes('bcaa') ||
      textCorpus.includes('eaa') ||
      textCorpus.includes('booster') ||
      textCorpus.includes('pre-workout') ||
      textCorpus.includes('citrullin') ||
      textCorpus.includes('arginin') ||
      textCorpus.includes('beta-alanin') ||
      textCorpus.includes('pump')
    ) {
      category = 'Performance';
    } else if (
      textCorpus.includes('vitamin') ||
      textCorpus.includes('zink') ||
      textCorpus.includes('zinc') ||
      textCorpus.includes('magnesium') ||
      textCorpus.includes('mineral') ||
      textCorpus.includes('eisen') ||
      textCorpus.includes('calcium') ||
      textCorpus.includes('d3') ||
      textCorpus.includes('b12') ||
      textCorpus.includes('k2')
    ) {
      category = 'Vitamins';
    } else if (
      textCorpus.includes('ashwagandha') ||
      textCorpus.includes('melatonin') ||
      textCorpus.includes('sleep') ||
      textCorpus.includes('schlaf') ||
      textCorpus.includes('glutamin') ||
      textCorpus.includes('omega') ||
      textCorpus.includes('fischöl') ||
      textCorpus.includes('fish oil') ||
      textCorpus.includes('cbd')
    ) {
      category = 'Recovery';
    }

    return {
      name: rawName,
      brand,
      category,
      unit,
      contentPerUnit: 1,
      unitsPerBox,
      currentInventory,
      imageUri: img,
      barcode,
    };
  };

  // ── Lookup API ──────────────────────────────────────────────────────────────
  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    try {
      // First check if already in local store
      const local = (supplementLibrary || []).find(i => i.barcode === barcode);
      if (local) {
        setExistingItem(local);
        setScanned(true);
        setLoading(false);
        Vibration.vibrate(80);
        return;
      }

      // Query OpenFoodFacts API
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        headers: {
          'User-Agent': 'PTNutritionApp/1.0 (Fitness & Supplement Tracker)',
        },
      });
      const data = await res.json();

      if (data.status === 1 && data.product) {
        const parsed = parseSupplementData(barcode, data.product);
        setDetectedProduct(parsed);
        Vibration.vibrate(80);
      } else {
        // Not found online -> show quick manual creator for this barcode
        setNotFoundBarcode(barcode);
        Vibration.vibrate([0, 80, 50, 80]);
      }
    } catch (err) {
      setNotFoundBarcode(barcode);
    } finally {
      setLoading(false);
      setScanned(true);
    }
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned || loading || manualInputVisible || detectedProduct || notFoundBarcode) return;
    lookupBarcode(data.trim());
  };

  const handleManualSearch = () => {
    if (manualBarcode.trim().length < 3) return;
    setManualInputVisible(false);
    lookupBarcode(manualBarcode.trim());
  };

  // ── Actions on Detected Product ───────────────────────────────────────────
  const handleDirectAdd = () => {
    if (!detectedProduct) return;
    const newItem: SupplementLibraryItem = {
      id: `lib-${Date.now()}`,
      name: detectedProduct.name,
      brand: detectedProduct.brand,
      barcode: detectedProduct.barcode,
      category: detectedProduct.category,
      imageUri: detectedProduct.imageUri,
      unit: detectedProduct.unit,
      contentPerUnit: 1,
      unitsPerBox: detectedProduct.unitsPerBox,
      currentInventory: detectedProduct.currentInventory,
      streak: 0,
      totalTakenTimes: 0,
      totalMissedTimes: 0,
    };
    addSupplementLibraryItem(newItem);
    if (onAddedDirectly) onAddedDirectly(newItem);
    showCustomAlert('Hinzugefügt!', `${newItem.name} wurde erfolgreich in deine Bibliothek aufgenommen.`);
    onClose();
  };

  const handleEditInModal = () => {
    if (!detectedProduct) return;
    if (onSelectSupplement) {
      onSelectSupplement(detectedProduct);
    }
    onClose();
  };

  const handleRefillExisting = () => {
    if (!existingItem) return;
    const refillAmount = existingItem.unitsPerBox || 100;
    const updated: SupplementLibraryItem = {
      ...existingItem,
      currentInventory: (existingItem.currentInventory || 0) + refillAmount,
    };
    updateSupplementLibraryItem(updated);
    showCustomAlert('Bestand aufgefüllt!', `Der Bestand von „${existingItem.name}“ wurde um +${refillAmount} ${existingItem.unit}en erhöht.`);
    onClose();
  };

  const handleSaveNotFound = () => {
    if (!manualName.trim() || !notFoundBarcode) return;
    const parsedInv = parseFloat(manualInventory) || 100;
    const newItem: SupplementLibraryItem = {
      id: `lib-${Date.now()}`,
      name: manualName.trim(),
      brand: manualBrand.trim() || undefined,
      barcode: notFoundBarcode,
      category: 'Daily Health',
      unit: manualUnit,
      contentPerUnit: 1,
      unitsPerBox: parsedInv,
      currentInventory: parsedInv,
      streak: 0,
      totalTakenTimes: 0,
      totalMissedTimes: 0,
    };
    addSupplementLibraryItem(newItem);
    if (onAddedDirectly) onAddedDirectly(newItem);
    showCustomAlert('Gespeichert!', `„${newItem.name}“ wurde mit dem Barcode verknüpft und hinzugefügt.`);
    onClose();
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Performance': return '#00D2FF';
      case 'Vitamins': return '#FFA726';
      case 'Recovery': return '#BA68C8';
      case 'Daily Health': return '#00E676';
      default: return theme.accent;
    }
  };

  if (!permission) return <View />;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#090B0E' }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), borderBottomColor: theme.subtleBorder }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>EAN Scanner</Text>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>Supplemente erfassen</Text>
          </View>
          <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
            <MaterialCommunityIcons
              name={torch ? 'flash' : 'flash-off'}
              size={24}
              color={torch ? '#FFD700' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {!permission.granted ? (
          <View style={styles.permissionBox}>
            <MaterialCommunityIcons name="camera-off" size={64} color="#666" />
            <Text style={styles.permissionTitle}>Kamera-Zugriff erforderlich</Text>
            <Text style={styles.permissionSubtitle}>
              Um den EAN-Barcode deiner Supplemente zu scannen, benötigt die App Zugriff auf die Kamera.
            </Text>
            <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: theme.accent }]} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Kamera aktivieren</Text>
            </TouchableOpacity>
          </View>
        ) : manualInputVisible ? (
          <View style={styles.manualModalBackdrop}>
            <View style={[styles.manualModalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.manualModalHeader}>
                <Text style={styles.manualModalTitle}>Barcode manuell eintippen</Text>
                <TouchableOpacity onPress={() => setManualInputVisible(false)}>
                  <MaterialCommunityIcons name="close" size={22} color="#AAA" />
                </TouchableOpacity>
              </View>
              <Text style={styles.manualModalSub}>Gib die EAN-Nummer (13 oder 8 Ziffern) von der Packung ein:</Text>
              <TextInput
                style={[styles.manualInput, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                placeholder="z. B. 4250379803875"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={manualBarcode}
                onChangeText={setManualBarcode}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.manualSearchBtn, { backgroundColor: theme.accent }]}
                onPress={handleManualSearch}
              >
                <MaterialCommunityIcons name="magnify" size={20} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.manualSearchBtnText}>Barcode suchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
              }}
            />
            {/* Viewfinder Overlays */}
            <View style={styles.overlayTop}>
              <View style={[styles.scannerHintBadge, { backgroundColor: 'rgba(13,17,23,0.85)', borderColor: theme.cardBorder }]}>
                <MaterialCommunityIcons name="barcode-scan" size={16} color={theme.accent} style={{ marginRight: 6 }} />
                <Text style={styles.scannerHintText}>Halte den Barcode in den Rahmen</Text>
              </View>
            </View>

            <View style={styles.overlayCenterRow}>
              <View style={styles.overlaySide} />
              <View style={styles.scanBox}>
                <View style={[styles.cornerMarker, styles.cornerTL, { borderColor: theme.accent }]} />
                <View style={[styles.cornerMarker, styles.cornerTR, { borderColor: theme.accent }]} />
                <View style={[styles.cornerMarker, styles.cornerBL, { borderColor: theme.accent }]} />
                <View style={[styles.cornerMarker, styles.cornerBR, { borderColor: theme.accent }]} />

                {!scanned && (
                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        backgroundColor: theme.accent,
                        shadowColor: theme.accent,
                        transform: [{ translateY: laserAnim }],
                      },
                    ]}
                  />
                )}

                {loading && (
                  <View style={styles.scanLoadingOverlay}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={[styles.scanLoadingText, { color: theme.accent }]}>Supplement wird geladen...</Text>
                  </View>
                )}
              </View>
              <View style={styles.overlaySide} />
            </View>

            <View style={styles.overlayBottom}>
              {/* If nothing detected yet */}
              {!detectedProduct && !existingItem && !notFoundBarcode && (
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={[styles.manualEntryPill, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                    onPress={() => setManualInputVisible(true)}
                  >
                    <MaterialCommunityIcons name="keyboard-outline" size={18} color={theme.accent} />
                    <Text style={[styles.manualEntryPillText, { color: theme.accent }]}>EAN manuell eingeben</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 1. DETECTED NEW PRODUCT RESULT CARD */}
              {detectedProduct && (
                <View style={[styles.resultCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                  <View style={styles.resultHeader}>
                    {detectedProduct.imageUri ? (
                      <Image source={{ uri: detectedProduct.imageUri }} style={styles.resultImage} />
                    ) : (
                      <View style={[styles.resultImagePlaceholder, { backgroundColor: theme.subCardBg }]}>
                        <MaterialCommunityIcons name="pill" size={28} color={theme.accent} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {detectedProduct.brand && (
                        <Text style={styles.resultBrand}>{detectedProduct.brand.toUpperCase()}</Text>
                      )}
                      <Text style={styles.resultName} numberOfLines={2}>{detectedProduct.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={[styles.resultCategoryBadge, { backgroundColor: getCategoryColor(detectedProduct.category) + '22', borderColor: getCategoryColor(detectedProduct.category) }]}>
                          <Text style={[styles.resultCategoryText, { color: getCategoryColor(detectedProduct.category) }]}>
                            {detectedProduct.category}
                          </Text>
                        </View>
                        <Text style={styles.resultPackageText}>
                          📦 {detectedProduct.currentInventory} {detectedProduct.unit === 'capsule' ? 'Kapseln' : detectedProduct.unit}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { backgroundColor: theme.accent }]}
                      onPress={handleDirectAdd}
                    >
                      <MaterialCommunityIcons name="plus-circle" size={18} color="#000" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnPrimaryText}>Direkt hinzufügen</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { borderColor: theme.subtleBorder, backgroundColor: theme.subCardBg }]}
                      onPress={handleEditInModal}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnSecondaryText}>Im Editor anpassen</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.scanAgainLink} onPress={resetState}>
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: '700' }}>Anderen Barcode scannen</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. ALREADY EXISTING ITEM RESULT CARD */}
              {existingItem && (
                <View style={[styles.resultCard, { backgroundColor: theme.cardBg, borderColor: '#30D158' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#30D158" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#30D158', fontSize: 13, fontWeight: '800' }}>Bereits in deiner Bibliothek!</Text>
                  </View>
                  <Text style={styles.resultName}>{existingItem.name}</Text>
                  <Text style={{ color: '#AAA', fontSize: 12, marginTop: 2 }}>
                    Aktueller Vorrat: <Text style={{ color: '#FFF', fontWeight: '800' }}>{existingItem.currentInventory} {existingItem.unit}en</Text>
                  </Text>

                  <View style={[styles.resultActions, { marginTop: 12 }]}>
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { backgroundColor: '#30D158' }]}
                      onPress={handleRefillExisting}
                    >
                      <MaterialCommunityIcons name="package-variant-closed-plus" size={18} color="#000" style={{ marginRight: 6 }} />
                      <Text style={styles.actionBtnPrimaryText}>
                        Bestand um +{existingItem.unitsPerBox || 100} auffüllen
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { borderColor: theme.subtleBorder, backgroundColor: theme.subCardBg }]}
                      onPress={() => {
                        if (onSelectSupplement) {
                          onSelectSupplement({
                            name: existingItem.name,
                            brand: existingItem.brand,
                            category: existingItem.category as any,
                            unit: existingItem.unit,
                            contentPerUnit: existingItem.contentPerUnit,
                            unitsPerBox: existingItem.unitsPerBox,
                            currentInventory: existingItem.currentInventory,
                            imageUri: existingItem.imageUri,
                            barcode: existingItem.barcode || '',
                          });
                        }
                        onClose();
                      }}
                    >
                      <Text style={styles.actionBtnSecondaryText}>Bearbeiten</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.scanAgainLink} onPress={resetState}>
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: '700' }}>Anderen Barcode scannen</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 3. NOT FOUND IN DATABASE FALLBACK */}
              {notFoundBarcode && (
                <View style={[styles.resultCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialCommunityIcons name="help-circle-outline" size={20} color="#FF9F0A" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FF9F0A', fontSize: 13, fontWeight: '800' }}>Barcode nicht in Datenbank</Text>
                  </View>
                  <Text style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>
                    EAN: {notFoundBarcode} • Trage kurz Name & Packung ein, um ihn dauerhaft zu speichern:
                  </Text>

                  <TextInput
                    style={[styles.quickInput, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                    placeholder="Supplement Name (z. B. Creatin Pulver)..."
                    placeholderTextColor="#666"
                    value={manualName}
                    onChangeText={setManualName}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                    <TextInput
                      style={[styles.quickInput, { flex: 1, backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                      placeholder="Marke (z. B. ESN)"
                      placeholderTextColor="#666"
                      value={manualBrand}
                      onChangeText={setManualBrand}
                    />
                    <TextInput
                      style={[styles.quickInput, { width: 90, backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                      placeholder="Inhalt"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={manualInventory}
                      onChangeText={setManualInventory}
                    />
                  </View>

                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { backgroundColor: theme.accent }]}
                      onPress={handleSaveNotFound}
                    >
                      <Text style={styles.actionBtnPrimaryText}>Speichern & Barcode verknüpfen</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.scanAgainLink} onPress={resetState}>
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: '700' }}>Erneut scannen</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    backgroundColor: '#090B0E',
    zIndex: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  iconBtn: { padding: 8 },
  cameraWrapper: { flex: 1 },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  scannerHintText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  overlayCenterRow: { flexDirection: 'row', height: SCAN_BOX_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerMarker: { position: 'absolute', width: 24, height: 24 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  laserLine: {
    width: '100%',
    height: 3,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  scanLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLoadingText: { fontSize: 13, fontWeight: '800', marginTop: 10 },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bottomControls: { alignItems: 'center' },
  manualEntryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  manualEntryPillText: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  resultCard: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#1E242B',
  },
  resultImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBrand: {
    color: '#8A99A8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  resultCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  resultCategoryText: { fontSize: 10, fontWeight: '800' },
  resultPackageText: { color: '#AAA', fontSize: 11, fontWeight: '600' },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtnPrimary: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnPrimaryText: { color: '#000', fontSize: 13, fontWeight: '900' },
  actionBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  actionBtnSecondaryText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  scanAgainLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  permissionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 16 },
  permissionSubtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8 },
  permissionBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  permissionBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  manualModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualModalCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
  },
  manualModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualModalTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  manualModalSub: { fontSize: 12, color: '#888', marginBottom: 14 },
  manualInput: {
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  manualSearchBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  manualSearchBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },
  quickInput: {
    borderRadius: 10,
    padding: 10,
    color: '#FFF',
    fontSize: 13,
    borderWidth: 1,
  },
});
