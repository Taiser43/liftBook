import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { getSecondsUntilNextPump } from '../../engine/ironTactics/fitnessBridge';
import { getXpRequiredForLevel } from '../../engine/ironTactics/economy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMusicStore } from '../../store/useMusicStore';
import { usePlaybackState, State, useActiveTrack } from 'react-native-track-player';
import { triggerLight } from '../../utils/haptics';

interface Props {
  onBackToApp: () => void;
  onOpenProfile?: () => void;
  onToggleMusic?: () => void;
  isMusicOpen?: boolean;
}

export const IronTacticsHud: React.FC<Props> = ({
  onBackToApp,
  onOpenProfile,
  onToggleMusic,
  isMusicOpen = false,
}) => {
  const insets = useSafeAreaInsets();
  const { trophies, level, xp, eisen, shakes, pump, syncPump } = useIronTacticsMetaStore();
  const [secondsToNextPump, setSecondsToNextPump] = useState(() => getSecondsUntilNextPump(pump));

  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const activeTrack = useActiveTrack();
  const currentSong = useMusicStore(state => state.getCurrentSong?.() || null);
  const hasMusicActive = !!(currentSong || activeTrack);

  useEffect(() => {
    syncPump();
    setSecondsToNextPump(getSecondsUntilNextPump(useIronTacticsMetaStore.getState().pump));

    const timer = setInterval(() => {
      const currentPump = useIronTacticsMetaStore.getState().pump;
      const sec = getSecondsUntilNextPump(currentPump);
      setSecondsToNextPump(sec);
      if (sec === 0 && currentPump.current < currentPump.maxPassive) {
        useIronTacticsMetaStore.getState().syncPump();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const xpCost = getXpRequiredForLevel(level);
  const xpPct = Math.min(100, Math.round((xp / xpCost) * 100));

  const formatPumpTimer = (sec: number): string => {
    if (pump.current >= pump.maxPassive) return 'VOLL';
    if (sec <= 0) return 'bereit';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}h ${remM}m`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* Back to App + Level Avatar */}
      <View style={styles.leftRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToApp}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#00D2FF" />
          <Text style={styles.backText}>App</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.levelRing} onPress={onOpenProfile} activeOpacity={0.8}>
          <View style={styles.levelInner}>
            <Text style={styles.levelNum}>{level}</Text>
          </View>
          <View style={[styles.levelProgressBg, { width: `${xpPct}%` }]} />
        </TouchableOpacity>
      </View>

      {/* Currencies Bar */}
      <View style={styles.currenciesRow}>
        {/* Trophies */}
        <View style={styles.chip}>
          <Text style={styles.chipIcon}>🏆</Text>
          <Text style={styles.trophyVal}>{trophies}</Text>
        </View>

        {/* Eisen */}
        <View style={styles.chip}>
          <MaterialCommunityIcons name="nut" size={14} color="#A8B5C8" style={{ marginRight: 3 }} />
          <Text style={styles.eisenVal}>{eisen}</Text>
        </View>

        {/* Pump */}
        <View style={[styles.chip, pump.current > 0 ? styles.pumpActiveChip : styles.pumpEmptyChip]}>
          <MaterialCommunityIcons name="lightning-bolt" size={15} color="#FFD700" />
          <Text style={styles.pumpVal}>
            {pump.current}
            <Text style={styles.pumpMax}>/{pump.maxPassive}</Text>
          </Text>
          {pump.current < pump.maxPassive && (
            <Text style={styles.pumpTimer}>{formatPumpTimer(secondsToNextPump)}</Text>
          )}
        </View>

        {/* Protein-Shakes */}
        <View style={styles.chip}>
          <Text style={styles.chipIcon}>🥤</Text>
          <Text style={styles.shakeVal}>{shakes}</Text>
        </View>

        {/* Music Button */}
        {onToggleMusic && (
          <TouchableOpacity
            style={[
              styles.musicBtn,
              isMusicOpen && styles.musicBtnActive,
              isPlaying && styles.musicBtnPlaying,
            ]}
            onPress={() => {
              triggerLight();
              onToggleMusic();
            }}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <MaterialCommunityIcons
              name={isPlaying ? 'music' : 'music-note'}
              size={15}
              color={isMusicOpen || isPlaying ? '#00D2FF' : '#8E8E93'}
            />
            {isPlaying && <View style={styles.musicPlayingDot} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#0E0E14',
    borderBottomWidth: 1,
    borderBottomColor: '#20202C',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  backText: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: -2,
  },
  levelRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C1C28',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  levelInner: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNum: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  levelProgressBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.35)',
    zIndex: 1,
  },
  currenciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#262638',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  trophyVal: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  eisenVal: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
  },
  pumpActiveChip: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: '#1F1A08',
  },
  pumpEmptyChip: {
    borderColor: '#332020',
    backgroundColor: '#1A0E0E',
  },
  pumpVal: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 2,
  },
  pumpMax: {
    color: '#999',
    fontSize: 10,
    fontWeight: '600',
  },
  pumpTimer: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
  },
  shakeVal: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '900',
  },
  musicBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#262638',
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
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D2FF',
  },
});
