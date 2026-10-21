import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAutoChessStore, AutoChessUnit } from '../../store/useAutoChessStore';
import { AutoChessCard } from './AutoChessCard';
import { WeightPlateIcon } from './WeightPlateIcon';
import { triggerLight, triggerMedium, triggerHeavy, triggerSuccess } from '../../utils/haptics';

interface DragState {
  unit: AutoChessUnit;
  fromLocation: 'board' | 'bench';
  fromIndex: number;
}

interface DropTarget {
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

export const AutoChessBoard: React.FC = () => {
  const {
    board,
    bench,
    maxBoardSlots,
    currentExerciseIndex,
    itemInventory,
    sellUnit,
    moveUnit,
    swapUnits,
    unequipItem,
    useConsumableItem,
    setIsBoardDragging,
  } = useAutoChessStore();

  const [selectedUnit, setSelectedUnit] = useState<{ unit: AutoChessUnit; location: 'board' | 'bench'; index: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeHoverTarget, setActiveHoverTarget] = useState<DropTarget | null>(null);
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
  const activeHoverTargetRef = useRef<DropTarget | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Wiggle / vibrating visual animation during long-press drag
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const wiggleLoop = useRef<Animated.CompositeAnimation | null>(null);

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

  // Update bounds of all slots and sell zone
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
  }, [updateSlotBounds, board.length, bench.length]);

  // Determine hover target from window coordinates
  const calculateHoverTarget = useCallback((pageX: number, pageY: number): DropTarget | null => {
    // 1. Sell Zone check (or dragging downwards into the shop area below the bench)
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

    // Fallback: If dragged below the bench row towards the shop, activate sell zone
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
          unitName: bench[i]?.exerciseName,
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
          unitName: board[i]?.exerciseName,
        };
      }
    }

    return null;
  }, [bench, board]);

  const startDrag = useCallback((
    unit: AutoChessUnit,
    location: 'board' | 'bench',
    index: number,
    x: number,
    y: number
  ) => {
    triggerHeavy();
    Vibration.vibrate([0, 50, 40, 50]);
    startWiggle();
    setIsBoardDragging(true);

    const initialDrag: DragState = { unit, fromLocation: location, fromIndex: index };
    setDragState(initialDrag);
    setTouchPos({ x, y });

    updateSlotBounds();
  }, [startWiggle, setIsBoardDragging, updateSlotBounds]);

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
    setIsBoardDragging(false);

    if (!dragState) return;

    const finalTarget = calculateHoverTarget(x, y) || activeHoverTargetRef.current;
    const { unit, fromLocation, fromIndex } = dragState;

    if (finalTarget) {
      if (finalTarget.type === 'sell') {
        const refund = unit.cost * (unit.stars === 1 ? 1 : unit.stars === 2 ? 2 : 4);
        sellUnit(unit.instanceId, fromLocation);
        triggerSuccess();
        Vibration.vibrate(50);
        showToast(`💰 "${unit.exerciseName}" direkt verkauft (+${refund} Plates)!`);
      } else if (finalTarget.type === 'board' && finalTarget.index !== undefined) {
        const targetIdx = finalTarget.index;
        const targetUnit = board[targetIdx];
        swapUnits(fromLocation, fromIndex, 'board', targetIdx);
        triggerSuccess();
        Vibration.vibrate(35);
        if (targetUnit) {
          showToast(`🔄 1:1 Tausch: "${unit.exerciseName}" ↔ "${targetUnit.exerciseName}"`);
        } else {
          showToast(`⚔️ "${unit.exerciseName}" aufs Kampffeld gestellt!`);
        }
      } else if (finalTarget.type === 'bench' && finalTarget.index !== undefined) {
        const targetIdx = finalTarget.index;
        const targetUnit = bench[targetIdx];
        swapUnits(fromLocation, fromIndex, 'bench', targetIdx);
        triggerSuccess();
        Vibration.vibrate(35);
        if (targetUnit) {
          showToast(`🔄 1:1 Tausch: "${unit.exerciseName}" ↔ "${targetUnit.exerciseName}"`);
        } else {
          showToast(`📦 "${unit.exerciseName}" auf die Bank gelegt!`);
        }
      }
    }

    setDragState(null);
    setActiveHoverTarget(null);
    activeHoverTargetRef.current = null;
  }, [dragState, calculateHoverTarget, sellUnit, swapUnits, board, bench, stopWiggle, setIsBoardDragging, showToast]);

  const cancelDrag = useCallback(() => {
    stopWiggle();
    setIsBoardDragging(false);
    setDragState(null);
    setActiveHoverTarget(null);
    activeHoverTargetRef.current = null;
  }, [stopWiggle, setIsBoardDragging]);

  // Touch handlers attached to each card slot
  const handleTouchStart = (
    e: GestureResponderEvent,
    unit: AutoChessUnit,
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

  const handleTouchMove = (e: GestureResponderEvent) => {
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

  const handleTouchEnd = (
    e: GestureResponderEvent,
    unit: AutoChessUnit,
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
        setSelectedUnit({ unit, location, index });
      }
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      cancelDrag();
    }
  };

  // Immediate sell action without confirmation modal
  const handleSellAction = () => {
    if (!selectedUnit) return;
    const { unit, location } = selectedUnit;
    const refund = unit.cost * (unit.stars === 1 ? 1 : unit.stars === 2 ? 2 : 4);
    sellUnit(unit.instanceId, location);
    triggerSuccess();
    Vibration.vibrate(40);
    showToast(`💰 "${unit.exerciseName}" direkt verkauft (+${refund} Plates)!`);
    setSelectedUnit(null);
  };

  // Move or swap action from bottom sheet modal
  const handleMoveAction = () => {
    if (!selectedUnit) return;
    const { unit, location } = selectedUnit;
    const targetLocation = location === 'board' ? 'bench' : 'board';
    moveUnit(unit.instanceId, targetLocation);
    triggerSuccess();
    Vibration.vibrate(35);
    showToast(`🔄 "${unit.exerciseName}" verschoben!`);
    setSelectedUnit(null);
  };

  // 1-to-1 swap with a specific unit via modal tap
  const handleDirectModalSwap = (toLocation: 'board' | 'bench', toIndex: number) => {
    if (!selectedUnit) return;
    const { unit, location, index } = selectedUnit;
    const targetUnit = toLocation === 'board' ? board[toIndex] : bench[toIndex];
    swapUnits(location, index, toLocation, toIndex);
    triggerSuccess();
    Vibration.vibrate(35);
    if (targetUnit) {
      showToast(`🔄 1:1 Tausch: "${unit.exerciseName}" ↔ "${targetUnit.exerciseName}"`);
    } else {
      showToast(`✨ "${unit.exerciseName}" platziert!`);
    }
    setSelectedUnit(null);
  };

  const handleUnequip = (itemIndex: number) => {
    if (!selectedUnit) return;
    if (itemInventory.length >= 4) {
      Alert.alert('Gym-Tasche voll', 'Deine Gym-Tasche hat bereits 4 Items! Rüste erst ein anderes Item aus.');
      return;
    }
    unequipItem(selectedUnit.unit.instanceId, itemIndex);
    const updatedItems = [...(selectedUnit.unit.items || [])];
    updatedItems.splice(itemIndex, 1);
    setSelectedUnit({
      ...selectedUnit,
      unit: {
        ...selectedUnit.unit,
        items: updatedItems.length > 0 ? updatedItems : undefined,
      },
    });
  };

  return (
    <View ref={containerRef} style={styles.container}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Active Board Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Kampffeld (Squad)</Text>
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeText}>{board.filter(Boolean).length} / {maxBoardSlots} Slots</Text>
          </View>
        </View>
        <Text style={styles.slotHint}>
          {maxBoardSlots < 5 
            ? `Übung ${currentExerciseIndex + 1} • Nächster Slot ab Übung ${currentExerciseIndex + 2}` 
            : 'Max Squad erreicht! 🔓'}
        </Text>
      </View>

      {/* Active Board Slots */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardScroll}
        scrollEnabled={!dragState}
      >
        {board.map((slot, idx) => {
          const isThisDragged = dragState?.unit.instanceId === slot?.instanceId;
          const isDropHover = activeHoverTarget?.type === 'board' && activeHoverTarget.index === idx;

          if (!slot) {
            return (
              <View
                key={`empty_board_${idx}`}
                ref={(el) => { boardRefs.current[idx] = el; }}
                onLayout={updateSlotBounds}
                style={[
                  styles.emptySlot,
                  isDropHover && styles.emptySlotHoverBoard,
                ]}
              >
                <MaterialCommunityIcons
                  name={isDropHover ? "arrow-down-bold-circle" : "shield-outline"}
                  size={isDropHover ? 32 : 28}
                  color={isDropHover ? "#00F0FF" : "#2A2A36"}
                />
                <Text style={[styles.emptySlotText, isDropHover && { color: '#00F0FF' }]}>
                  {isDropHover ? 'Hier ablegen ⬇️' : `Freier Slot ${idx + 1}`}
                </Text>
                <Text style={styles.emptySlotSub}>
                  {isDropHover ? 'Loslassen zum Platzieren' : 'Langer Druck zum Tauschen'}
                </Text>
              </View>
            );
          }

          return (
            <View
              key={slot.instanceId}
              ref={(el) => { boardRefs.current[idx] = el; }}
              onLayout={updateSlotBounds}
              onTouchStart={(e) => handleTouchStart(e, slot, 'board', idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, slot, 'board', idx)}
              onTouchCancel={handleTouchCancel}
              style={[
                styles.cardSlotWrapper,
                isDropHover && styles.cardSlotHoverBoard,
              ]}
            >
              <Animated.View
                style={[
                  isThisDragged && {
                    transform: [{ translateX: wiggleAnim }, { scale: 1.05 }],
                    opacity: 0.55,
                  },
                ]}
              >
                <AutoChessCard
                  data={slot}
                  isBoard={true}
                  size="medium"
                />
              </Animated.View>

              {/* 1:1 Swap Hover Overlay */}
              {isDropHover && !isThisDragged && (
                <View style={styles.swapBadgeOverlay}>
                  <MaterialCommunityIcons name="swap-horizontal-bold" size={26} color="#00F0FF" />
                  <Text style={styles.swapBadgeText}>1:1 TAUSCH</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Locked Slots Indicator (up to 5) */}
        {maxBoardSlots < 5 && (
          <View style={[styles.emptySlot, styles.lockedSlot]}>
            <MaterialCommunityIcons name="lock" size={26} color="#666" />
            <Text style={[styles.emptySlotText, { color: '#888' }]}>Slot {maxBoardSlots + 1} Gesperrt</Text>
            <Text style={[styles.emptySlotSub, { color: '#30D158' }]}>Freischaltung bei nächster Übung!</Text>
          </View>
        )}
      </ScrollView>

      {/* Bench (Reserve) Header */}
      <View style={[styles.sectionHeader, { marginTop: 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Bank (Reserve / Duplikate)</Text>
          <View style={[styles.slotBadge, { backgroundColor: '#1A1A22' }]}>
            <Text style={[styles.slotBadgeText, { color: '#8E8E93' }]}>{bench.filter(Boolean).length} / 3</Text>
          </View>
        </View>
        <Text style={styles.benchHint}>Langer Druck = Ziehen & 1:1 Tausch</Text>
      </View>

      {/* Bench Slots (3 Slots) */}
      <View style={styles.benchRow}>
        {bench.map((bSlot, bIdx) => {
          const isThisDragged = dragState?.unit.instanceId === bSlot?.instanceId;
          const isDropHover = activeHoverTarget?.type === 'bench' && activeHoverTarget.index === bIdx;

          if (!bSlot) {
            return (
              <View
                key={`empty_bench_${bIdx}`}
                ref={(el) => { benchRefs.current[bIdx] = el; }}
                onLayout={updateSlotBounds}
                style={[
                  styles.emptyBenchSlot,
                  isDropHover && styles.emptyBenchSlotHover,
                ]}
              >
                <MaterialCommunityIcons
                  name={isDropHover ? "arrow-down-bold-circle" : "archive-outline"}
                  size={isDropHover ? 24 : 20}
                  color={isDropHover ? "#30D158" : "#262632"}
                />
                <Text style={[styles.emptyBenchText, isDropHover && { color: '#30D158' }]}>
                  {isDropHover ? 'Auf Bank ⬇️' : `Bank ${bIdx + 1}`}
                </Text>
              </View>
            );
          }

          return (
            <View
              key={bSlot.instanceId}
              ref={(el) => { benchRefs.current[bIdx] = el; }}
              onLayout={updateSlotBounds}
              onTouchStart={(e) => handleTouchStart(e, bSlot, 'bench', bIdx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, bSlot, 'bench', bIdx)}
              onTouchCancel={handleTouchCancel}
              style={[
                styles.cardSlotWrapperCompact,
                isDropHover && styles.cardSlotHoverBench,
              ]}
            >
              <Animated.View
                style={[
                  isThisDragged && {
                    transform: [{ translateX: wiggleAnim }, { scale: 1.05 }],
                    opacity: 0.55,
                  },
                ]}
              >
                <AutoChessCard
                  data={bSlot}
                  size="compact"
                />
              </Animated.View>

              {/* 1:1 Swap Hover Overlay on Bench */}
              {isDropHover && !isThisDragged && (
                <View style={styles.swapBadgeOverlayCompact}>
                  <MaterialCommunityIcons name="swap-horizontal-bold" size={20} color="#30D158" />
                  <Text style={[styles.swapBadgeText, { color: '#30D158', fontSize: 9.5 }]}>1:1 TAUSCH</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Dedicated Drag-to-Sell Drop Zone (Bottom / Shop Area) */}
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
          name={activeHoverTarget?.type === 'sell' ? 'fire' : 'delete-sweep'}
          size={activeHoverTarget?.type === 'sell' ? 30 : 22}
          color={activeHoverTarget?.type === 'sell' ? '#FF453A' : '#FF9500'}
        />
        <View style={styles.sellDropTextCol}>
          <Text style={[styles.sellDropTitle, activeHoverTarget?.type === 'sell' && styles.sellDropTitleActive]}>
            {activeHoverTarget?.type === 'sell'
              ? `💥 JETZT LOSLASSEN ZUM DIREKT-VERKAUFEN!`
              : dragState
              ? `🗑️ Hierhin ziehen zum Verkaufen (+${dragState.unit.cost * (dragState.unit.stars === 1 ? 1 : dragState.unit.stars === 2 ? 2 : 4)} Plates)`
              : `🗑️ Zum Verkaufen: Karte lange drücken & hierher ziehen`}
          </Text>
          <Text style={styles.sellDropSubtitle}>
            {activeHoverTarget?.type === 'sell'
              ? `Plates werden sofort gutgeschrieben (Keine nervige Abfrage!)`
              : `Direktverkauf ohne Bestätigungs-Popup • Sofortige Plates-Gutschrift`}
          </Text>
        </View>
      </View>

      {/* Floating Ghost Card Preview during Drag */}
      {dragState && (
        <View
          pointerEvents="none"
          style={[
            styles.floatingGhostContainer,
            {
              left: Math.max(10, touchPos.x - 75),
              top: Math.max(20, touchPos.y - 85),
            },
          ]}
        >
          <View
            style={[
              styles.floatingGhostCard,
              activeHoverTarget?.type === 'sell' && styles.floatingGhostSell,
              activeHoverTarget?.type === 'board' && styles.floatingGhostBoard,
              activeHoverTarget?.type === 'bench' && styles.floatingGhostBench,
            ]}
          >
            <MaterialCommunityIcons
              name={
                activeHoverTarget?.type === 'sell'
                  ? 'delete-alert'
                  : activeHoverTarget?.type === 'board'
                  ? 'shield-sword'
                  : activeHoverTarget?.type === 'bench'
                  ? 'archive-arrow-down'
                  : 'hand-back-right'
              }
              size={22}
              color={
                activeHoverTarget?.type === 'sell'
                  ? '#FF453A'
                  : activeHoverTarget?.type === 'board'
                  ? '#00F0FF'
                  : activeHoverTarget?.type === 'bench'
                  ? '#30D158'
                  : '#FFD700'
              }
            />
            <Text style={styles.floatingGhostTitle} numberOfLines={1}>
              {dragState.unit.exerciseName}
            </Text>
            <View style={styles.floatingGhostBadge}>
              <Text style={styles.floatingGhostBadgeText}>
                {activeHoverTarget?.type === 'sell'
                  ? `💥 VERKAUFEN (+${dragState.unit.cost * (dragState.unit.stars === 1 ? 1 : dragState.unit.stars === 2 ? 2 : 4)} Plates)`
                  : activeHoverTarget?.type === 'board'
                  ? (board[activeHoverTarget.index!] ? `🔄 1:1 Tausch: ${board[activeHoverTarget.index!]?.exerciseName}` : `⬇️ Aufs Feld (Slot ${activeHoverTarget.index! + 1})`)
                  : activeHoverTarget?.type === 'bench'
                  ? (bench[activeHoverTarget.index!] ? `🔄 1:1 Tausch: ${bench[activeHoverTarget.index!]?.exerciseName}` : `⬇️ Auf die Bank (Slot ${activeHoverTarget.index! + 1})`)
                  : 'Ziehen zum Tauschen oder Verkaufen...'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Unit Action Modal / Bottom Sheet */}
      <Modal visible={!!selectedUnit} transparent animationType="fade" onRequestClose={() => setSelectedUnit(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedUnit(null)}>
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{selectedUnit?.unit.exerciseName}</Text>
            <Text style={styles.actionSubtitle}>
              {selectedUnit?.unit.stars}★ • {selectedUnit?.unit.category} • ATK: {selectedUnit?.unit.atk} • HP: {selectedUnit?.unit.hp}/{selectedUnit?.unit.maxHp}
            </Text>

            {/* Consumable Revive / Field-Heal Action */}
            {selectedUnit && (
              (() => {
                const isDead = typeof selectedUnit.unit.hp === 'number' && selectedUnit.unit.hp <= 0;
                const isInjured = typeof selectedUnit.unit.hp === 'number' && selectedUnit.unit.hp > 0 && selectedUnit.unit.hp < selectedUnit.unit.maxHp;
                const healItem = itemInventory.find(it => it.isConsumable);

                if (isDead || isInjured) {
                  if (healItem) {
                    return (
                      <TouchableOpacity
                        style={[styles.actionBtnRevive, isDead ? styles.reviveBg : styles.healBg]}
                        onPress={() => {
                          const ok = useConsumableItem(healItem.id, selectedUnit.unit.instanceId);
                          if (ok) {
                            Alert.alert('Erfolgreich wiederbelebt! 💚', `"${selectedUnit.unit.exerciseName}" steht wieder voll im Einsatz!`);
                            setSelectedUnit(null);
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="heart-flash" size={20} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.actionBtnReviveText}>
                          {isDead 
                            ? `Aufstehen lassen! (1x ${healItem.name}) ⚡` 
                            : `Heilen! (1x ${healItem.name}) 💚`}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  if (isDead) {
                    return (
                      <View style={styles.deadWarningBox}>
                        <MaterialCommunityIcons name="skull" size={16} color="#FF453A" style={{ marginRight: 6 }} />
                        <Text style={styles.deadWarningText}>
                          Einheit ist K.O.! Hole dir ein Wiederbelebungs-Item aus dem Shop / Mini-Boss-Loot oder mache deinen nächsten Gym-Satz!
                        </Text>
                      </View>
                    );
                  }
                }
                return null;
              })()
            )}

            {/* Equipped Items Section */}
            <View style={styles.unitItemsSection}>
              <Text style={styles.unitItemsTitle}>
                Ausrüstung ({selectedUnit?.unit.items?.length || 0}/2):
              </Text>
              {(selectedUnit?.unit.items && selectedUnit.unit.items.length > 0) ? (
                selectedUnit.unit.items.map((item, itIdx) => (
                  <View key={`${item.id}_${itIdx}`} style={styles.unitItemRow}>
                    <View style={styles.unitItemLeft}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color="#FF9500" />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.unitItemName}>{item.name}</Text>
                        <Text style={styles.unitItemDesc}>{item.description}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unitItemUnequipBtn}
                      onPress={() => handleUnequip(itIdx)}
                    >
                      <Text style={styles.unitItemUnequipText}>Ablegen 🎒</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noItemsText}>
                  Keine Items ausgerüstet. Rüste welche über deine Gym-Tasche im Shop aus!
                </Text>
              )}
            </View>

            {/* Direct 1:1 Swap Quick-Selection Buttons */}
            {selectedUnit && (
              <View style={styles.quickSwapSection}>
                <Text style={styles.quickSwapTitle}>
                  {selectedUnit.location === 'board' ? '🔄 1:1 Tausch mit Bank (Reserve):' : '🔄 1:1 Tausch mit Kampffeld:'}
                </Text>
                <View style={styles.quickSwapRow}>
                  {selectedUnit.location === 'board' ? (
                    bench.map((bItem, bIdx) => {
                      if (!bItem) {
                        return (
                          <TouchableOpacity
                            key={`swap_target_bench_${bIdx}`}
                            style={styles.quickSwapBtnEmpty}
                            onPress={() => handleDirectModalSwap('bench', bIdx)}
                          >
                            <Text style={styles.quickSwapBtnEmptyText}>Frei ({bIdx + 1})</Text>
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={bItem.instanceId}
                          style={styles.quickSwapBtnOccupied}
                          onPress={() => handleDirectModalSwap('bench', bIdx)}
                        >
                          <Text style={styles.quickSwapBtnText} numberOfLines={1}>
                            🔄 {bItem.exerciseName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    board.map((bItem, bIdx) => {
                      if (!bItem) {
                        return (
                          <TouchableOpacity
                            key={`swap_target_board_${bIdx}`}
                            style={styles.quickSwapBtnEmpty}
                            onPress={() => handleDirectModalSwap('board', bIdx)}
                          >
                            <Text style={styles.quickSwapBtnEmptyText}>Frei ({bIdx + 1})</Text>
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={bItem.instanceId}
                          style={styles.quickSwapBtnOccupied}
                          onPress={() => handleDirectModalSwap('board', bIdx)}
                        >
                          <Text style={styles.quickSwapBtnText} numberOfLines={1}>
                            🔄 {bItem.exerciseName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons: Move and Immediate Sell */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleMoveAction}>
                <MaterialCommunityIcons
                  name={selectedUnit?.location === 'board' ? 'arrow-down-bold-box' : 'arrow-up-bold-box'}
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.actionBtnText}>
                  {selectedUnit?.location === 'board' ? 'Auf die Bank (Reserve)' : 'Aufs Kampffeld stellen'}
                </Text>
              </TouchableOpacity>

              {/* Instant Sell without Confirmation Alert */}
              <TouchableOpacity style={styles.actionBtnSell} onPress={handleSellAction}>
                <WeightPlateIcon size={18} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#FFD700' }]}>
                  Direkt Verkaufen (+{selectedUnit ? selectedUnit.unit.cost * (selectedUnit.unit.stars === 1 ? 1 : selectedUnit.unit.stars === 2 ? 2 : 4) : 0} Plates)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'relative',
  },
  toastContainer: {
    position: 'absolute',
    top: 6,
    left: 20,
    right: 20,
    backgroundColor: '#1E1E28E8',
    borderColor: '#FFD700',
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 999,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  slotBadge: {
    backgroundColor: '#30D15825',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: '#30D15860',
  },
  slotBadgeText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
  },
  slotHint: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  benchHint: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  boardScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 205,
    gap: 4,
  },
  cardSlotWrapper: {
    position: 'relative',
    marginHorizontal: 2,
  },
  cardSlotWrapperCompact: {
    position: 'relative',
    marginHorizontal: 2,
  },
  cardSlotHoverBoard: {
    borderColor: '#00F0FF',
    borderWidth: 2,
    borderRadius: 14,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  cardSlotHoverBench: {
    borderColor: '#30D158',
    borderWidth: 2,
    borderRadius: 14,
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  swapBadgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 240, 255, 0.35)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  swapBadgeOverlayCompact: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(48, 209, 88, 0.35)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  swapBadgeText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptySlot: {
    width: 140,
    height: 195,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E1E26',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D11',
    marginHorizontal: 4,
    padding: 10,
  },
  emptySlotHoverBoard: {
    borderColor: '#00F0FF',
    borderStyle: 'solid',
    backgroundColor: '#00F0FF15',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  lockedSlot: {
    borderColor: '#33333E',
    backgroundColor: '#121216',
  },
  emptySlotText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySlotSub: {
    color: '#555560',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  benchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: 155,
  },
  emptyBenchSlot: {
    width: 100,
    height: 145,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E1E26',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D11',
    marginHorizontal: 2,
  },
  emptyBenchSlotHover: {
    borderColor: '#30D158',
    borderStyle: 'solid',
    backgroundColor: '#30D15820',
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  emptyBenchText: {
    color: '#555560',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  sellDropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161E',
    borderWidth: 1.5,
    borderColor: '#2D2D3E',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  sellDropZoneVisible: {
    borderColor: '#FF9500',
    backgroundColor: '#262016',
  },
  sellDropZoneActive: {
    borderColor: '#FF453A',
    borderStyle: 'solid',
    borderWidth: 2.2,
    backgroundColor: '#381618',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  sellDropTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  sellDropTitle: {
    color: '#E0E0E6',
    fontSize: 11.5,
    fontWeight: '800',
  },
  sellDropTitleActive: {
    color: '#FF453A',
    fontSize: 12.5,
    fontWeight: '900',
  },
  sellDropSubtitle: {
    color: '#8E8E93',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
  floatingGhostContainer: {
    position: 'absolute',
    width: 150,
    zIndex: 9999,
  },
  floatingGhostCard: {
    backgroundColor: '#1C1C28EE',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 12,
  },
  floatingGhostBoard: {
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
  },
  floatingGhostBench: {
    borderColor: '#30D158',
    shadowColor: '#30D158',
  },
  floatingGhostSell: {
    borderColor: '#FF453A',
    backgroundColor: '#2B1214EE',
    shadowColor: '#FF453A',
    transform: [{ scale: 1.08 }],
  },
  floatingGhostTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  floatingGhostBadge: {
    marginTop: 4,
    backgroundColor: '#00000080',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  floatingGhostBadgeText: {
    color: '#FFD700',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionCard: {
    width: '90%',
    backgroundColor: '#181820',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#2A2A38',
    alignItems: 'center',
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnSell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26261A',
    borderWidth: 1.2,
    borderColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  quickSwapSection: {
    width: '100%',
    backgroundColor: '#12121A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242434',
  },
  quickSwapTitle: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  quickSwapRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickSwapBtnOccupied: {
    backgroundColor: '#1E293B',
    borderColor: '#38BDF880',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexGrow: 1,
    alignItems: 'center',
  },
  quickSwapBtnEmpty: {
    backgroundColor: '#14141E',
    borderColor: '#2A2A3A',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexGrow: 1,
    alignItems: 'center',
  },
  quickSwapBtnEmptyText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
  },
  quickSwapBtnText: {
    color: '#F8FAFC',
    fontSize: 10.5,
    fontWeight: '800',
  },
  unitItemsSection: {
    width: '100%',
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#12121A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242434',
  },
  unitItemsTitle: {
    color: '#FF9500',
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  unitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A24',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  unitItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  unitItemName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  unitItemDesc: {
    color: '#8E8E93',
    fontSize: 9.5,
    marginTop: 1,
  },
  unitItemUnequipBtn: {
    backgroundColor: '#2A2A38',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A3A4C',
  },
  unitItemUnequipText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '700',
  },
  noItemsText: {
    color: '#777788',
    fontSize: 10,
    fontStyle: 'italic',
    paddingVertical: 2,
  },
  actionBtnRevive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  reviveBg: {
    backgroundColor: '#FF453A',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 5,
  },
  healBg: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 5,
  },
  actionBtnReviveText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  deadWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF453A20',
    borderColor: '#FF453A60',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  deadWarningText: {
    color: '#FF6961',
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
  },
});
