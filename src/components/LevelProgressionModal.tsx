import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLevelTierInfo } from '../utils/levels';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';

export interface LevelProgressionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  currentXP: number; // For achievements, this is progress
  type: 'cardio' | 'achievement';
  thresholds?: number[];
  description?: string;
  children?: React.ReactNode;
}

export const LevelProgressionModal: React.FC<LevelProgressionModalProps> = ({ visible, onClose, title, currentXP, type, thresholds, description, children }) => {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const base = type === 'cardio' ? 500 : 1000;
  
  const tiers = [
    { name: 'Bronze', startLevel: 1,  icon: 'shield-outline',    color: '#CD7F32' },
    { name: 'Silver', startLevel: 11, icon: 'shield-half-full',  color: '#C0C0C0' },
    { name: 'Gold',   startLevel: 21, icon: 'shield',            color: '#FFD700' },
    { name: 'Emerald',startLevel: 31, icon: 'shield-star',       color: '#50C878' },
    { name: 'Challenger', startLevel: 41, icon: 'shield-crown',  color: '#E51400' },
  ];

  let currentLevel = 1;
  let currentTierInfo = getLevelTierInfo(currentLevel);

  if (type === 'achievement' && thresholds) {
    if (currentXP >= thresholds[4]) { currentTierInfo = { tier: 'Challenger', color: '#E51400' }; }
    else if (currentXP >= thresholds[3]) { currentTierInfo = { tier: 'Emerald', color: '#50C878' }; }
    else if (currentXP >= thresholds[2]) { currentTierInfo = { tier: 'Gold', color: '#FFD700' }; }
    else if (currentXP >= thresholds[1]) { currentTierInfo = { tier: 'Silver', color: '#C0C0C0' }; }
    else if (currentXP >= thresholds[0]) { currentTierInfo = { tier: 'Bronze', color: '#CD7F32' }; }
    else { currentTierInfo = { tier: 'Locked' as any, color: '#333333' }; }
  } else {
    currentLevel = Math.floor(Math.pow(currentXP / base, 1 / 1.5)) + 1;
    currentTierInfo = getLevelTierInfo(currentLevel);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.subCardBg || '#121212' }]}>
          <View style={[styles.header, { borderBottomColor: theme.subtleBorder || '#222' }]}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.subtitle, { color: currentTierInfo.color }]}>
                {type === 'achievement' ? currentTierInfo.tier : `Lv. ${currentLevel} • ${currentTierInfo.tier}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            {children}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {type === 'cardio' && 'Earn XP through distance, duration, and high heart rate zones (Intensity).'}
                {type === 'achievement' && (description || 'Complete the required goals to upgrade this badge tier.')}
              </Text>
            </View>
            
            {tiers.map((t, index) => {
              let reqXP = 0;
              let isUnlocked = false;
              let isNext = false;
              let progressToTier = 0;

              if (type === 'achievement' && thresholds) {
                reqXP = thresholds[index];
                isUnlocked = currentXP >= reqXP;
                isNext = !isUnlocked && (index === 0 || currentXP >= thresholds[index-1]);
                
                if (isUnlocked) progressToTier = 1;
                else if (isNext) {
                  const prevReqXP = index > 0 ? thresholds[index-1] : 0;
                  progressToTier = (currentXP - prevReqXP) / (reqXP - prevReqXP);
                }
              } else {
                reqXP = Math.round(Math.floor(base * Math.pow(t.startLevel - 1, 1.5)) / 100) * 100;
                isUnlocked = currentLevel >= t.startLevel;
                isNext = !isUnlocked && (index === 0 || currentLevel >= tiers[index-1].startLevel);
                
                if (isUnlocked) progressToTier = 1;
                else if (isNext) {
                  const prevReqXP = index > 0 ? Math.round(Math.floor(base * Math.pow(tiers[index-1].startLevel - 1, 1.5)) / 100) * 100 : 0;
                  progressToTier = (currentXP - prevReqXP) / (reqXP - prevReqXP);
                }
              }

              return (
                <View key={t.name} style={[styles.tierRow, { borderColor: isUnlocked ? t.color : '#333', backgroundColor: isUnlocked ? t.color + '10' : '#1E1E20' }]}>
                  <View style={[styles.iconBox, { backgroundColor: isUnlocked ? t.color + '30' : '#333' }]}>
                    <MaterialCommunityIcons name={t.icon as any} size={28} color={isUnlocked ? t.color : '#888'} />
                  </View>
                  <View style={styles.tierInfo}>
                    <Text style={[styles.tierName, { color: isUnlocked ? t.color : '#CCC' }]}>
                      {t.name} {type !== 'achievement' && `(Lv. ${t.startLevel})`}
                    </Text>
                    <Text style={styles.reqText}>Requires: {reqXP.toLocaleString()}</Text>
                    
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, progressToTier * 100))}%`, backgroundColor: t.color }]} />
                    </View>
                  </View>
                  {isUnlocked && <MaterialCommunityIcons name="check-circle" size={24} color={t.color} />}
                  {isNext && <Text style={{ color: theme.accent || '#00D2FF', fontSize: 12, fontWeight: '700' }}>{Math.floor(progressToTier * 100)}%</Text>}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  closeBtn: { padding: 8, backgroundColor: '#222', borderRadius: 20 },
  scroll: { padding: 20 },
  infoBox: { backgroundColor: '#1E1E20', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  infoText: { color: '#888', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  
  tierRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  iconBox: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  tierInfo: { flex: 1, marginRight: 12 },
  tierName: { fontSize: 18, fontWeight: '800' },
  reqText: { color: '#888', fontSize: 12, marginTop: 2, fontWeight: '600' },
  barBg: { height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
