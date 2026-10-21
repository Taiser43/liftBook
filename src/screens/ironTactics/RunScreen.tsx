import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Animated,
  Vibration,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { useAutoChessStore, AutoChessUnit, AutoChessCardData } from '../../store/useAutoChessStore';
import { useAppStore } from '../../store/store';
import { getActiveIronTacticsArena, IronTacticsArena } from '../../constants/ironTacticsArenas';
import { AUTO_CHESS_ITEMS, AutoChessItem, rollMiniBossLoot } from '../../constants/autoChessItems';
import { ChestType } from '../../constants/ironTacticsChests';
import {
  RunUnit,
  ShopCardOffer,
  CampEventOption,
  calculateBoardSlots,
  rollCampEvents,
  checkAndPerformMerge,
} from '../../engine/ironTactics/runEngine';
import {
  buildActiveFighter,
  executeTurnStep,
  ActiveFighter,
  CombatEvent,
  CombatUnitData,
} from '../../engine/ironTactics/combatEngine';
import { calculateStagePlatesIncome } from '../../engine/ironTactics/economy';
import { resolveIronTacticsCardPool, getDeckCardsFromPool } from '../../engine/ironTactics/cardPoolEngine';
import { triggerSuccess, triggerWarning, triggerHeavy, triggerLight, triggerMedium } from '../../utils/haptics';
import { GameModeId } from '../../components/ironTactics/IronTacticsModeCarousel';
import { AutoChessCard } from '../../components/tcg/AutoChessCard';
import { WeightPlateIcon } from '../../components/tcg/WeightPlateIcon';
import { IronTacticsTopMusicBar } from '../../components/ironTactics/IronTacticsTopMusicBar';
import { usePlaybackState, State as PlaybackStateEnum, useActiveTrack } from 'react-native-track-player';
import { useMusicStore } from '../../store/useMusicStore';

interface RunDragState {
  unit: RunUnit;
  fromLocation: 'board' | 'bench';
  fromIndex: number;
}

interface RunDropTarget {
  type: 'board' | 'bench' | 'sell';
  index?: number;
  unitName?: string;
}

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  mode: GameModeId;
  onExitRun: () => void;
}

// Convert RunUnit or ActiveFighter to AutoChessUnit for rich rendering
export const toAutoChessUnit = (
  unit: RunUnit | ActiveFighter,
  pool: AutoChessCardData[],
  overrideStats?: { hp?: number; atk?: number }
): AutoChessUnit => {
  const name = 'name' in unit ? unit.name : (unit as any).exerciseName;
  const norm = (name || '').toLowerCase().trim();
  const cardDef = pool.find(c => c.exerciseName.toLowerCase().trim() === norm);

  const hp = overrideStats?.hp !== undefined 
    ? overrideStats.hp 
    : ('currentHp' in unit ? unit.currentHp : ('baseHp' in unit ? unit.baseHp : 100));
  const maxHp = 'maxHp' in unit ? unit.maxHp : ('baseHp' in unit ? unit.baseHp : 100);
  const atk = overrideStats?.atk !== undefined 
    ? overrideStats.atk 
    : ('atk' in unit ? unit.atk : ('baseAtk' in unit ? unit.baseAtk : 25));

  return {
    instanceId: unit.instanceId,
    cardId: cardDef?.id || unit.instanceId,
    exerciseName: name,
    category: unit.category,
    equipmentType: cardDef?.equipmentType || 'Freie Übung',
    imageUri: cardDef?.imageUri,
    stars: unit.stars || 1,
    atk,
    hp,
    maxHp,
    cost: cardDef?.cost || 2,
    powerScore: cardDef?.powerScore || 2,
    maxWeight: cardDef?.maxWeight || 0,
    totalSets: cardDef?.totalSets || 0,
    traitName: cardDef?.traitName || 'Kraft',
    traitDesc: cardDef?.traitDesc || '',
    items: unit.items || [],
    isBossUnit: ('isBoss' in unit && (unit as any).isBoss) || false,
  };
};

// Memoized combat unit slot with lunge & hit shake animation
const CombatUnitSlot = React.memo<{
  unit: AutoChessUnit;
  lungeAnim: Animated.Value;
  shakeAnim: Animated.Value;
  overrideHp?: number;
  isDead: boolean;
  floatingDmg: { text: string; isCrit?: boolean } | null;
  onPress?: () => void;
}>(({ unit, lungeAnim, shakeAnim, overrideHp, isDead, floatingDmg, onPress }) => {
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: lungeAnim },
          { translateX: shakeAnim },
        ],
      }}
    >
      <AutoChessCard
        data={unit}
        isBoard={true}
        size="compact"
        overrideHp={overrideHp}
        isDead={isDead}
        floatingDmg={floatingDmg}
        onPress={onPress}
      />
    </Animated.View>
  );
});

export const RunScreen: React.FC<Props> = ({ mode, onExitRun }) => {
  const {
    trophies,
    activeDeckIndex,
    decks,
    activeCoach,
    recordRunCompletion,
  } = useIronTacticsMetaStore();

  const customExercises = useAppStore(state => state.customExercises || []);
  const workoutPrograms = useAppStore(state => state.workoutPrograms);
  const globalActivePlan = useAppStore(state => state.globalActivePlan);

  const pool: AutoChessCardData[] = useMemo(() => resolveIronTacticsCardPool(), [customExercises, workoutPrograms, globalActivePlan]);
  const currentArena = getActiveIronTacticsArena(trophies);

  // Active Deck cards
  const activeDeck = decks[activeDeckIndex] || decks[0];
  const deckCards = getDeckCardsFromPool(activeDeck.cardIds, pool);
  const fallbackCards = deckCards.length >= 4 ? deckCards : (pool.length > 0 ? pool : resolveIronTacticsCardPool());

  // Run State
  const [stage, setStage] = useState(1);
  const [wave, setWave] = useState(1); // 1 to 4
  const [hearts, setHearts] = useState(3);
  const [plates, setPlates] = useState(6 + (activeCoach === 'str' ? 2 : 0));
  const [streak, setStreak] = useState(0);
  const [totalWavesWon, setTotalWavesWon] = useState(0);
  const [miniBossKills, setMiniBossKills] = useState(0);
  const [bossKills, setBossKills] = useState(0);

  // Units & Board Slots
  const [purchasedExtraSlots, setPurchasedExtraSlots] = useState(0);
  const maxBoardSlots = Math.min(5, calculateBoardSlots(stage, activeCoach) + purchasedExtraSlots);
  const [board, setBoard] = useState<(RunUnit | null)[]>([null, null, null]);
  const [bench, setBench] = useState<(RunUnit | null)[]>([null, null, null]);
  const [itemBag, setItemBag] = useState<AutoChessItem[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<{
    unit: RunUnit;
    location: 'board' | 'bench';
    index: number;
  } | null>(null);

  // Drag & Drop / Haptic Hold State
  const [dragState, setDragState] = useState<RunDragState | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeHoverTarget, setActiveHoverTarget] = useState<RunDropTarget | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References for measuring layout
  const containerRef = useRef<View | null>(null);
  const boardRefs = useRef<(View | null)[]>([]);
  const benchRefs = useRef<(View | null)[]>([]);
  const sellZoneRef = useRef<View | null>(null);

  const containerBounds = useRef<LayoutRect>({ x: 0, y: 0, width: 0, height: 0 });
  const boardBounds = useRef<LayoutRect[]>([]);
  const benchBounds = useRef<LayoutRect[]>([]);
  const sellBounds = useRef<LayoutRect | null>(null);

  // Touch tracking & long-press timer
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const activeHoverTargetRef = useRef<RunDropTarget | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Wiggle / vibrating visual animation during long-press drag
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const wiggleLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Keep board array in sync with unlocked slots (up to 5 in lategame)
  useEffect(() => {
    setBoard(prev => {
      if (prev.length < maxBoardSlots) {
        const next = [...prev];
        while (next.length < maxBoardSlots) {
          next.push(null);
        }
        return next;
      }
      return prev;
    });
  }, [maxBoardSlots]);

  // Shop
  const [shopCards, setShopCards] = useState<ShopCardOffer[]>([]);
  const [shopItem, setShopItem] = useState<AutoChessItem | null>(null);
  const [shopItemSold, setShopItemSold] = useState(false);
  const [freeReroll, setFreeReroll] = useState(currentArena.effectId === 'discipline');

  const insets = useSafeAreaInsets();
  const [musicBarVisible, setMusicBarVisible] = useState(false);
  const playbackState = usePlaybackState();
  const isMusicPlaying = playbackState.state === PlaybackStateEnum.Playing;

  // Combat
  const [combatPhase, setCombatPhase] = useState<'shop' | 'fight' | 'camp' | 'summary'>('shop');
  const [combatLog, setCombatLog] = useState<string>('Bereit für die nächste Welle');
  const [playerFighters, setPlayerFighters] = useState<ActiveFighter[]>([]);
  const [enemyFighters, setEnemyFighters] = useState<ActiveFighter[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const speedRef = useRef<1 | 2>(speedMultiplier);
  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // Animations & Floating Damage (like Live AutoChess)
  const playerLungeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const playerShakeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const enemyLungeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const enemyShakeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const [playerFloatingDmg, setPlayerFloatingDmg] = useState<Record<number, { text: string; isCrit?: boolean } | null>>({});
  const [enemyFloatingDmg, setEnemyFloatingDmg] = useState<Record<number, { text: string; isCrit?: boolean } | null>>({});

  // Modals & Events
  const [waveResultModal, setWaveResultModal] = useState<{
    won: boolean;
    platesWon: number;
    streak: number;
    isBoss: boolean;
    isMiniBoss: boolean;
    survivingUnits: number;
  } | null>(null);
  const [campEvents, setCampEvents] = useState<CampEventOption[]>([]);
  const [lootModalItem, setLootModalItem] = useState<AutoChessItem | null>(null);
  const [summaryData, setSummaryData] = useState<{
    victory: boolean;
    trophyDelta: number;
    eisenEarned: number;
    xpEarned: number;
    chestEarned?: ChestType;
  } | null>(null);

  const isFightingRef = useRef(false);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Shop card slot pop-in animations (matching Live AutoChess)
  const cardScaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const cardOpacityAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const playPopInAnimation = () => {
    cardScaleAnims.forEach(anim => anim.setValue(0.6));
    cardOpacityAnims.forEach(anim => anim.setValue(0));

    Animated.stagger(
      50,
      [0, 1, 2].map(i =>
        Animated.parallel([
          Animated.spring(cardScaleAnims[i], {
            toValue: 1,
            friction: 5.5,
            tension: 85,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacityAnims[i], {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ])
      )
    ).start();
  };

  const shake = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const lunge = (anim: Animated.Value, isPlayer: boolean, pace: number) => {
    const fwd = Math.min(160, Math.max(90, Math.round(pace * 0.22)));
    const back = Math.min(200, Math.max(110, Math.round(pace * 0.28)));
    Animated.sequence([
      Animated.timing(anim, {
        toValue: isPlayer ? -24 : 24,
        duration: fwd,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: back,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Initial shop roll
  useEffect(() => {
    rollShopOffers();
    playPopInAnimation();
    return () => {
      isFightingRef.current = false;
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, []);

  // Roll Shop cards & item deal
  const rollShopOffers = () => {
    const availablePool = fallbackCards.length > 0 ? fallbackCards : resolveIronTacticsCardPool();
    const cards: ShopCardOffer[] = [0, 1, 2].map(idx => {
      const cardDef = availablePool[Math.floor(Math.random() * availablePool.length)];
      const safeCost = cardDef?.cost || 2;
      return {
        id: `shop_${Date.now()}_${idx}_${Math.random()}`,
        cost: safeCost,
        sold: false,
        unit: {
          instanceId: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          cardId: cardDef?.id || `fallback_${idx}`,
          name: cardDef?.exerciseName || 'Hanteldrücken',
          category: cardDef?.category || 'Chest',
          stars: 1,
          baseAtk: cardDef?.baseAtk || 35,
          baseHp: cardDef?.baseHp || 90,
          cost: safeCost,
          items: [],
        },
      };
    });
    setShopCards(cards);

    // 30% chance for item deal
    if (Math.random() < 0.35) {
      const rndItem = AUTO_CHESS_ITEMS[Math.floor(Math.random() * AUTO_CHESS_ITEMS.length)];
      setShopItem(rndItem);
      setShopItemSold(false);
    } else {
      setShopItem(null);
      setShopItemSold(false);
    }
  };

  const handleReroll = () => {
    if (!freeReroll && plates < 2) {
      Alert.alert('Nicht genug Plates', 'Ein Reroll kostet 2 Plates.');
      return;
    }
    if (freeReroll) {
      setFreeReroll(false);
    } else {
      setPlates(p => p - 2);
    }
    rollShopOffers();
    playPopInAnimation();
    triggerLight();
  };

  // Helper to determine if buying a card enables 2★ or 3★
  const getUpgradeStatus = (cardId: string): 'lvl2' | 'lvl3' | 'owned' | null => {
    let oneStarCount = 0;
    let twoStarCount = 0;
    let threeStarCount = 0;

    board.forEach(u => {
      if (u && u.cardId === cardId) {
        if (u.stars === 1) oneStarCount++;
        else if (u.stars === 2) twoStarCount++;
        else if (u.stars === 3) threeStarCount++;
      }
    });
    bench.forEach(u => {
      if (u && u.cardId === cardId) {
        if (u.stars === 1) oneStarCount++;
        else if (u.stars === 2) twoStarCount++;
        else if (u.stars === 3) threeStarCount++;
      }
    });

    if (threeStarCount >= 1) return 'owned';
    if (twoStarCount >= 1 && oneStarCount >= 1) return 'lvl3';
    if (oneStarCount >= 1) return 'lvl2';
    if (twoStarCount >= 1) return 'owned';
    return null;
  };

  const slotUpgradeCost = maxBoardSlots === 3 ? 4 : 6;
  const handleUpgradeSlot = () => {
    if (maxBoardSlots >= 5) {
      Alert.alert('Maximales Squad', 'Du hast bereits die maximale Anzahl von 5 Kampffeld-Slots!');
      return;
    }
    if (plates < slotUpgradeCost) {
      Alert.alert('Zu wenig Plates', `Das Freischalten von Slot ${maxBoardSlots + 1} kostet ${slotUpgradeCost} Plates.`);
      return;
    }
    setPlates(p => p - slotUpgradeCost);
    setPurchasedExtraSlots(s => s + 1);
    triggerSuccess();
  };

  const handleBuyCard = (offerIndex: number) => {
    const offer = shopCards[offerIndex];
    if (!offer || offer.sold) return;

    if (plates < offer.cost) {
      Alert.alert('Nicht genug Plates', `Du benötigst ${offer.cost} Plates.`);
      return;
    }

    const upgradeStatus = getUpgradeStatus(offer.unit.cardId);
    const willMerge = upgradeStatus === 'lvl2' || upgradeStatus === 'lvl3';

    let newBoard = [...board];
    let newBench = [...bench];

    const emptyBoardIdx = newBoard.indexOf(null);
    const emptyBenchIdx = newBench.indexOf(null);

    if (emptyBoardIdx !== -1 && newBoard.filter(Boolean).length < maxBoardSlots) {
      newBoard[emptyBoardIdx] = offer.unit;
    } else if (emptyBenchIdx !== -1) {
      newBench[emptyBenchIdx] = offer.unit;
    } else if (willMerge) {
      // Board and bench are full, but buying this card will merge into an existing unit
      newBench.push(offer.unit);
    } else {
      Alert.alert('Kein Platz', 'Kampffeld und Bank sind voll. Verkaufe oder fusioniere erst eine Einheit.');
      return;
    }

    // Deduct cost
    setPlates(p => p - offer.cost);

    // Check cascading merge (1★ + 1★ -> 2★, 2★ + 2★ -> 3★ TITAN)
    const mergeRes = checkAndPerformMerge(newBoard, newBench);
    if (mergeRes.merged) {
      if (mergeRes.highestStar === 3) {
        triggerHeavy();
      } else {
        triggerSuccess();
      }
      setBoard(mergeRes.updatedBoard.slice(0, maxBoardSlots));
      setBench(mergeRes.updatedBench.slice(0, 3));
    } else {
      setBoard(newBoard.slice(0, maxBoardSlots));
      setBench(newBench.slice(0, 3));
      triggerSuccess();
    }

    // Immediate shop shuffle & spring animation like in original AutoChess!
    rollShopOffers();
    playPopInAnimation();
  };

  const handleBuyShopItem = () => {
    if (!shopItem || shopItemSold) return;
    const cost = activeCoach === 'str' ? Math.max(1, shopItem.cost - 1) : shopItem.cost;
    if (plates < cost) {
      Alert.alert('Nicht genug Plates', `Dieses Item kostet ${cost} Plates.`);
      return;
    }
    if (itemBag.length >= 4) {
      Alert.alert('Gym-Tasche voll', 'Du kannst maximal 4 Items in der Tasche haben.');
      return;
    }
    setPlates(p => p - cost);
    setItemBag(prev => [...prev, shopItem]);
    setShopItemSold(true);
    triggerSuccess();
  };

  const handleUnitPress = (unit: RunUnit, location: 'board' | 'bench', index: number) => {
    setSelectedUnit({ unit, location, index });
    triggerLight();
  };

  const handleMoveSelectedUnit = () => {
    if (!selectedUnit) return;
    const { location, index } = selectedUnit;
    setSelectedUnit(null);
    handleMoveUnit(location, index);
  };

  const handleSellSelectedUnit = () => {
    if (!selectedUnit) return;
    const { unit, location, index } = selectedUnit;
    const refund = unit.cost * (unit.stars === 1 ? 1 : unit.stars === 2 ? 2 : 4);

    const nextBoard = [...board];
    const nextBench = [...bench];
    if (location === 'board') nextBoard[index] = null;
    else nextBench[index] = null;

    setBoard(nextBoard);
    setBench(nextBench);
    setPlates(p => p + refund);

    // Return equipped items to itemBag
    if (unit.items && unit.items.length > 0) {
      setItemBag(prev => [...prev, ...unit.items].slice(0, 4));
    }

    setSelectedUnit(null);
    triggerSuccess();
  };

  const handleUnequipItemFromSelectedUnit = (itemIndex: number) => {
    if (!selectedUnit) return;
    if (itemBag.length >= 4) {
      Alert.alert('Gym-Tasche voll', 'Deine Gym-Tasche hat bereits 4 Items!');
      return;
    }
    const { unit, location, index } = selectedUnit;
    const currentItems = [...(unit.items || [])];
    const [removedItem] = currentItems.splice(itemIndex, 1);
    if (!removedItem) return;

    const updatedUnit: RunUnit = { ...unit, items: currentItems };
    if (location === 'board') {
      const nextBoard = [...board];
      nextBoard[index] = updatedUnit;
      setBoard(nextBoard);
    } else {
      const nextBench = [...bench];
      nextBench[index] = updatedUnit;
      setBench(nextBench);
    }
    setItemBag(prev => [...prev, removedItem].slice(0, 4));
    setSelectedUnit({ unit: updatedUnit, location, index });
    triggerLight();
  };

  const handleMoveUnit = (from: 'board' | 'bench', index: number) => {
    if (from === 'board') {
      const unit = board[index];
      if (!unit) return;
      const emptyBenchIdx = bench.indexOf(null);
      if (emptyBenchIdx === -1) {
        Alert.alert('Bank voll', 'Kein freier Platz auf der Reservebank.');
        return;
      }
      const newBoard = [...board];
      const newBench = [...bench];
      newBoard[index] = null;
      newBench[emptyBenchIdx] = unit;
      setBoard(newBoard);
      setBench(newBench);
    } else {
      const unit = bench[index];
      if (!unit) return;
      const activeBoardCount = board.filter(Boolean).length;
      if (activeBoardCount >= maxBoardSlots) {
        Alert.alert('Kampffeld voll', `Maximal ${maxBoardSlots} Einheiten erlaubt.`);
        return;
      }
      const emptyBoardIdx = board.indexOf(null);
      if (emptyBoardIdx === -1) return;
      const newBoard = [...board];
      const newBench = [...bench];
      newBench[index] = null;
      newBoard[emptyBoardIdx] = unit;
      setBoard(newBoard);
      setBench(newBench);
    }
  };

  const showToast = useCallback((msg: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastMessage(msg);
    toastTimeout.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const startWiggle = useCallback(() => {
    wiggleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleAnim, { toValue: -3.5, duration: 55, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 3.5, duration: 55, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -2.5, duration: 55, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 2.5, duration: 55, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
      ])
    );
    wiggleLoop.current.start();
  }, [wiggleAnim]);

  const stopWiggle = useCallback(() => {
    if (wiggleLoop.current) {
      wiggleLoop.current.stop();
      wiggleLoop.current = null;
    }
    wiggleAnim.setValue(0);
  }, [wiggleAnim]);

  const updateSlotBounds = useCallback(() => {
    containerRef.current?.measureInWindow?.((x, y, width, height) => {
      containerBounds.current = { x, y, width, height };
    });

    boardRefs.current.forEach((ref, idx) => {
      ref?.measureInWindow?.((x, y, width, height) => {
        boardBounds.current[idx] = { x, y, width, height };
      });
    });

    benchRefs.current.forEach((ref, idx) => {
      ref?.measureInWindow?.((x, y, width, height) => {
        benchBounds.current[idx] = { x, y, width, height };
      });
    });

    sellZoneRef.current?.measureInWindow?.((x, y, width, height) => {
      sellBounds.current = { x, y, width, height };
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateSlotBounds, 300);
    return () => clearTimeout(timer);
  }, [updateSlotBounds, board.length, bench.length, maxBoardSlots]);

  const calculateHoverTarget = useCallback((pageX: number, pageY: number): RunDropTarget | null => {
    // 1. Sell Zone check
    if (sellBounds.current) {
      const s = sellBounds.current;
      if (
        pageY >= s.y - 25 &&
        pageY <= s.y + s.height + 60 &&
        pageX >= s.x - 30 &&
        pageX <= s.x + s.width + 30
      ) {
        return { type: 'sell' };
      }
    }

    // Fallback: If dragged below the bench towards the shop area
    if (benchBounds.current.length > 0 && benchBounds.current[0]) {
      const benchY = benchBounds.current[0].y;
      const benchH = benchBounds.current[0].height;
      if (pageY > benchY + benchH + 20) {
        return { type: 'sell' };
      }
    }

    // 2. Bench slots check
    for (let i = 0; i < benchBounds.current.length; i++) {
      const b = benchBounds.current[i];
      if (
        b &&
        pageX >= b.x - 12 &&
        pageX <= b.x + b.width + 12 &&
        pageY >= b.y - 20 &&
        pageY <= b.y + b.height + 20
      ) {
        return {
          type: 'bench',
          index: i,
          unitName: bench[i]?.name,
        };
      }
    }

    // 3. Board slots check
    for (let i = 0; i < boardBounds.current.length; i++) {
      const b = boardBounds.current[i];
      if (
        b &&
        pageX >= b.x - 12 &&
        pageX <= b.x + b.width + 12 &&
        pageY >= b.y - 20 &&
        pageY <= b.y + b.height + 20
      ) {
        return {
          type: 'board',
          index: i,
          unitName: board[i]?.name,
        };
      }
    }

    return null;
  }, [bench, board]);

  const swapRunUnits = (
    fromLoc: 'board' | 'bench',
    fromIdx: number,
    toLoc: 'board' | 'bench',
    toIdx: number
  ) => {
    const nextBoard = [...board];
    const nextBench = [...bench];

    const sourceUnit = fromLoc === 'board' ? nextBoard[fromIdx] : nextBench[fromIdx];
    const destUnit = toLoc === 'board' ? nextBoard[toIdx] : nextBench[toIdx];

    if (!sourceUnit) return;

    if (fromLoc === toLoc) {
      if (fromLoc === 'board') {
        nextBoard[fromIdx] = destUnit;
        nextBoard[toIdx] = sourceUnit;
      } else {
        nextBench[fromIdx] = destUnit;
        nextBench[toIdx] = sourceUnit;
      }
    } else {
      if (fromLoc === 'board' && toLoc === 'bench') {
        nextBoard[fromIdx] = destUnit;
        nextBench[toIdx] = sourceUnit;
      } else {
        nextBench[fromIdx] = destUnit;
        nextBoard[toIdx] = sourceUnit;
      }
    }

    setBoard(nextBoard);
    setBench(nextBench);
  };

  const startDrag = useCallback((
    unit: RunUnit,
    location: 'board' | 'bench',
    index: number,
    x: number,
    y: number
  ) => {
    triggerHeavy();
    Vibration.vibrate([0, 50, 40, 50]);
    startWiggle();

    setDragState({ unit, fromLocation: location, fromIndex: index });
    setTouchPos({ x, y });
    updateSlotBounds();
  }, [startWiggle, updateSlotBounds]);

  const updateDrag = useCallback((x: number, y: number) => {
    setTouchPos({ x, y });
    const target = calculateHoverTarget(x, y);

    const prev = activeHoverTargetRef.current;
    const hasChanged =
      (!prev && target) ||
      (prev && !target) ||
      (prev && target && (prev.type !== target.type || prev.index !== target.index));

    if (hasChanged) {
      if (target) {
        triggerLight();
      }
      activeHoverTargetRef.current = target;
      setActiveHoverTarget(target);
    }
  }, [calculateHoverTarget]);

  const endDrag = useCallback((x: number, y: number) => {
    stopWiggle();

    if (!dragState) return;

    const finalTarget = calculateHoverTarget(x, y) || activeHoverTargetRef.current;
    const { unit, fromLocation, fromIndex } = dragState;

    if (finalTarget) {
      if (finalTarget.type === 'sell') {
        const refund = unit.cost * (unit.stars === 1 ? 1 : unit.stars === 2 ? 2 : 4);
        const nextBoard = [...board];
        const nextBench = [...bench];
        if (fromLocation === 'board') nextBoard[fromIndex] = null;
        else nextBench[fromIndex] = null;

        setBoard(nextBoard);
        setBench(nextBench);
        setPlates(p => p + refund);

        if (unit.items && unit.items.length > 0) {
          setItemBag(prev => [...prev, ...unit.items].slice(0, 4));
        }

        triggerSuccess();
        Vibration.vibrate(50);
        showToast(`💰 "${unit.name}" direkt verkauft (+${refund} Plates)!`);
      } else if (finalTarget.type === 'board' && finalTarget.index !== undefined) {
        const targetIdx = finalTarget.index;
        const targetUnit = board[targetIdx];
        swapRunUnits(fromLocation, fromIndex, 'board', targetIdx);
        triggerSuccess();
        Vibration.vibrate(35);
        if (targetUnit) {
          showToast(`🔄 1:1 Tausch: "${unit.name}" ↔ "${targetUnit.name}"`);
        } else {
          showToast(`⚔️ "${unit.name}" aufs Kampffeld gestellt!`);
        }
      } else if (finalTarget.type === 'bench' && finalTarget.index !== undefined) {
        const targetIdx = finalTarget.index;
        const targetUnit = bench[targetIdx];
        swapRunUnits(fromLocation, fromIndex, 'bench', targetIdx);
        triggerSuccess();
        Vibration.vibrate(35);
        if (targetUnit) {
          showToast(`🔄 1:1 Tausch: "${unit.name}" ↔ "${targetUnit.name}"`);
        } else {
          showToast(`📦 "${unit.name}" auf die Bank gelegt!`);
        }
      }
    }

    setDragState(null);
    setActiveHoverTarget(null);
    activeHoverTargetRef.current = null;
  }, [dragState, calculateHoverTarget, board, bench, stopWiggle, showToast]);

  const cancelDrag = useCallback(() => {
    stopWiggle();
    setDragState(null);
    setActiveHoverTarget(null);
    activeHoverTargetRef.current = null;
  }, [stopWiggle]);

  const handleSlotTouchStart = (
    e: GestureResponderEvent,
    unit: RunUnit,
    location: 'board' | 'bench',
    index: number
  ) => {
    isLongPressActive.current = false;
    touchStartPos.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      startDrag(unit, location, index, touchStartPos.current.x, touchStartPos.current.y);
    }, 220);
  };

  const handleSlotTouchMove = (e: GestureResponderEvent) => {
    const currentX = e.nativeEvent.pageX;
    const currentY = e.nativeEvent.pageY;

    if (!isLongPressActive.current) {
      const dx = Math.abs(currentX - touchStartPos.current.x);
      const dy = Math.abs(currentY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    } else {
      updateDrag(currentX, currentY);
    }
  };

  const handleSlotTouchEnd = (
    e: GestureResponderEvent,
    unit: RunUnit,
    location: 'board' | 'bench',
    index: number
  ) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      endDrag(e.nativeEvent.pageX, e.nativeEvent.pageY);
    } else {
      const dx = Math.abs(e.nativeEvent.pageX - touchStartPos.current.x);
      const dy = Math.abs(e.nativeEvent.pageY - touchStartPos.current.y);
      if (dx < 12 && dy < 12) {
        handleUnitPress(unit, location, index);
      }
    }
  };

  const handleSlotTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      cancelDrag();
    }
  };

  // Calculate synergies
  const synergyCounts: Record<string, number> = {};
  board.filter((u): u is RunUnit => u !== null).forEach(u => {
    synergyCounts[u.category] = (synergyCounts[u.category] || 0) + 1;
  });

  // Start Battle
  const handleStartBattle = () => {
    const activeUnits = board.filter((u): u is RunUnit => u !== null);
    if (activeUnits.length === 0) {
      Alert.alert('Keine Einheit', 'Platziere mindestens 1 Einheit auf dem Kampffeld.');
      return;
    }

    const isBoss = stage === 5 && wave === 4;
    const isMiniBoss = wave === 4 && !isBoss;

    // Convert player units to active fighters
    const pFighters: ActiveFighter[] = activeUnits.map(u =>
      buildActiveFighter(
        {
          instanceId: u.instanceId,
          name: u.name,
          category: u.category,
          stars: u.stars,
          baseAtk: u.baseAtk,
          baseHp: u.baseHp,
          items: u.items,
        },
        true,
        synergyCounts as any,
        currentArena.effectId,
        activeCoach,
        false
      )
    );

    // Generate enemy fighters
    const totalPlayerCP = pFighters.reduce((s, p) => s + p.atk * 1.5 + p.maxHp, 0);
    // Smooth difficulty progression curve (Warmup W1 -> Fair W2 -> Tactical W3 -> Boss W4)
    const difficultyMultiplier = isBoss ? 1.15 : isMiniBoss ? 1.05 : 0.78 + (wave - 1) * 0.08;
    const targetCP = Math.max(140, Math.round(totalPlayerCP * difficultyMultiplier));

    // Fair unit count: Enemies never outnumber player units on normal waves
    const enemyCount = isBoss
      ? Math.min(4, Math.max(2, activeUnits.length))
      : isMiniBoss
      ? Math.min(3, Math.max(2, activeUnits.length))
      : Math.min(maxBoardSlots, Math.max(1, activeUnits.length));
    const eFighters: ActiveFighter[] = [];

    const availableEnemyPool = fallbackCards.length > 0 ? fallbackCards : resolveIronTacticsCardPool();
    const targetCpPerUnit = Math.round(targetCP / enemyCount);

    for (let i = 0; i < enemyCount; i++) {
      const rndCard = availableEnemyPool[Math.floor(Math.random() * availableEnemyPool.length)];
      // Fair stat split: 72% HP / 28% ATK (prevents glass-cannon 1-hit-KOs)
      const hpShare = isMiniBoss && i === 0 ? 0.76 : 0.72;
      const atkShare = isMiniBoss && i === 0 ? 0.24 : 0.28;
      const baseShareHp = Math.round(targetCpPerUnit * hpShare);
      const baseShareAtk = Math.max(16, Math.round((targetCpPerUnit * atkShare) / 1.5));
      const safeCardName = rndCard?.exerciseName || 'Schatten-Krieger';
      const safeCategory = rndCard?.category || 'Chest';

      const eData: CombatUnitData = {
        instanceId: `enemy_${i}`,
        name: isBoss
          ? ['Schatten-Hieb', 'Schatten-Squat', 'Schatten-Press', 'Schatten-Pull'][i]
          : isMiniBoss
          ? (i === 0 ? `Mini-Titan ${safeCardName}` : `Handlanger ${safeCardName}`)
          : safeCardName,
        category: safeCategory,
        stars: isBoss || (isMiniBoss && i === 0) ? 2 : 1,
        baseAtk: baseShareAtk,
        baseHp: baseShareHp,
        items: isMiniBoss && i === 0 ? [AUTO_CHESS_ITEMS[0]] : [],
        isBoss,
      };

      eFighters.push(
        buildActiveFighter(
          eData,
          false,
          {} as any,
          currentArena.effectId,
          null,
          false
        )
      );
    }

    setPlayerFighters(pFighters);
    setEnemyFighters(eFighters);
    setCombatPhase('fight');
    setCombatLog(`⚔️ Stage ${stage} · Welle ${wave} gestartet!`);
    isFightingRef.current = true;
    triggerHeavy();

    runBattleLoop(1, pFighters, eFighters, 'player', 0, 0);
  };

  const runBattleLoop = (
    step: number,
    currPlayers: ActiveFighter[],
    currEnemies: ActiveFighter[],
    attackerSide: 'player' | 'enemy' = 'player',
    playerAttackerIdx: number = 0,
    enemyAttackerIdx: number = 0
  ) => {
    if (!isFightingRef.current) return;

    const alivePlayers = currPlayers.filter(p => !p.isDead && p.currentHp > 0);
    const aliveEnemies = currEnemies.filter(e => !e.isDead && e.currentHp > 0);

    // Victory Check
    if (aliveEnemies.length === 0) {
      finishBattle(true);
      return;
    }
    // Defeat Check
    if (alivePlayers.length === 0) {
      finishBattle(false);
      return;
    }

    // Pacing: 850ms base per action (~10s in early game, 30-40s in late game).
    // In 2x speed mode, pace drops to 425ms per action.
    const basePace = 850;
    const pace = speedRef.current === 2 ? Math.round(basePace / 2) : basePace;

    let nextSide: 'player' | 'enemy' = attackerSide === 'player' ? 'enemy' : 'player';
    let nextPIdx = playerAttackerIdx;
    let nextEIdx = enemyAttackerIdx;

    if (attackerSide === 'player') {
      let pIdx = -1;
      for (let offset = 0; offset < currPlayers.length; offset++) {
        const checkIdx = (playerAttackerIdx + offset) % currPlayers.length;
        if (!currPlayers[checkIdx].isDead && currPlayers[checkIdx].currentHp > 0) {
          pIdx = checkIdx;
          break;
        }
      }

      if (pIdx !== -1) {
        nextPIdx = (pIdx + 1) % currPlayers.length;
        const tick = Math.floor(step / 2) + 1;
        const event = executeTurnStep(tick, 'player', pIdx, currPlayers, currEnemies, currentArena.effectId, activeCoach);
        if (event) {
          setCombatLog(event.message);
          const lungeTarget = playerLungeAnims[event.attackerIndex] || playerLungeAnims[0];
          const shakeTarget = enemyShakeAnims[event.targetIndex] || enemyShakeAnims[0];
          lunge(lungeTarget, true, pace);

          const impactDelay = Math.min(160, Math.round(pace * 0.22));
          setTimeout(() => {
            shake(shakeTarget);
            const dmgText = event.isBlocked ? '🛡️ BLOCKED' : `-${event.damage}`;
            setEnemyFloatingDmg(prev => ({ ...prev, [event.targetIndex]: { text: dmgText, isCrit: event.isCrit } }));
            setTimeout(() => {
              setEnemyFloatingDmg(prev => ({ ...prev, [event.targetIndex]: null }));
            }, Math.round(pace * 0.65));

            if (event.isKill) triggerHeavy();
            else if (event.isCrit) triggerMedium();
            else triggerLight();
          }, impactDelay);
        }
      }
    } else {
      let eIdx = -1;
      for (let offset = 0; offset < currEnemies.length; offset++) {
        const checkIdx = (enemyAttackerIdx + offset) % currEnemies.length;
        if (!currEnemies[checkIdx].isDead && currEnemies[checkIdx].currentHp > 0) {
          eIdx = checkIdx;
          break;
        }
      }

      if (eIdx !== -1) {
        nextEIdx = (eIdx + 1) % currEnemies.length;
        const tick = Math.floor(step / 2) + 1;
        const event = executeTurnStep(tick, 'enemy', eIdx, currEnemies, currPlayers, currentArena.effectId, activeCoach);
        if (event) {
          setCombatLog(event.message);
          const lungeTarget = enemyLungeAnims[event.attackerIndex] || enemyLungeAnims[0];
          const shakeTarget = playerShakeAnims[event.targetIndex] || playerShakeAnims[0];
          lunge(lungeTarget, false, pace);

          const impactDelay = Math.min(160, Math.round(pace * 0.22));
          setTimeout(() => {
            shake(shakeTarget);
            const dmgText = event.isBlocked ? '🛡️ BLOCKED' : `-${event.damage}`;
            setPlayerFloatingDmg(prev => ({ ...prev, [event.targetIndex]: { text: dmgText, isCrit: event.isCrit } }));
            setTimeout(() => {
              setPlayerFloatingDmg(prev => ({ ...prev, [event.targetIndex]: null }));
            }, Math.round(pace * 0.65));

            if (event.isKill) triggerHeavy();
            else if (event.isCrit) triggerMedium();
            else triggerLight();
          }, impactDelay);
        }
      }
    }

    setPlayerFighters([...currPlayers]);
    setEnemyFighters([...currEnemies]);

    // Check if either side was defeated
    const hasAliveEnemies = currEnemies.some(e => !e.isDead && e.currentHp > 0);
    const hasAlivePlayers = currPlayers.some(p => !p.isDead && p.currentHp > 0);

    if (!hasAliveEnemies) {
      setTimeout(() => finishBattle(true), Math.round(pace * 0.5));
      return;
    }
    if (!hasAlivePlayers) {
      setTimeout(() => finishBattle(false), Math.round(pace * 0.5));
      return;
    }

    turnTimerRef.current = setTimeout(() => {
      runBattleLoop(step + 1, currPlayers, currEnemies, nextSide, nextPIdx, nextEIdx);
    }, pace);
  };

  const finishBattle = (won: boolean) => {
    isFightingRef.current = false;
    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);

    const isBoss = stage === 5 && wave === 4;
    const isMiniBoss = wave === 4 && !isBoss;

    if (won) {
      triggerSuccess();
      const newStreak = streak + 1;
      setStreak(newStreak);
      setTotalWavesWon(w => w + 1);

      // Economy overhaul: 5 base + streak bonus (up to +3) + miniBoss (4) / boss (8) + interest (1 per 5 plates, max +3)
      const interest = Math.min(3, Math.floor(plates / 5));
      const streakBonus = Math.min(3, Math.max(0, newStreak - 1));
      const platesWon = 5 + streakBonus + (isBoss ? 8 : isMiniBoss ? 4 : 0) + interest;
      setPlates(p => p + platesWon);

      // Streak reward: Free shop reroll if streak >= 2
      if (newStreak >= 2) {
        setFreeReroll(true);
      }

      if (isMiniBoss) {
        setMiniBossKills(m => m + 1);
        const droppedItem = rollMiniBossLoot();
        setLootModalItem(droppedItem);
      }

      if (isBoss) {
        setBossKills(b => b + 1);
      }

      const survivingUnits = playerFighters.filter(p => !p.isDead && p.currentHp > 0).length;
      setWaveResultModal({
        won: true,
        platesWon,
        streak: newStreak,
        isBoss,
        isMiniBoss,
        survivingUnits: Math.max(1, survivingUnits),
      });
    } else {
      triggerWarning();
      setStreak(0);
      const remainingHearts = Math.max(0, hearts - (isBoss ? 2 : 1));
      setHearts(remainingHearts);

      // Consolation bounty on defeat: 4 plates (up from 2) + interest so player can buy/reroll to recover
      const interest = Math.min(3, Math.floor(plates / 5));
      const platesWon = 4 + interest;
      setPlates(p => p + platesWon);

      setWaveResultModal({
        won: false,
        platesWon,
        streak: 0,
        isBoss,
        isMiniBoss,
        survivingUnits: 0,
      });
    }
  };

  const handleConfirmWaveResult = () => {
    if (!waveResultModal) return;
    const { won, isBoss } = waveResultModal;
    setWaveResultModal(null);

    if (won) {
      if (isBoss) {
        finishRun(true);
        return;
      }
      if (wave === 4) {
        setCombatPhase('camp');
        setCampEvents(rollCampEvents(stage));
      } else {
        setWave(w => w + 1);
        setCombatPhase('shop');
        rollShopOffers();
        playPopInAnimation();
      }
    } else {
      if (hearts <= 0) {
        finishRun(false);
      } else {
        setCombatPhase('shop');
        rollShopOffers();
        playPopInAnimation();
      }
    }
  };

  const handleSelectCampEvent = (event: CampEventOption) => {
    triggerSuccess();
    if (event.type === 'heal_heart') {
      setHearts(h => Math.min(3, h + 1));
    } else if (event.type === 'loot_item') {
      const rndIt = AUTO_CHESS_ITEMS[Math.floor(Math.random() * AUTO_CHESS_ITEMS.length)];
      setItemBag(prev => [...prev.slice(0, 3), rndIt]);
    }

    // Advance to next stage
    const nextStage = stage + 1;
    setStage(nextStage);
    setWave(1);
    setCombatPhase('shop');

    // Stage income
    const income = calculateStagePlatesIncome(plates, streak);
    setPlates(p => p + income.total);

    // Free reroll for discipline arena
    if (currentArena.effectId === 'discipline') {
      setFreeReroll(true);
    }
    rollShopOffers();
    playPopInAnimation();
  };

  const finishRun = (victory: boolean) => {
    isFightingRef.current = false;
    let chestEarned: ChestType | undefined = undefined;
    if (victory) {
      chestEarned = stage >= 5 ? 'vault' : 'locker';
    } else if (stage >= 3) {
      chestEarned = 'dumbbell';
    }

    const { trophyDelta, eisenEarned, xpEarned } = recordRunCompletion({
      wavesWon: totalWavesWon + (victory ? 1 : 0),
      stageReached: stage,
      arenaIndex: currentArena.requiredTrophies >= 1000 ? 3 : 1,
      bossKills: bossKills + (victory ? 1 : 0),
      miniBossKills,
      chestEarned,
    });

    setSummaryData({
      victory,
      trophyDelta,
      eisenEarned,
      xpEarned,
      chestEarned,
    });
    setCombatPhase('summary');
  };


  return (
    <View style={styles.container} ref={containerRef} onLayout={updateSlotBounds}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={styles.toastContainer} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Run Top HUD */}
      <View style={[styles.topHud, { paddingTop: Math.max(insets.top + 6, 44) }]}>
        <TouchableOpacity
          style={styles.exitBtn}
          onPress={() => {
            Alert.alert('Run aufgeben?', 'Dein bisheriger Fortschritt wird abgerechnet.', [
              { text: 'Weiterspielen', style: 'cancel' },
              { text: 'Aufgeben', style: 'destructive', onPress: () => finishRun(false) },
            ]);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.stageCol}>
          <Text style={styles.stageTitle}>
            Stage {stage}/5 · Welle {wave}/4
          </Text>
          <Text style={styles.stageArena}>{currentArena.name}</Text>
        </View>

        <View style={styles.hudRight}>
          <View style={styles.topHudRightRow}>
            <View style={styles.heartsRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text key={i} style={{ fontSize: 14, opacity: i < hearts ? 1 : 0.25 }}>
                  ❤️
                </Text>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.runMusicBtn,
                musicBarVisible && styles.runMusicBtnActive,
                isMusicPlaying && styles.runMusicBtnPlaying,
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
              {isMusicPlaying && <View style={styles.runMusicDot} />}
            </TouchableOpacity>
          </View>

          <View style={styles.platesChip}>
            <WeightPlateIcon size={16} color="#FFD700" style={{ marginRight: 4 }} />
            <Text style={styles.platesVal}>{plates}</Text>
          </View>
        </View>
      </View>

      {/* Top Dropdown Music Bar */}
      <IronTacticsTopMusicBar
        visible={musicBarVisible}
        onClose={() => setMusicBarVisible(false)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
        scrollEnabled={!dragState}
      >
        {/* Arena Effect Banner */}
        <View style={[styles.effectChip, { borderColor: `${currentArena.primaryColor}50` }]}>
          <MaterialCommunityIcons name="auto-fix" size={15} color={currentArena.primaryColor} />
          <Text style={[styles.effectText, { color: currentArena.primaryColor }]}>
            ✨ {currentArena.effectName}: {currentArena.effectDescription}
          </Text>
        </View>

        {/* ── FIGHT VIEW (Like Live AutoChess) ── */}
        {combatPhase === 'fight' ? (
          <View
            style={[
              styles.arenaCombatContainer,
              {
                backgroundColor: currentArena.backgroundColor || '#0E0E14',
                borderColor: currentArena.borderColor || '#20202A',
                shadowColor: currentArena.primaryColor || '#00D2FF',
              },
            ]}
          >
            {/* 1. ENEMY BRIGADE */}
            <View style={styles.formationBox}>
              <View style={styles.squadHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.enemyIconCircle, (stage === 5 && wave === 4) && styles.bossIconCircle]}>
                    <MaterialCommunityIcons
                      name={(stage === 5 && wave === 4) ? 'crown' : wave === 4 ? 'skull' : 'sword-cross'}
                      size={15}
                      color="#FF453A"
                    />
                  </View>
                  <Text style={styles.squadHeaderText}>
                    {(stage === 5 && wave === 4)
                      ? '👑 SCHATTEN-TITAN'
                      : wave === 4
                      ? '💀 MINI-BOSS'
                      : 'GEGNERISCHE BRIGADE'}
                  </Text>
                </View>
                <Text style={styles.squadCountText}>
                  {enemyFighters.filter(e => !e.isDead && e.currentHp > 0).length} / {enemyFighters.length} aktiv
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fightersScroll}>
                {enemyFighters.map((e, idx) => (
                  <CombatUnitSlot
                    key={e.instanceId || `enemy_${idx}`}
                    unit={toAutoChessUnit(e, pool, { hp: e.currentHp, atk: e.atk })}
                    lungeAnim={enemyLungeAnims[idx] || enemyLungeAnims[0]}
                    shakeAnim={enemyShakeAnims[idx] || enemyShakeAnims[0]}
                    overrideHp={e.currentHp}
                    isDead={e.isDead || e.currentHp <= 0}
                    floatingDmg={enemyFloatingDmg[idx] || null}
                  />
                ))}
              </ScrollView>
            </View>

            {/* 2. CENTER COMBAT HUD */}
            <View style={styles.centerCombatHud}>
              <View style={styles.liveStatusBadge}>
                <MaterialCommunityIcons name="sword-cross" size={15} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={styles.liveStatusText} numberOfLines={1}>
                  {combatLog}
                </Text>
              </View>

              <View style={styles.combatControlsRow}>
                <TouchableOpacity
                  style={styles.speedToggleBtn}
                  onPress={() => setSpeedMultiplier(s => (s === 1 ? 2 : 1))}
                  activeOpacity={0.75}
                >
                  <Text style={styles.speedToggleText}>{speedMultiplier}× TEMPO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sofortSiegBtn}
                  onPress={() => {
                    isFightingRef.current = false;
                    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
                    finishBattle(true);
                  }}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="fast-forward" size={14} color="#FF9500" style={{ marginRight: 3 }} />
                  <Text style={styles.sofortSiegText}>Sofort-Sieg</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. PLAYER FORMATION */}
            <View style={styles.formationBox}>
              <View style={styles.squadHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.playerIconCircle}>
                    <MaterialCommunityIcons name="shield-check" size={15} color="#30D158" />
                  </View>
                  <Text style={styles.squadHeaderText}>DEIN KRAFT-KADER</Text>
                </View>
                <Text style={[styles.squadCountText, { color: '#30D158' }]}>
                  {playerFighters.filter(p => !p.isDead && p.currentHp > 0).length} / {playerFighters.length} aktiv
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fightersScroll}>
                {playerFighters.map((p, idx) => (
                  <CombatUnitSlot
                    key={p.instanceId || `player_${idx}`}
                    unit={toAutoChessUnit(p, pool, { hp: p.currentHp, atk: p.atk })}
                    lungeAnim={playerLungeAnims[idx] || playerLungeAnims[0]}
                    shakeAnim={playerShakeAnims[idx] || playerShakeAnims[0]}
                    overrideHp={p.currentHp}
                    isDead={p.isDead || p.currentHp <= 0}
                    floatingDmg={playerFloatingDmg[idx] || null}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          /* ── SHOP & BOARD PREPARATION VIEW ── */
          <View>
            {/* 1. Kampffeld Board */}
            <View style={styles.secRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.secHeading}>KAMPFFELD</Text>
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{board.filter(Boolean).length}/{maxBoardSlots}</Text>
                </View>
              </View>
              {maxBoardSlots < 5 ? (
                <TouchableOpacity style={styles.slotUpgradeBtn} onPress={handleUpgradeSlot} activeOpacity={0.8}>
                  <WeightPlateIcon size={12} color="#00D2FF" style={{ marginRight: 4 }} />
                  <Text style={styles.slotUpgradeText}>+1 Slot ({slotUpgradeCost} Plates)</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.secHint}>Halten: Ziehen & Tauschen · Tippen: Details</Text>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.boardSlotsScroll}
              scrollEnabled={!dragState}
            >
              {Array.from({ length: maxBoardSlots }).map((_, idx) => {
                const unit = board[idx];
                const isThisDragged = dragState?.fromLocation === 'board' && dragState?.fromIndex === idx;
                const isDropHover = activeHoverTarget?.type === 'board' && activeHoverTarget?.index === idx;

                return (
                  <View
                    key={`board_${idx}`}
                    ref={(el) => { boardRefs.current[idx] = el; }}
                    onLayout={updateSlotBounds}
                    style={[
                      styles.slotWrapper,
                      isDropHover && styles.slotHoverBoard,
                    ]}
                  >
                    {unit ? (
                      <View
                        onTouchStart={(e) => handleSlotTouchStart(e, unit, 'board', idx)}
                        onTouchMove={handleSlotTouchMove}
                        onTouchEnd={(e) => handleSlotTouchEnd(e, unit, 'board', idx)}
                        onTouchCancel={handleSlotTouchCancel}
                      >
                        <Animated.View
                          style={[
                            isThisDragged && {
                              transform: [{ translateX: wiggleAnim }, { scale: 1.05 }],
                              opacity: 0.35,
                            },
                          ]}
                        >
                          <AutoChessCard
                            data={toAutoChessUnit(unit, pool)}
                            isBoard={true}
                            size="compact"
                          />
                        </Animated.View>

                        {/* 1:1 Swap Hover Overlay */}
                        {isDropHover && !isThisDragged && (
                          <View style={styles.swapBadgeOverlay}>
                            <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#00D2FF" />
                            <Text style={styles.swapBadgeText}>1:1 TAUSCH</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.emptySlotBox,
                          isDropHover && styles.emptySlotHoverBox,
                        ]}
                        onPress={() => {
                          const firstBench = bench.findIndex(Boolean);
                          if (firstBench !== -1) handleMoveUnit('bench', firstBench);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={isDropHover ? "arrow-down-bold-circle" : "shield-outline"}
                          size={isDropHover ? 30 : 28}
                          color={isDropHover ? "#00D2FF" : "#2A2A38"}
                        />
                        <Text style={[styles.emptySlotTitle, isDropHover && { color: '#00D2FF' }]}>
                          {isDropHover ? 'Hier ablegen ⬇️' : `Slot ${idx + 1}`}
                        </Text>
                        <Text style={styles.emptySlotSub}>
                          {isDropHover ? 'Loslassen zum Platzieren' : 'Frei (Tippen / Ziehen)'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {/* Locked Slot Tile if < 5 */}
              {maxBoardSlots < 5 && (
                <TouchableOpacity
                  key={`locked_slot_${maxBoardSlots}`}
                  style={styles.lockedSlotBox}
                  onPress={handleUpgradeSlot}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="lock" size={24} color="#71717A" />
                  <Text style={styles.lockedSlotTitle}>Slot {maxBoardSlots + 1}</Text>
                  <Text style={styles.lockedSlotSub}>
                    {`Stage ${maxBoardSlots === 3 ? '2' : '4'}\noder ${slotUpgradeCost} Plates`}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* 2. Reservebank */}
            <View style={[styles.secRow, { marginTop: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.secHeading}>RESERVEBANK</Text>
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{bench.filter(Boolean).length}/3</Text>
                </View>
              </View>
              <Text style={styles.secHint}>Halten: Ziehen & Tauschen · Tippen: Details</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.boardSlotsScroll}
              scrollEnabled={!dragState}
            >
              {bench.map((unit, idx) => {
                const isThisDragged = dragState?.fromLocation === 'bench' && dragState?.fromIndex === idx;
                const isDropHover = activeHoverTarget?.type === 'bench' && activeHoverTarget?.index === idx;

                return (
                  <View
                    key={`bench_${idx}`}
                    ref={(el) => { benchRefs.current[idx] = el; }}
                    onLayout={updateSlotBounds}
                    style={[
                      styles.slotWrapper,
                      isDropHover && styles.slotHoverBench,
                    ]}
                  >
                    {unit ? (
                      <View
                        onTouchStart={(e) => handleSlotTouchStart(e, unit, 'bench', idx)}
                        onTouchMove={handleSlotTouchMove}
                        onTouchEnd={(e) => handleSlotTouchEnd(e, unit, 'bench', idx)}
                        onTouchCancel={handleSlotTouchCancel}
                      >
                        <Animated.View
                          style={[
                            isThisDragged && {
                              transform: [{ translateX: wiggleAnim }, { scale: 1.05 }],
                              opacity: 0.35,
                            },
                          ]}
                        >
                          <AutoChessCard
                            data={toAutoChessUnit(unit, pool)}
                            isBoard={true}
                            size="compact"
                          />
                        </Animated.View>

                        {/* 1:1 Swap Hover Overlay */}
                        {isDropHover && !isThisDragged && (
                          <View style={styles.swapBadgeOverlay}>
                            <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#30D158" />
                            <Text style={[styles.swapBadgeText, { color: '#30D158' }]}>1:1 TAUSCH</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.emptyBenchBox, isDropHover && styles.emptyBenchHoverBox]}>
                        <MaterialCommunityIcons
                          name={isDropHover ? "arrow-down-bold-circle" : "cards-outline"}
                          size={isDropHover ? 26 : 24}
                          color={isDropHover ? "#30D158" : "#242434"}
                        />
                        <Text style={[styles.emptyBenchText, isDropHover && { color: '#30D158' }]}>
                          {isDropHover ? 'Hier ablegen ⬇️' : `Bank ${idx + 1}`}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* 2.5 Sell Drop Zone (Hold & Drag Down to Sell) */}
            <View
              ref={sellZoneRef}
              onLayout={updateSlotBounds}
              style={[
                styles.sellDropZone,
                dragState && styles.sellDropZoneVisible,
                activeHoverTarget?.type === 'sell' && styles.sellDropZoneActive,
              ]}
            >
              <MaterialCommunityIcons
                name={activeHoverTarget?.type === 'sell' ? "delete-alert" : "delete-empty"}
                size={24}
                color={activeHoverTarget?.type === 'sell' ? '#FF453A' : '#FFD700'}
              />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text
                  style={[
                    styles.sellZoneTitle,
                    activeHoverTarget?.type === 'sell' && { color: '#FF453A' },
                  ]}
                >
                  {activeHoverTarget?.type === 'sell'
                    ? `🔥 HIER LOSLASSEN ZUM VERKAUFEN`
                    : dragState
                    ? `🗑️ Hierhin ziehen zum Verkaufen (+${dragState.unit.cost * (dragState.unit.stars === 1 ? 1 : dragState.unit.stars === 2 ? 2 : 4)} Plates)`
                    : `Karten-Ablage / Schnellverkauf`}
                </Text>
                <Text style={styles.sellZoneSub}>
                  {activeHoverTarget?.type === 'sell'
                    ? `Plates werden sofort gutgeschrieben (Keine nervige Abfrage!)`
                    : `Karte lange halten & nach unten ziehen zum Direktverkauf`}
                </Text>
              </View>
            </View>

            {/* 3. Shop Section */}
            <View style={[styles.secRow, { marginTop: 16 }]}>
              <Text style={styles.secHeading}>SHOP · EINHEITEN</Text>
              <TouchableOpacity style={styles.rerollBtn} onPress={handleReroll} activeOpacity={0.8}>
                <WeightPlateIcon size={14} color="#00D2FF" style={{ marginRight: 4 }} />
                <Text style={styles.rerollBtnText}>{freeReroll ? 'Gratis Reroll' : 'Reroll (2 Plates)'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopCardsScroll}>
              {shopCards.map((offer, idx) => (
                <Animated.View
                  key={offer.id}
                  style={[
                    styles.shopCardWrapper,
                    offer.sold && { opacity: 0.4 },
                    {
                      transform: [{ scale: cardScaleAnims[idx] || 1 }],
                      opacity: offer.sold ? 0.4 : (cardOpacityAnims[idx] || 1),
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={offer.sold || plates < offer.cost}
                    onPress={() => handleBuyCard(idx)}
                  >
                    <AutoChessCard
                      data={toAutoChessUnit(offer.unit, pool)}
                      isShop={true}
                      size="compact"
                      upgradeAvailable={getUpgradeStatus(offer.unit.cardId)}
                      onPress={() => handleBuyCard(idx)}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shopBuyBtn, (offer.sold || plates < offer.cost) && styles.shopBuyBtnDisabled]}
                    disabled={offer.sold || plates < offer.cost}
                    onPress={() => handleBuyCard(idx)}
                    activeOpacity={0.8}
                  >
                    <WeightPlateIcon size={14} color={offer.sold ? '#666' : '#FFD700'} style={{ marginRight: 4 }} />
                    <Text style={[styles.shopBuyBtnText, offer.sold && { color: '#666' }]}>
                      {offer.sold ? 'Gekauft' : `${offer.cost} Plates`}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>

            {/* 4. Item Deal if available */}
            {shopItem && !shopItemSold && (
              <View style={styles.itemDealBox}>
                <View style={styles.itemDealLeft}>
                  <View style={styles.itemDealIconBox}>
                    <MaterialCommunityIcons name={shopItem.icon as any} size={26} color="#BF5AF2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dealTitle}>Gym-Item: {shopItem.name}</Text>
                    <Text style={styles.dealDesc}>{shopItem.description}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.buyItemBtn} onPress={handleBuyShopItem} activeOpacity={0.8}>
                  <WeightPlateIcon size={14} color="#FFD700" style={{ marginRight: 4 }} />
                  <Text style={styles.buyItemBtnText}>
                    {activeCoach === 'str' ? Math.max(1, shopItem.cost - 1) : shopItem.cost} Plates
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. Big Fight Action Button */}
            <TouchableOpacity style={styles.startBattleBtn} onPress={handleStartBattle} activeOpacity={0.85}>
              <MaterialCommunityIcons name="sword-cross" size={26} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.startBattleBtnText}>
                {stage === 5 && wave === 4
                  ? '👑 TITAN HERAUSFORDERN'
                  : wave === 4
                  ? '💀 MINI-BOSS KÄMPFEN'
                  : `WELLE ${wave} STARTEN ▶`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── WAVE RESULT MODAL (Like Live AutoChess) ── */}
      {waveResultModal && (
        <Modal visible={!!waveResultModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, waveResultModal.won ? styles.modalCardWin : styles.modalCardLoss]}>
              <Text style={styles.modalHeaderEmoji}>
                {waveResultModal.won ? (waveResultModal.isBoss ? '👑' : waveResultModal.isMiniBoss ? '👹' : '🏆') : '💀'}
              </Text>
              <Text style={styles.modalTitle}>
                {waveResultModal.won
                  ? (waveResultModal.isBoss ? 'TITAN BEZWUNGEN!' : waveResultModal.isMiniBoss ? 'MINI-BOSS BESIEGT!' : `WELLE ${wave} GEWONNEN!`)
                  : 'WELLE VERLOREN!'}
              </Text>
              <Text style={styles.modalSubhead}>
                {waveResultModal.won
                  ? (waveResultModal.isBoss
                      ? 'Epischer Sieg gegen den Titan! Der Run ist vollendet!'
                      : waveResultModal.isMiniBoss
                      ? 'Du hast den Mini-Boss bezwungen und wertvolle Gym-Beute ergattert!'
                      : `${waveResultModal.survivingUnits} Einheiten haben überlebt · +${waveResultModal.streak}er Serie!${waveResultModal.streak >= 2 ? ' · 🎁 Gratis-Reroll!' : ''}`)
                  : `Deine Truppen wurden K.O. geschlagen! (${hearts} Herzen übrig)`}
              </Text>

              {waveResultModal.won ? (
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardPill}>
                    <WeightPlateIcon size={24} color="#FFD700" style={{ marginBottom: 4 }} />
                    <Text style={styles.rewardValue}>+{waveResultModal.platesWon}</Text>
                    <Text style={styles.rewardLabel}>Plates</Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardIcon}>🔥</Text>
                    <Text style={[styles.rewardValue, { color: '#FF9500' }]}>{waveResultModal.streak}x</Text>
                    <Text style={styles.rewardLabel}>Serie</Text>
                  </View>
                </View>
              ) : waveResultModal.platesWon > 0 ? (
                <View style={styles.rewardsRow}>
                  <View style={[styles.rewardPill, { borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(255, 215, 0, 0.08)' }]}>
                    <WeightPlateIcon size={24} color="#FFD700" style={{ marginBottom: 4 }} />
                    <Text style={[styles.rewardValue, { color: '#FFD700' }]}>+{waveResultModal.platesWon}</Text>
                    <Text style={styles.rewardLabel}>Trost-Plates</Text>
                  </View>
                  <View style={[styles.rewardPill, { borderColor: 'rgba(0, 210, 255, 0.3)', backgroundColor: 'rgba(0, 210, 255, 0.06)' }]}>
                    <Text style={styles.rewardIcon}>🛡️</Text>
                    <Text style={[styles.rewardValue, { color: '#00D2FF' }]}>Shop</Text>
                    <Text style={styles.rewardLabel}>Team verstärken</Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.modalActionBtn, waveResultModal.won ? styles.modalActionBtnWin : styles.modalActionBtnLoss]}
                onPress={handleConfirmWaveResult}
                activeOpacity={0.85}
              >
                <Text style={styles.modalActionBtnText}>
                  {waveResultModal.won
                    ? (waveResultModal.isBoss ? 'Run vollenden ➔' : wave === 4 ? 'Zum Lagerfeuer 🏕️' : 'Nächste Welle ➔')
                    : (hearts <= 0 ? 'Run beenden 💀' : 'Revanche vorbereiten 🛠️')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── CAMP EVENT MODAL ── */}
      <Modal visible={combatPhase === 'camp'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.campCard}>
            <Text style={styles.campTitle}>🏕️ Lagerfeuer & Erholung</Text>
            <Text style={styles.campSub}>Wähle 1 Stärkung für die nächste Stage:</Text>
            <View style={{ gap: 10, marginVertical: 14 }}>
              {campEvents.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.campOption, { borderColor: event.color }]}
                  onPress={() => handleSelectCampEvent(event)}
                >
                  <MaterialCommunityIcons name={event.icon as any} size={28} color={event.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.campOptionTitle, { color: event.color }]}>{event.title}</Text>
                    <Text style={styles.campOptionDesc}>{event.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MINI-BOSS LOOT MODAL ── */}
      {lootModalItem && (
        <Modal visible={!!lootModalItem} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.lootCard}>
              <Text style={styles.lootTitle}>💀 MINI-BOSS BEZWUNGEN!</Text>
              <Text style={styles.lootSub}>Beute-Drop erhalten:</Text>
              <View style={styles.lootItemBox}>
                <MaterialCommunityIcons name={lootModalItem.icon as any} size={36} color="#BF5AF2" />
                <Text style={styles.lootItemName}>{lootModalItem.name}</Text>
                <Text style={styles.lootItemDesc}>{lootModalItem.description}</Text>
              </View>
              <TouchableOpacity
                style={styles.claimLootBtn}
                onPress={() => {
                  setItemBag(prev => [...prev.slice(0, 3), lootModalItem]);
                  setLootModalItem(null);
                }}
              >
                <Text style={styles.claimLootBtnText}>In Gym-Tasche packen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── RUN SUMMARY MODAL ── */}
      {summaryData && (
        <Modal visible={combatPhase === 'summary'} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.summaryCard, { borderColor: summaryData.victory ? '#30D158' : '#FF453A' }]}>
              <Text style={[styles.summaryHeading, { color: summaryData.victory ? '#30D158' : '#FF453A' }]}>
                {summaryData.victory ? '🏆 RUN VOLLENDET!' : '💀 RUN BEENDET'}
              </Text>
              <Text style={styles.summarySub}>
                Erreicht: Stage {stage} · {totalWavesWon} Wellen gewonnen
              </Text>

              <View style={styles.summaryRewardsRow}>
                <View style={styles.rewardCol}>
                  <Text style={styles.rewardNum}>
                    {summaryData.trophyDelta >= 0 ? `+${summaryData.trophyDelta}` : summaryData.trophyDelta} 🏆
                  </Text>
                  <Text style={styles.rewardLbl}>Trophäen</Text>
                </View>
                <View style={styles.rewardCol}>
                  <Text style={styles.rewardNum}>+{summaryData.eisenEarned} 🔩</Text>
                  <Text style={styles.rewardLbl}>Eisen</Text>
                </View>
                <View style={styles.rewardCol}>
                  <Text style={styles.rewardNum}>+{summaryData.xpEarned} ⭐</Text>
                  <Text style={styles.rewardLbl}>XP</Text>
                </View>
              </View>

              {summaryData.chestEarned && (
                <View style={styles.chestEarnedBox}>
                  <MaterialCommunityIcons name="cube-outline" size={24} color="#FFD700" />
                  <Text style={styles.chestEarnedText}>Neue Belohnungs-Kiste erhalten!</Text>
                </View>
              )}

              <TouchableOpacity style={styles.exitRunBtn} onPress={onExitRun}>
                <Text style={styles.exitRunBtnText}>Zurück zur Arena</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── UNIT DETAILS & SELL MODAL ── */}
      {selectedUnit && (
        <Modal visible={!!selectedUnit} transparent animationType="fade" onRequestClose={() => setSelectedUnit(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedUnit(null)}>
            <TouchableOpacity style={styles.unitDetailCard} activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={styles.unitDetailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitDetailName}>{selectedUnit.unit.name}</Text>
                  <Text style={styles.unitDetailCategory}>
                    {'★'.repeat(selectedUnit.unit.stars)} · {selectedUnit.unit.category}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unitDetailCloseBtn}
                  onPress={() => setSelectedUnit(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {/* Stats Row */}
              <View style={styles.unitStatsRow}>
                <View style={styles.unitStatPill}>
                  <Text style={styles.unitStatLabel}>⚔️ ATK</Text>
                  <Text style={styles.unitStatVal}>{selectedUnit.unit.baseAtk}</Text>
                </View>
                <View style={styles.unitStatPill}>
                  <Text style={styles.unitStatLabel}>❤️ HP</Text>
                  <Text style={styles.unitStatVal}>{selectedUnit.unit.baseHp}</Text>
                </View>
                <View style={styles.unitStatPill}>
                  <Text style={styles.unitStatLabel}>⭐ RANG</Text>
                  <Text style={[styles.unitStatVal, { color: selectedUnit.unit.stars === 3 ? '#00D2FF' : selectedUnit.unit.stars === 2 ? '#FFD700' : '#FFF' }]}>
                    {selectedUnit.unit.stars}★ {selectedUnit.unit.stars === 3 ? 'TITAN' : ''}
                  </Text>
                </View>
              </View>

              {/* Equipped Items Section */}
              <View style={styles.unitItemsSection}>
                <Text style={styles.unitItemsHeading}>
                  Ausrüstung ({selectedUnit.unit.items?.length || 0}/2):
                </Text>
                {selectedUnit.unit.items && selectedUnit.unit.items.length > 0 ? (
                  selectedUnit.unit.items.map((it, itIdx) => (
                    <View key={`${it.id}_${itIdx}`} style={styles.unitItemRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <MaterialCommunityIcons name={it.icon as any} size={20} color="#BF5AF2" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.unitItemName}>{it.name}</Text>
                          <Text style={styles.unitItemDesc} numberOfLines={1}>{it.description}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.unequipBtn}
                        onPress={() => handleUnequipItemFromSelectedUnit(itIdx)}
                      >
                        <Text style={styles.unequipBtnText}>Ablegen 🎒</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>
                    Keine Items ausgerüstet. Kaufe Gym-Items im Shop oder besiege Mini-Bosse!
                  </Text>
                )}
              </View>

              {/* Action Buttons: Move & Sell */}
              <View style={styles.unitActionsRow}>
                <TouchableOpacity
                  style={styles.unitMoveBtn}
                  onPress={handleMoveSelectedUnit}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={selectedUnit.location === 'board' ? 'arrow-down-bold-box' : 'arrow-up-bold-box'}
                    size={20}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.unitMoveBtnText}>
                    {selectedUnit.location === 'board' ? 'Zur Bank' : 'Auf Kampffeld'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.unitSellBtn}
                  onPress={handleSellSelectedUnit}
                  activeOpacity={0.8}
                >
                  <WeightPlateIcon size={16} color="#FFD700" style={{ marginRight: 6 }} />
                  <Text style={styles.unitSellBtnText}>
                    Verkaufen (+{selectedUnit.unit.cost * (selectedUnit.unit.stars === 1 ? 1 : selectedUnit.unit.stars === 2 ? 2 : 4)} Plates)
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Floating Ghost Card Preview during Drag (Follows finger) */}
      {dragState && (
        <View
          pointerEvents="none"
          style={[
            styles.floatingGhostContainer,
            {
              left: Math.max(10, Math.min(Dimensions.get('window').width - 130, touchPos.x - 60)),
              top: Math.max(20, touchPos.y - 120),
            },
          ]}
        >
          <View
            style={[
              styles.floatingCardWrapper,
              activeHoverTarget?.type === 'sell' && styles.floatingCardSell,
              activeHoverTarget?.type === 'board' && styles.floatingCardBoard,
              activeHoverTarget?.type === 'bench' && styles.floatingCardBench,
            ]}
          >
            <AutoChessCard
              data={toAutoChessUnit(dragState.unit, pool)}
              isBoard={true}
              size="compact"
            />

            {/* Action Status Pill */}
            <View
              style={[
                styles.floatingActionPill,
                activeHoverTarget?.type === 'sell' && { backgroundColor: '#FF453A' },
                activeHoverTarget?.type === 'board' && { backgroundColor: '#00D2FF' },
                activeHoverTarget?.type === 'bench' && { backgroundColor: '#30D158' },
              ]}
            >
              <Text style={styles.floatingActionText} numberOfLines={1}>
                {activeHoverTarget?.type === 'sell'
                  ? `💥 VERKAUFEN (+${dragState.unit.cost * (dragState.unit.stars === 1 ? 1 : dragState.unit.stars === 2 ? 2 : 4)} Plates)`
                  : activeHoverTarget?.type === 'board'
                  ? (board[activeHoverTarget.index!]
                      ? `🔄 Tausch mit ${board[activeHoverTarget.index!]?.name}`
                      : `⬇️ Auf Feld (Slot ${activeHoverTarget.index! + 1})`)
                  : activeHoverTarget?.type === 'bench'
                  ? (bench[activeHoverTarget.index!]
                      ? `🔄 Tausch mit ${bench[activeHoverTarget.index!]?.name}`
                      : `⬇️ Auf Bank (Slot ${activeHoverTarget.index! + 1})`)
                  : 'Ziehen zum Tauschen / Verkaufen...'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  slotHoverBoard: {
    borderColor: '#00D2FF',
    borderWidth: 2,
    borderRadius: 14,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  slotHoverBench: {
    borderColor: '#30D158',
    borderWidth: 2,
    borderRadius: 14,
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  emptySlotHoverBox: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderWidth: 2,
  },
  emptyBenchHoverBox: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 2,
  },
  swapBadgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00D2FF',
    zIndex: 10,
  },
  swapBadgeText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  sellDropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2D2D42',
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 6,
    opacity: 0.6,
  },
  sellDropZoneVisible: {
    opacity: 1,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  sellDropZoneActive: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.22)',
    borderStyle: 'solid',
    transform: [{ scale: 1.02 }],
  },
  sellZoneTitle: {
    color: '#FFD700',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sellZoneSub: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  floatingGhostContainer: {
    position: 'absolute',
    zIndex: 999999,
    width: 120,
    pointerEvents: 'none',
  },
  floatingCardWrapper: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#1E1E2C',
    padding: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
    transform: [{ scale: 1.08 }, { rotate: '-2deg' }],
  },
  floatingCardSell: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    shadowColor: '#FF453A',
    shadowOpacity: 0.8,
  },
  floatingCardBoard: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    shadowColor: '#00D2FF',
    shadowOpacity: 0.8,
  },
  floatingCardBench: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    shadowColor: '#30D158',
    shadowOpacity: 0.8,
  },
  floatingActionPill: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 160,
  },
  floatingActionText: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A10',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 10,
    backgroundColor: '#12121A',
    borderBottomWidth: 1,
    borderBottomColor: '#222232',
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#26263A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCol: {
    alignItems: 'center',
  },
  stageTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  stageArena: {
    color: '#8E8E9F',
    fontSize: 10.5,
    marginTop: 1,
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  topHudRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  runMusicBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#26263A',
    borderWidth: 1,
    borderColor: '#38384E',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  runMusicBtnActive: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  runMusicBtnPlaying: {
    borderColor: 'rgba(0, 210, 255, 0.5)',
  },
  runMusicDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00D2FF',
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  platesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginTop: 2,
  },
  platesVal: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  effectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    gap: 6,
    marginBottom: 10,
  },
  effectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  secHeading: {
    color: '#B0B0C4',
    fontSize: 11,
    fontWeight: '900',
  },
  secHint: {
    color: '#666',
    fontSize: 10,
  },
  badgeCount: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  badgeCountText: {
    color: '#00D2FF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  boardSlotsScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  slotWrapper: {
    alignItems: 'center',
  },
  emptySlotBox: {
    width: 104,
    height: 148,
    backgroundColor: '#12121A',
    borderWidth: 1.5,
    borderColor: '#26263A',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptySlotTitle: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '800',
  },
  emptySlotSub: {
    color: '#555566',
    fontSize: 9.5,
  },
  emptyBenchBox: {
    width: 104,
    height: 148,
    backgroundColor: '#101016',
    borderWidth: 1.2,
    borderColor: '#1E1E2C',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyBenchText: {
    color: '#555566',
    fontSize: 10,
    fontWeight: '700',
  },
  rerollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141E28',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  rerollBtnText: {
    color: '#00D2FF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  shopCardsScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  shopCardWrapper: {
    alignItems: 'center',
    width: 108,
  },
  shopBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 6,
    width: '100%',
    marginTop: 4,
  },
  shopBuyBtnDisabled: {
    borderColor: '#333',
    backgroundColor: '#161620',
  },
  shopBuyBtnText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
  },
  itemDealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F142D',
    borderWidth: 1,
    borderColor: '#BF5AF280',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 10,
  },
  itemDealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemDealIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(191, 90, 242, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealTitle: {
    color: '#BF5AF2',
    fontSize: 12,
    fontWeight: '900',
  },
  dealDesc: {
    color: '#A090B5',
    fontSize: 10,
    marginTop: 2,
  },
  buyItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BF5AF2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  buyItemBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  startBattleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D2FF',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  startBattleBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  arenaCombatContainer: {
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.5,
    marginVertical: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  formationBox: {
    backgroundColor: 'rgba(10, 10, 16, 0.75)',
    borderRadius: 14,
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  squadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  enemyIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    borderWidth: 1,
    borderColor: '#FF453A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossIconCircle: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
    borderColor: '#C084FC',
  },
  playerIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    borderWidth: 1,
    borderColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadHeaderText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  squadCountText: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '700',
  },
  fightersScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  centerCombatHud: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    maxWidth: '92%',
  },
  liveStatusText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  combatControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speedToggleBtn: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38384E',
  },
  speedToggleText: {
    color: '#FFD700',
    fontSize: 10.5,
    fontWeight: '900',
  },
  sofortSiegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  sofortSiegText: {
    color: '#FF9500',
    fontSize: 10.5,
    fontWeight: '900',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  modalCardWin: {
    backgroundColor: '#0E1A14',
    borderWidth: 2,
    borderColor: '#30D158',
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCardLoss: {
    backgroundColor: '#1A0E10',
    borderWidth: 2,
    borderColor: '#FF453A',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  modalSubhead: {
    color: '#B0B0C0',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 14,
  },
  rewardPill: {
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#2E2E42',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 84,
  },
  rewardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  rewardValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '900',
  },
  rewardLabel: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  modalActionBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalActionBtnWin: {
    backgroundColor: '#30D158',
  },
  modalActionBtnLoss: {
    backgroundColor: '#FF453A',
  },
  modalActionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  campCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#14141E',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFD70080',
    padding: 16,
  },
  campTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  campSub: {
    color: '#8E8E9F',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
  },
  campOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A28',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  campOptionTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  campOptionDesc: {
    color: '#8E8E9F',
    fontSize: 11,
    marginTop: 2,
  },
  lootCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#180E24',
    borderWidth: 1.5,
    borderColor: '#BF5AF2',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  lootTitle: {
    color: '#BF5AF2',
    fontSize: 16,
    fontWeight: '900',
  },
  lootSub: {
    color: '#8E8E9F',
    fontSize: 11,
    marginTop: 2,
  },
  lootItemBox: {
    alignItems: 'center',
    backgroundColor: '#241438',
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
    width: '100%',
  },
  lootItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
  },
  lootItemDesc: {
    color: '#B0A0C8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  claimLootBtn: {
    backgroundColor: '#BF5AF2',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimLootBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#12121A',
    borderRadius: 22,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
  },
  summaryHeading: {
    fontSize: 20,
    fontWeight: '900',
  },
  summarySub: {
    color: '#8E8E9F',
    fontSize: 12,
    marginTop: 4,
  },
  summaryRewardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
  },
  rewardCol: {
    alignItems: 'center',
  },
  rewardNum: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  rewardLbl: {
    color: '#8E8E9F',
    fontSize: 10,
    marginTop: 2,
  },
  chestEarnedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFD70020',
    borderWidth: 1,
    borderColor: '#FFD70060',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  chestEarnedText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
  },
  exitRunBtn: {
    backgroundColor: '#00D2FF',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitRunBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  slotUpgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
  },
  slotUpgradeText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
  },
  lockedSlotBox: {
    width: 104,
    height: 148,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#262636',
    borderStyle: 'dashed',
    backgroundColor: '#101018',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  lockedSlotTitle: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  lockedSlotSub: {
    color: '#52525B',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 12,
  },
  unitDetailCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#161622',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38384E',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  unitDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  unitDetailName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  unitDetailCategory: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  unitDetailCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#26263A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  unitStatPill: {
    flex: 1,
    backgroundColor: '#1E1E2C',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D40',
  },
  unitStatLabel: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  unitStatVal: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  unitItemsSection: {
    backgroundColor: '#12121A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222230',
  },
  unitItemsHeading: {
    color: '#B0B0C4',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  unitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A26',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  unitItemName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  unitItemDesc: {
    color: '#8E8E9F',
    fontSize: 10,
  },
  unequipBtn: {
    backgroundColor: '#2E2038',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BF5AF280',
  },
  unequipBtnText: {
    color: '#BF5AF2',
    fontSize: 11,
    fontWeight: '800',
  },
  noItemsText: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
  unitActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unitMoveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26263A',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3D3D58',
  },
  unitMoveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  unitSellBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2210',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FFD70080',
  },
  unitSellBtnText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
  },
});
