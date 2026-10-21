import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CheckInEntry } from '../store/useCheckInStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';

interface Props {
  beforeEntry?: CheckInEntry;
  afterEntry?: CheckInEntry;
  containerWidth?: number;
}

type PoseKey = 'front' | 'side' | 'back' | 'detail';

export default function BeforeAfterSlider({
  beforeEntry,
  afterEntry,
  containerWidth: customWidth,
}: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const windowWidth = Dimensions.get('window').width;
  const cardWidth = customWidth ? customWidth - 32 : windowWidth - 32;
  const cardHeight = Math.min(420, cardWidth * 1.25);

  const [activePose, setActivePose] = useState<PoseKey>('front');
  const [sliderPos, setSliderPos] = useState<number>(cardWidth * 0.5);

  const sliderPosRef = useRef(cardWidth * 0.5);
  sliderPosRef.current = sliderPos;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = gestureState.moveX - 16; // 16 margin
        const clampedX = Math.max(20, Math.min(cardWidth - 20, newX));
        setSliderPos(clampedX);
      },
    })
  ).current;

  const beforeUri = beforeEntry?.photos?.[activePose];
  const afterUri = afterEntry?.photos?.[activePose];

  const getPoseLabel = (pose: PoseKey) => {
    switch (pose) {
      case 'front':
        return 'Front';
      case 'side':
        return 'Side';
      case 'back':
        return 'Back';
      case 'detail':
        return 'Detail';
    }
  };

  return (
    <View style={[styles.container, { width: cardWidth, borderColor: theme.cardBorder }]}>
      {/* Pose Selector Tabs */}
      <View style={styles.poseTabs}>
        {(['front', 'side', 'back', 'detail'] as PoseKey[]).map((pose) => (
          <TouchableOpacity
            key={pose}
            style={[styles.poseTab, activePose === pose && [styles.poseTabActive, { backgroundColor: theme.accent }]]}
            onPress={() => setActivePose(pose)}
          >
            <Text
              style={[
                styles.poseTabText,
                activePose === pose && styles.poseTabTextActive,
              ]}
            >
              {getPoseLabel(pose)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Image Slider Viewport */}
      <View style={[styles.viewport, { width: cardWidth, height: cardHeight }]}>
        {/* RIGHT (AFTER) IMAGE */}
        <View style={StyleSheet.absoluteFill}>
          {afterUri ? (
            <Image source={{ uri: afterUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderBox}>
              <MaterialCommunityIcons name="camera-outline" size={40} color="#555" />
              <Text style={styles.placeholderTitle}>Aktuelle Form</Text>
              <Text style={styles.placeholderSub}>
                W{afterEntry?.weekNumber || 1} • {afterEntry?.fastingWeight || '--'} kg
              </Text>
            </View>
          )}
          <View style={[styles.badge, styles.badgeRight]}>
            <Text style={styles.badgeText}>
              W{afterEntry?.weekNumber || 'Aktuell'} ({afterEntry?.fastingWeight || '--'} kg)
            </Text>
          </View>
        </View>

        {/* LEFT (BEFORE) CLIPPED OVERLAY */}
        <View
          style={[
            styles.clippedOverlay,
            { width: sliderPos, height: cardHeight, borderRightColor: theme.accent },
          ]}
        >
          <View style={{ width: cardWidth, height: cardHeight }}>
            {beforeUri ? (
              <Image source={{ uri: beforeUri }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.placeholderBox, { backgroundColor: '#18181A' }]}>
                <MaterialCommunityIcons name="history" size={40} color="#444" />
                <Text style={styles.placeholderTitle}>Ausgangsform</Text>
                <Text style={styles.placeholderSub}>
                  W{beforeEntry?.weekNumber || 1} • {beforeEntry?.fastingWeight || '--'} kg
                </Text>
              </View>
            )}
            <View style={[styles.badge, styles.badgeLeft]}>
              <Text style={styles.badgeText}>
                W{beforeEntry?.weekNumber || 1} ({beforeEntry?.fastingWeight || '--'} kg)
              </Text>
            </View>
          </View>
        </View>

        {/* DRAGGABLE DIVIDER LINE & HANDLE */}
        <View
          style={[styles.dividerLine, { left: sliderPos, height: cardHeight }]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.handleCircle, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
            <MaterialCommunityIcons name="arrow-left-right" size={16} color="#000" />
          </View>
        </View>
      </View>

      {/* Helper Guidance */}
      <View style={styles.footerRow}>
        <Text style={styles.helperText}>
          👈 Ziehe den Regler für den direkten Vorher-Nachher Vergleich 👉
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#282828',
    overflow: 'hidden',
    marginVertical: 12,
  },
  poseTabs: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
    gap: 6,
  },
  poseTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  poseTabActive: {
    backgroundColor: '#00D2FF',
  },
  poseTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  poseTabTextActive: {
    color: '#000',
  },
  viewport: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#121212',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141416',
    padding: 16,
  },
  placeholderTitle: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  placeholderSub: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  clippedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderRightWidth: 2,
    borderRightColor: '#00D2FF',
  },
  dividerLine: {
    position: 'absolute',
    top: 0,
    width: 32,
    marginLeft: -16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  handleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00D2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeLeft: {
    left: 12,
  },
  badgeRight: {
    right: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  footerRow: {
    padding: 10,
    backgroundColor: '#141416',
    borderTopWidth: 1,
    borderTopColor: '#252528',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 10,
    color: '#777',
    fontWeight: '600',
  },
});
