import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AutoChessSynergyBar } from './AutoChessSynergyBar';
import { AutoChessBoard } from './AutoChessBoard';
import { AutoChessShop } from './AutoChessShop';
import { AutoChessCombatView } from './AutoChessCombatView';
import { TrophyRoadModal } from './TrophyRoadModal';
import { IronTacticsTopMusicBar } from '../ironTactics/IronTacticsTopMusicBar';
import { usePlaybackState, State as PlaybackStateEnum } from 'react-native-track-player';
import { triggerLight } from '../../utils/haptics';
import { useAutoChessStore } from '../../store/useAutoChessStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  restTimeLeft: number | null;
  onAdd30s: () => void;
}

export const RestAutoChessModal: React.FC<Props> = ({
  visible,
  onClose,
  restTimeLeft,
  onAdd30s
}) => {
  const insets = useSafeAreaInsets();
  const isBoardDragging = useAutoChessStore(state => state.isBoardDragging);
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44);

  const [activeTab, setActiveTab] = useState<'team' | 'combat'>('team');
  const [trophyRoadVisible, setTrophyRoadVisible] = useState(false);
  const [musicBarVisible, setMusicBarVisible] = useState(false);
  const playbackState = usePlaybackState();
  const isMusicPlaying = playbackState.state === PlaybackStateEnum.Playing;
  const trophies = useAutoChessStore(state => state.trophies);
  const activeWaveBonusStacks = useAutoChessStore(state => state.activeWaveBonusStacks);
  const pendingWaveBonusStacks = useAutoChessStore(state => state.pendingWaveBonusStacks);
  const isBossAvailable = useAutoChessStore(state => state.isBossAvailable);

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRestOverSoon = restTimeLeft !== null && restTimeLeft <= 10;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.safeArea}>
        {/* Sticky Rest HUD Header */}
        <View style={[styles.restHUD, { paddingTop: topInset + 6 }, isRestOverSoon && styles.restHUDWarning]}>
          <View style={styles.hudTimerBox}>
            <View style={[styles.timerIconCircle, isRestOverSoon && { backgroundColor: '#FF453A25' }]}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={20}
                color={isRestOverSoon ? '#FF453A' : '#30D158'}
              />
            </View>
            <View>
              <Text style={styles.hudSub}>SATZPAUSE</Text>
              <Text style={[styles.hudTimerClock, isRestOverSoon && { color: '#FF453A' }]}>
                {formatTime(restTimeLeft)}
              </Text>
            </View>
          </View>

          {/* Trophy & Wave Stacks Meta Info */}
          <View style={styles.hudMetaGroup}>
            <TouchableOpacity 
              style={styles.trophyPill}
              activeOpacity={0.7}
              onPress={() => setTrophyRoadVisible(true)}
            >
              <Text style={styles.trophyText}>🏆 {trophies}</Text>
            </TouchableOpacity>

            {activeWaveBonusStacks > 0 && (
              <View style={styles.waveBonusPill}>
                <Text style={styles.waveBonusText}>🔥 x{activeWaveBonusStacks}</Text>
              </View>
            )}

            {pendingWaveBonusStacks > 0 && (
              <View style={styles.pendingBonusPill}>
                <Text style={styles.pendingBonusText}>⭐ +{pendingWaveBonusStacks}</Text>
              </View>
            )}

            {isBossAvailable && (
              <View style={styles.bossPill}>
                <Text style={styles.bossPillText}>👑 BOSS</Text>
              </View>
            )}

            {/* Music Button */}
            <TouchableOpacity
              style={[
                styles.musicBtn,
                musicBarVisible && styles.musicBtnActive,
                isMusicPlaying && styles.musicBtnPlaying,
              ]}
              onPress={() => {
                triggerLight();
                setMusicBarVisible(v => !v);
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons
                name={isMusicPlaying ? 'music' : 'music-note'}
                size={14}
                color={musicBarVisible || isMusicPlaying ? '#00D2FF' : '#8E8E93'}
              />
              {isMusicPlaying && <View style={styles.musicPlayingDot} />}
            </TouchableOpacity>
          </View>

          {/* Rest HUD Actions */}
          <View style={styles.hudActions}>
            <TouchableOpacity style={styles.addTimeBtn} onPress={onAdd30s}>
              <Text style={styles.addTimeText}>+30s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Zum Satz ➔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Dropdown Music Bar */}
        <IronTacticsTopMusicBar
          visible={musicBarVisible}
          onClose={() => setMusicBarVisible(false)}
        />

        {/* Synergy Bar */}
        <AutoChessSynergyBar />

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'team' && styles.tabItemActive]}
            onPress={() => setActiveTab('team')}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={18}
              color={activeTab === 'team' ? '#FFFFFF' : '#8E8E93'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'team' && styles.tabTextActive]}>
              Team & Shop
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'combat' && styles.tabItemActive]}
            onPress={() => setActiveTab('combat')}
          >
            <MaterialCommunityIcons
              name="sword-cross"
              size={18}
              color={activeTab === 'combat' ? '#FFFFFF' : '#8E8E93'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'combat' && styles.tabTextActive]}>
              Arena & Kampf
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'team' ? (
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isBoardDragging}
          >
            <AutoChessBoard />
            <AutoChessShop />
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <AutoChessCombatView onBackToTeam={() => setActiveTab('team')} />
          </View>
        )}

        {/* Trophy Road Modal */}
        <TrophyRoadModal
          visible={trophyRoadVisible}
          onClose={() => setTrophyRoadVisible(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  restHUD: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111116',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#20202A',
  },
  restHUDWarning: {
    backgroundColor: '#261214',
    borderBottomColor: '#FF453A80',
  },
  hudTimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#30D15820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudSub: {
    color: '#8E8E93',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudTimerClock: {
    color: '#30D158',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hudMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trophyPill: {
    backgroundColor: '#1E1E28',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  trophyText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
  },
  waveBonusPill: {
    backgroundColor: '#FF950025',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  waveBonusText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '900',
  },
  pendingBonusPill: {
    backgroundColor: '#30D15820',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  pendingBonusText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '900',
  },
  bossPill: {
    backgroundColor: '#A855F730',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  bossPillText: {
    color: '#C084FC',
    fontSize: 9.5,
    fontWeight: '900',
  },
  musicBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E1E28',
    borderWidth: 1,
    borderColor: '#363644',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  musicBtnActive: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  musicBtnPlaying: {
    borderColor: 'rgba(0, 210, 255, 0.5)',
  },
  musicPlayingDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00D2FF',
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addTimeBtn: {
    backgroundColor: '#22222C',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#363644',
  },
  addTimeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: '#30D158',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  closeBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D0D12',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A22',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#30D158',
    backgroundColor: '#161620',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  scrollContent: {
    flex: 1,
  },
});
