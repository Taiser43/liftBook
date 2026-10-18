import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AutoChessItem, RARITY_THEMES } from '../../constants/autoChessItems';
import { triggerSuccess } from '../../utils/haptics';

interface Props {
  visible: boolean;
  item: AutoChessItem | null;
  onClaim: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AutoChessLootModal: React.FC<Props> = ({ visible, item, onClaim }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && item) {
      scaleAnim.setValue(0.3);
      rotateAnim.setValue(0);
      opacityAnim.setValue(0);

      triggerSuccess();

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, item]);

  if (!item) return null;

  const rarityTheme = RARITY_THEMES[item.rarity] || RARITY_THEMES.common;
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'],
  });

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClaim}>
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { rotate: rotateInterpolate }],
            },
          ]}
        >
          {/* Header Tag */}
          <View style={[styles.headerPill, { borderColor: rarityTheme.border, backgroundColor: rarityTheme.bg }]}>
            <MaterialCommunityIcons name="treasure-chest" size={16} color={rarityTheme.color} style={{ marginRight: 6 }} />
            <Text style={[styles.headerPillText, { color: rarityTheme.color }]}>
              MINI-BOSS BEUTE ERBEUTET!
            </Text>
          </View>

          {/* Item Card Display */}
          <View style={[styles.itemCardContainer, { borderColor: rarityTheme.border }]}>
            {/* Ambient Background Aura */}
            <View style={[styles.itemAura, { backgroundColor: `${rarityTheme.color}15` }]} />

            {/* Item Icon Circle */}
            <View
              style={[
                styles.itemIconCircle,
                {
                  borderColor: rarityTheme.border,
                  backgroundColor: rarityTheme.bg,
                  shadowColor: rarityTheme.color,
                },
              ]}
            >
              <MaterialCommunityIcons name={item.icon as any} size={48} color={rarityTheme.color} />
            </View>

            {/* Rarity Label */}
            <View style={[styles.rarityBadge, { backgroundColor: `${rarityTheme.color}30` }]}>
              <Text style={[styles.rarityText, { color: rarityTheme.color }]}>
                {rarityTheme.label.toUpperCase()}
              </Text>
            </View>

            {/* Item Name */}
            <Text style={styles.itemName}>{item.name}</Text>

            {/* Stat Effect */}
            <View style={styles.effectBox}>
              <MaterialCommunityIcons name="flash" size={16} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={styles.effectText}>{item.description}</Text>
            </View>

            {/* Flavor Text */}
            <Text style={styles.flavorText}>„{item.flavorText}“</Text>
          </View>

          {/* Claim Action Button */}
          <TouchableOpacity style={[styles.claimBtn, { backgroundColor: rarityTheme.color }]} onPress={onClaim}>
            <MaterialCommunityIcons name="bag-personal" size={20} color="#000000" style={{ marginRight: 8 }} />
            <Text style={styles.claimBtnText}>In Gym-Tasche packen 🎒</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 2, 10, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  modalContent: {
    width: Math.min(SCREEN_WIDTH - 40, 360),
    alignItems: 'center',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  headerPillText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  itemCardContainer: {
    width: '100%',
    backgroundColor: '#12121A',
    borderRadius: 24,
    borderWidth: 2,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 15,
  },
  itemAura: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  itemIconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  rarityText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  effectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    marginBottom: 12,
  },
  effectText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  flavorText: {
    color: '#A0A0B0',
    fontSize: 11.5,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 6,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  claimBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
