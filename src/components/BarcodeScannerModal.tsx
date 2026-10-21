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
  Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ingredient, useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onIngredientFound: (ingredient: Ingredient) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export default function BarcodeScannerModal({
  visible,
  onClose,
  onIngredientFound
}: BarcodeScannerModalProps) {
  const insets = useSafeAreaInsets();
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // Animated scan laser line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !scanned && !manualInputVisible) {
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
  }, [visible, scanned, manualInputVisible]);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
      setErrorMsg(null);
      setManualInputVisible(false);
      setManualBarcode('');
      setTorch(false);
    }
  }, [visible]);

  const fetchOpenFoodFacts = async (barcode: string) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const nut = p.nutriments || {};
        
        const ingredient: Ingredient = {
          id: Date.now().toString(),
          name: p.product_name || 'Unknown Product',
          barcode: barcode,
          baseAmount: 100,
          calories: Math.round(nut['energy-kcal_100g'] || 0),
          protein: Math.round(nut.proteins_100g || 0),
          carbs: Math.round(nut.carbohydrates_100g || 0),
          fat: Math.round(nut.fat_100g || 0)
        };
        onIngredientFound(ingredient);
      } else {
        setErrorMsg('Product not found in Open Food Facts database. You can add it manually.');
      }
    } catch (err) {
      setErrorMsg('Network error while fetching barcode data.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    if (scanned || manualInputVisible) return;
    setScanned(true);
    setLoading(true);
    Vibration.vibrate();
    fetchOpenFoodFacts(data);
  };

  const handleManualSearch = () => {
    if (manualBarcode.trim().length < 3) return;
    setScanned(true);
    setLoading(true);
    fetchOpenFoodFacts(manualBarcode.trim());
  };

  if (!permission) return <View />;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Ingredient</Text>
          <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
            <MaterialCommunityIcons 
              name={torch ? 'flash' : 'flash-off'} 
              size={26} 
              color={torch ? (theme.accent || '#00D2FF') : '#FFFFFF'} 
            />
          </TouchableOpacity>
        </View>

        {!permission.granted ? (
          <View style={styles.permissionBox}>
            <MaterialCommunityIcons name="camera-off" size={64} color="#555" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSubtitle}>
              Please grant camera permissions to scan EAN barcodes.
            </Text>
            <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: theme.accent || '#00D2FF' }]} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        ) : manualInputVisible ? (
          <View style={styles.manualModalBackdrop}>
            <View style={[styles.manualModalCard, { backgroundColor: theme.cardBg || '#1E1E20', borderColor: theme.cardBorder || '#303036' }]}>
              <View style={styles.manualModalHeader}>
                <Text style={styles.manualModalTitle}>Manual Entry</Text>
                <TouchableOpacity onPress={() => setManualInputVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#555" />
                </TouchableOpacity>
              </View>
              <Text style={styles.manualModalSub}>Enter the EAN barcode number manually if it won't scan.</Text>
              <TextInput 
                style={styles.manualInput}
                placeholder="EAN Number..."
                placeholderTextColor="#555"
                keyboardType="number-pad"
                value={manualBarcode}
                onChangeText={setManualBarcode}
                autoFocus
              />
              <TouchableOpacity style={[styles.manualSearchBtn, { backgroundColor: theme.accent || '#00D2FF' }]} onPress={handleManualSearch}>
                <Text style={styles.manualSearchBtnText}>Lookup Barcode</Text>
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
            <View style={styles.overlayTop} />
            <View style={styles.overlayCenterRow}>
              <View style={styles.overlaySide} />
              <View style={styles.scanBox}>
                <View style={[styles.cornerMarker, styles.cornerTL, { borderColor: theme.accent || '#00D2FF' }]} />
                <View style={[styles.cornerMarker, styles.cornerTR, { borderColor: theme.accent || '#00D2FF' }]} />
                <View style={[styles.cornerMarker, styles.cornerBL, { borderColor: theme.accent || '#00D2FF' }]} />
                <View style={[styles.cornerMarker, styles.cornerBR, { borderColor: theme.accent || '#00D2FF' }]} />
                {!scanned && (
                  <Animated.View style={[styles.laserLine, { backgroundColor: theme.accent || '#00D2FF', shadowColor: theme.accent || '#00D2FF' }, { transform: [{ translateY: laserAnim }] }]} />
                )}
                {loading && (
                  <View style={styles.scanLoadingOverlay}>
                    <ActivityIndicator size="large" color={theme.accent || "#00D2FF"} />
                    <Text style={[styles.scanLoadingText, { color: theme.accent || "#00D2FF" }]}>Looking up...</Text>
                  </View>
                )}
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.scanInstructions}>Center the barcode inside the frame</Text>
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#FF453A" />
                  <Text style={styles.errorBannerText}>{errorMsg}</Text>
                </View>
              )}
              <View style={styles.bottomControls}>
                <TouchableOpacity 
                  style={[styles.manualEntryPill, { borderColor: theme.cardBorder || '#303036' }]} 
                  onPress={() => setManualInputVisible(true)}
                >
                  <MaterialCommunityIcons name="keyboard" size={20} color={theme.accent || "#00D2FF"} />
                  <Text style={[styles.manualEntryPillText, { color: theme.accent || '#00D2FF' }]}>Enter Manually</Text>
                </TouchableOpacity>
                {scanned && !loading && errorMsg && (
                  <TouchableOpacity style={styles.scanAgainBtn} onPress={() => {
                    setScanned(false);
                    setErrorMsg(null);
                  }}>
                    <Text style={styles.scanAgainBtnText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#000',
    zIndex: 10
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  iconBtn: { padding: 8 },
  cameraWrapper: { flex: 1 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlayCenterRow: { flexDirection: 'row', height: SCAN_BOX_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanBox: { width: SCAN_BOX_SIZE, height: SCAN_BOX_SIZE, position: 'relative', overflow: 'hidden' },
  overlayBottom: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', paddingTop: 24 },
  
  cornerMarker: { position: 'absolute', width: 24, height: 24, borderColor: '#00D2FF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  
  laserLine: { width: '100%', height: 3, backgroundColor: '#00D2FF', shadowColor: '#00D2FF', shadowOpacity: 0.9, shadowRadius: 8 },
  scanLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  scanLoadingText: { color: '#00D2FF', fontSize: 13, fontWeight: '700', marginTop: 10 },
  scanInstructions: { color: '#DDD', fontSize: 13, fontWeight: '600' },
  
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 58, 0.15)', borderWidth: 1, borderColor: '#FF453A', borderRadius: 10, padding: 10, marginTop: 14, maxWidth: '92%' },
  errorBannerText: { color: '#FF453A', fontSize: 12, marginLeft: 8, flex: 1 },
  
  bottomControls: { marginTop: 20 },
  manualEntryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E22', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#303036' },
  manualEntryPillText: { color: '#00D2FF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  scanAgainBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  scanAgainBtnText: { color: '#888', fontSize: 13, fontWeight: '700' },
  
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  permissionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 16 },
  permissionSubtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8 },
  permissionBtn: { backgroundColor: '#00D2FF', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  permissionBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  
  manualModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  manualModalCard: { backgroundColor: '#1E1E20', borderRadius: 20, padding: 20, width: '100%', borderWidth: 1, borderColor: '#303036' },
  manualModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  manualModalTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  manualModalSub: { fontSize: 12, color: '#888', marginBottom: 14 },
  manualInput: { backgroundColor: '#28282C', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 18, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: '#38383E', marginBottom: 14 },
  manualSearchBtn: { backgroundColor: '#00D2FF', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  manualSearchBtnText: { color: '#000', fontSize: 15, fontWeight: '900' }
});
