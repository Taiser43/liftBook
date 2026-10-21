import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IronTacticsHud } from '../../components/ironTactics/IronTacticsHud';
import { IronTacticsTopMusicBar } from '../../components/ironTactics/IronTacticsTopMusicBar';
import { ArenaHomeScreen } from './ArenaHomeScreen';
import { DeckScreen } from './DeckScreen';
import { GameShopScreen } from './GameShopScreen';
import { SeasonScreen } from './SeasonScreen';
import { ProfileScreen } from './ProfileScreen';
import { RunScreen } from './RunScreen';
import { GameModeId } from '../../components/ironTactics/IronTacticsModeCarousel';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';

interface Props {
  navigation: any;
}

export type DockTab = 'shop' | 'deck' | 'arena' | 'season' | 'profile';

const TABS: DockTab[] = ['shop', 'deck', 'arena', 'season', 'profile'];

export const IronTacticsShell: React.FC<Props> = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<DockTab>('arena');
  const [activeRunMode, setActiveRunMode] = useState<GameModeId | null>(null);
  const [musicBarVisible, setMusicBarVisible] = useState(false);

  const chests = useIronTacticsMetaStore(state => state.chests);
  const hasReadyChest = chests.some(c => c && c.state === 'ready');

  // Center on arena on mount
  useEffect(() => {
    const arenaIndex = TABS.indexOf('arena');
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: arenaIndex * screenWidth, animated: false });
    }, 40);
    return () => clearTimeout(timer);
  }, [screenWidth]);

  const handleBackToApp = () => {
    navigation.goBack();
  };

  const handleTabChange = (tab: DockTab) => {
    setActiveTab(tab);
    const idx = TABS.indexOf(tab);
    if (idx !== -1) {
      scrollRef.current?.scrollTo({ x: idx * screenWidth, animated: true });
    }
  };

  return (
    <View style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0E14" />

      {/* If in active run, show full run screen */}
      {activeRunMode ? (
        <RunScreen mode={activeRunMode} onExitRun={() => setActiveRunMode(null)} />
      ) : (
        <View style={styles.shellLayout}>
          {/* Top HUD */}
          <IronTacticsHud
            onBackToApp={handleBackToApp}
            onOpenProfile={() => handleTabChange('profile')}
            onToggleMusic={() => setMusicBarVisible(v => !v)}
            isMusicOpen={musicBarVisible}
          />

          {/* Top Dropdown Music Bar */}
          <IronTacticsTopMusicBar
            visible={musicBarVisible}
            onClose={() => setMusicBarVisible(false)}
          />

          {/* Swipeable Tabs Container */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            style={styles.mainContent}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              if (TABS[page] && TABS[page] !== activeTab) {
                setActiveTab(TABS[page]);
              }
            }}
          >
            <View style={{ width: screenWidth, flex: 1 }}>
              <GameShopScreen />
            </View>
            <View style={{ width: screenWidth, flex: 1 }}>
              <DeckScreen />
            </View>
            <View style={{ width: screenWidth, flex: 1 }}>
              <ArenaHomeScreen
                onStartRun={mode => setActiveRunMode(mode)}
                onNavigateTab={tab => handleTabChange(tab)}
              />
            </View>
            <View style={{ width: screenWidth, flex: 1 }}>
              <SeasonScreen />
            </View>
            <View style={{ width: screenWidth, flex: 1 }}>
              <ProfileScreen />
            </View>
          </ScrollView>

          {/* Bottom Dock */}
          <View style={[styles.dockBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8) }]}>
            {/* Shop */}
            <TouchableOpacity
              style={[styles.dockTab, activeTab === 'shop' && styles.dockTabActive]}
              onPress={() => handleTabChange('shop')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name="storefront-outline"
                size={22}
                color={activeTab === 'shop' ? '#00D2FF' : '#777'}
              />
              <Text style={[styles.dockLabel, activeTab === 'shop' && styles.dockLabelActive]}>
                Shop
              </Text>
            </TouchableOpacity>

            {/* Deck */}
            <TouchableOpacity
              style={[styles.dockTab, activeTab === 'deck' && styles.dockTabActive]}
              onPress={() => handleTabChange('deck')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name="cards-outline"
                size={22}
                color={activeTab === 'deck' ? '#00D2FF' : '#777'}
              />
              <Text style={[styles.dockLabel, activeTab === 'deck' && styles.dockLabelActive]}>
                Deck
              </Text>
            </TouchableOpacity>

            {/* Arena (Center, Prominent) */}
            <TouchableOpacity
              style={[styles.dockTabArena, activeTab === 'arena' && styles.dockTabArenaActive]}
              onPress={() => handleTabChange('arena')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="sword-cross"
                size={24}
                color={activeTab === 'arena' ? '#000' : '#00D2FF'}
              />
              <Text style={[styles.dockLabelArena, activeTab === 'arena' && styles.dockLabelArenaActive]}>
                Arena
              </Text>
              {hasReadyChest && <View style={styles.readyDot} />}
            </TouchableOpacity>

            {/* Season */}
            <TouchableOpacity
              style={[styles.dockTab, activeTab === 'season' && styles.dockTabActive]}
              onPress={() => handleTabChange('season')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name="trophy-award"
                size={22}
                color={activeTab === 'season' ? '#BF5AF2' : '#777'}
              />
              <Text style={[styles.dockLabel, activeTab === 'season' && { color: '#BF5AF2' }]}>
                Saison
              </Text>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              style={[styles.dockTab, activeTab === 'profile' && styles.dockTabActive]}
              onPress={() => handleTabChange('profile')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name="account-outline"
                size={22}
                color={activeTab === 'profile' ? '#00D2FF' : '#777'}
              />
              <Text style={[styles.dockLabel, activeTab === 'profile' && styles.dockLabelActive]}>
                Profil
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0E0E14',
  },
  shellLayout: {
    flex: 1,
    backgroundColor: '#0A0A10',
  },
  mainContent: {
    flex: 1,
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#12121A',
    borderTopWidth: 1,
    borderTopColor: '#222232',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    height: Platform.OS === 'ios' ? 76 : 64,
  },
  dockTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  dockTabActive: {
    //
  },
  dockLabel: {
    color: '#777',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  dockLabelActive: {
    color: '#00D2FF',
  },
  dockTabArena: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 62,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#161E28',
    borderWidth: 1.5,
    borderColor: '#00D2FF80',
    position: 'relative',
    top: -2,
  },
  dockTabArenaActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
    shadowColor: '#00D2FF',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  dockLabelArena: {
    color: '#00D2FF',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 1,
  },
  dockLabelArenaActive: {
    color: '#000',
  },
  readyDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
  },
});
