import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useAppStore } from '../store/store';
import ConfettiCannon from 'react-native-confetti-cannon';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLevelData } from '../utils/gamification';
import { getAppTheme } from '../utils/theme';

const { width } = Dimensions.get('window');

export default function LevelUpModal() {
  const levelUpData = useAppStore(state => state.levelUpData);
  const setLevelUpData = useAppStore(state => state.setLevelUpData);
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  if (!levelUpData) return null;

  const { newLevel, totalXP } = levelUpData;
  const levelData = getLevelData(totalXP);

  return (
    <Modal visible={!!levelUpData} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBg || '#1E1E1E', borderColor: theme.cardBorder || '#333', shadowColor: theme.accent || '#00D2FF' }]}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="shield-star" size={80} color={levelData.rankColor} />
          </View>
          <Text style={[styles.title, { color: theme.accent || '#00D2FF' }]}>LEVEL UP!</Text>
          <Text style={styles.levelText}>You are now Level {newLevel}</Text>
          <Text style={[styles.rankText, { color: levelData.rankColor }]}>{levelData.title}</Text>
          
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent || '#00D2FF' }]} onPress={() => setLevelUpData(null)}>
            <Text style={styles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </View>

        <ConfettiCannon
          count={250}
          origin={{ x: width / 2, y: -20 }}
          fadeOut={true}
          fallSpeed={3000}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00D2FF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 20,
    color: '#FFF',
    marginBottom: 4,
  },
  rankText: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#00D2FF',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
});
