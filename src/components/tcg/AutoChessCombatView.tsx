import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal, Vibration } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAutoChessStore, AutoChessUnit } from '../../store/useAutoChessStore';
import { getActiveArena } from '../../constants/autoChessArenas';
import { AutoChessCard } from './AutoChessCard';
import { WeightPlateIcon } from './WeightPlateIcon';
import { AutoChessLootModal } from './AutoChessLootModal';
import { AutoChessItem } from '../../constants/autoChessItems';
import { triggerLight, triggerMedium, triggerHeavy, triggerSuccess, triggerWarning } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onBackToTeam: () => void;
}

interface UnitBattleState {
  unit: AutoChessUnit;
  currentHp: number;
  maxHp: number;
  atk: number;
  isDead: boolean;
  floatingDmg: { text: string; isCrit?: boolean; isHeal?: boolean } | null;
  hasShield: boolean;
  isEnraged: boolean;
  atkStacks: number;
  emergencyHealUsed?: boolean;
  reviveUsed?: boolean;
}

// Highly optimized, memoized combat slot
const CombatUnitSlot = React.memo<{
  state: UnitBattleState;
  lungeAnim: Animated.Value;
  shakeAnim: Animated.Value;
  isPlayer: boolean;
  compactWidth: number;
}>(({ state, lungeAnim, shakeAnim, compactWidth }) => {
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
        data={state.unit}
        isBoard={true}
        size="compact"
        customWidth={compactWidth}
        overrideHp={state.currentHp}
        isDead={state.isDead}
        floatingDmg={state.floatingDmg}
      />
    </Animated.View>
  );
});

export const AutoChessCombatView: React.FC<Props> = ({ onBackToTeam }) => {
  const {
    board,
    enemySquad,
    round,
    currentWaveInPause,
    pendingWaveBonusStacks,
    activeWaveBonusStacks,
    isBossAvailable,
    isBossDefeated,
    trophies,
    getActiveSynergies,
    recordWaveVictory,
    recordWaveDefeat,
    spawnNextWave,
    triggerBossEncounter,
    saveBoardUnitHps,
    itemInventory,
    useConsumableItem,
  } = useAutoChessStore();

  const activeArena = getActiveArena(trophies);
  const activeUnits = board.filter((u): u is AutoChessUnit => u !== null);
  const aliveUnits = activeUnits.filter(u => typeof u.hp !== 'number' || u.hp > 0);

  const [combatPhase, setCombatPhase] = useState<'idle' | 'fighting' | 'finished'>('idle');
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [statusMessage, setStatusMessage] = useState('Bereit zum Kampf');
  const [earnedTrophies, setEarnedTrophies] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [survivingUnitsCount, setSurvivingUnitsCount] = useState(0);

  // Loot Modal State for Mini-Boss victory
  const [lootModalVisible, setLootModalVisible] = useState(false);
  const [lootModalItem, setLootModalItem] = useState<AutoChessItem | null>(null);
  const claimLootDrop = useAutoChessStore(state => state.claimLootDrop);

  // Combatant states
  const [playerStates, setPlayerStates] = useState<UnitBattleState[]>([]);
  const [enemyStates, setEnemyStates] = useState<UnitBattleState[]>([]);

  // Persistent Animation Values (reused to avoid Garbage Collection stutter)
  const playerLungeAnims = useRef<Animated.Value[]>([]).current;
  const playerShakeAnims = useRef<Animated.Value[]>([]).current;
  const enemyLungeAnims = useRef<Animated.Value[]>([]).current;
  const enemyShakeAnims = useRef<Animated.Value[]>([]).current;

  // Boss Intro Animation Values
  const [bossIntroVisible, setBossIntroVisible] = useState(false);
  const bossIntroScale = useRef(new Animated.Value(0.4)).current;
  const bossIntroOpacity = useRef(new Animated.Value(0)).current;
  const bossShakeAnim = useRef(new Animated.Value(0)).current;
  const bossThunderFlash = useRef(new Animated.Value(0)).current;

  // Mini-Boss Intro Animation Values
  const [miniBossIntroVisible, setMiniBossIntroVisible] = useState(false);
  const miniBossIntroScale = useRef(new Animated.Value(0.3)).current;
  const miniBossIntroOpacity = useRef(new Animated.Value(0)).current;
  const miniBossShakeAnim = useRef(new Animated.Value(0)).current;
  const hasTriggeredMiniBossIntro = useRef(false);

  const isFightingRef = useRef(false);
  const nextTurnTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize fighters
  const setupBattle = useCallback(() => {
    const synergies = getActiveSynergies();
    const stackBonus = (activeWaveBonusStacks || 0) * 0.10;

    const pStates: UnitBattleState[] = activeUnits.map((u, i) => {
      let atkMult = 1 + stackBonus;
      let hpMult = 1 + stackBonus;

      // Synergy calculations + Arm-Blaster (+40% synergy boost)
      const syn = synergies.find(s => s.category === u.category);
      let synergyBoost = 0;
      (u.items || []).forEach(it => {
        if (it.stats.synergyBoostPct) synergyBoost += it.stats.synergyBoostPct / 100;
      });

      if (syn) {
        const boostMult = 1 + synergyBoost;
        atkMult += (syn.atkBonusPct / 100) * boostMult;
        hpMult += (syn.hpBonusPct / 100) * boostMult;
      }

      // Player Item Stat Buffs
      let itemAtkPct = 0;
      let itemHpPct = 0;
      let hasShield = false;
      let combatStartHealPct = 0;
      (u.items || []).forEach(it => {
        if (it.stats.atkBonusPct) itemAtkPct += it.stats.atkBonusPct;
        if (it.stats.hpBonusPct) itemHpPct += it.stats.hpBonusPct;
        if (it.trigger === 'shieldFirstHit') hasShield = true;
        if (it.trigger === 'combatStartHeal') combatStartHealPct += 25;
      });

      atkMult += itemAtkPct / 100;
      hpMult += itemHpPct / 100;

      // CRITICAL FIX: Dead units stay dead (u.hp <= 0) for subsequent waves in the rest pause!
      const totalMaxHp = Math.round(u.maxHp * hpMult);
      const isDead = typeof u.hp === 'number' && u.hp <= 0;
      let startHp = isDead ? 0 : Math.min(totalMaxHp, Math.round((u.hp !== undefined ? u.hp : u.maxHp) * hpMult));
      if (!isDead && combatStartHealPct > 0 && startHp < totalMaxHp) {
        startHp = Math.min(totalMaxHp, startHp + Math.round(totalMaxHp * (combatStartHealPct / 100)));
      }

      if (!playerLungeAnims[i]) playerLungeAnims[i] = new Animated.Value(0);
      else playerLungeAnims[i].setValue(0);

      if (!playerShakeAnims[i]) playerShakeAnims[i] = new Animated.Value(0);
      else playerShakeAnims[i].setValue(0);

      return {
        unit: u,
        currentHp: startHp,
        maxHp: totalMaxHp,
        atk: Math.round(u.atk * atkMult),
        isDead,
        floatingDmg: null,
        hasShield,
        isEnraged: false,
        atkStacks: 0,
      };
    });

    const eStates: UnitBattleState[] = (enemySquad?.units || []).map((eu, i) => {
      let itemAtkPct = 0;
      let itemHpPct = 0;
      let hasShield = false;
      (eu.items || []).forEach(it => {
        if (it.stats.atkBonusPct) itemAtkPct += it.stats.atkBonusPct;
        if (it.stats.hpBonusPct) itemHpPct += it.stats.hpBonusPct;
        if (it.trigger === 'shieldFirstHit') hasShield = true;
      });

      const totalMaxHp = Math.round((eu.maxHp || eu.hp) * (1 + itemHpPct / 100));
      const totalAtk = Math.round(eu.atk * (1 + itemAtkPct / 100));

      if (!enemyLungeAnims[i]) enemyLungeAnims[i] = new Animated.Value(0);
      else enemyLungeAnims[i].setValue(0);

      if (!enemyShakeAnims[i]) enemyShakeAnims[i] = new Animated.Value(0);
      else enemyShakeAnims[i].setValue(0);

      return {
        unit: eu,
        currentHp: totalMaxHp,
        maxHp: totalMaxHp,
        atk: totalAtk,
        isDead: false,
        floatingDmg: null,
        hasShield,
        isEnraged: false,
        atkStacks: 0,
      };
    });

    setPlayerStates(pStates);
    setEnemyStates(eStates);
    return { pStates, eStates };
  }, [board, enemySquad, activeWaveBonusStacks, getActiveSynergies]);

  useEffect(() => {
    setupBattle();
    return () => {
      isFightingRef.current = false;
      if (nextTurnTimer.current) clearTimeout(nextTurnTimer.current);
    };
  }, [setupBattle]);

  // Shake animation (Native driver)
  const shake = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: -6, duration: 35, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6, duration: 35, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -3, duration: 35, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  // Start fight execution
  const beginFight = () => {
    setCombatPhase('fighting');
    setBattleResult(null);
    setResultModalVisible(false);
    setStatusMessage(enemySquad?.isMiniBoss 
      ? `👹 MINI-BOSS KAMPF! (+12 🏆 / -6 🏆)` 
      : `⚔️ Welle ${currentWaveInPause} gestartet!`);
    isFightingRef.current = true;
    triggerMedium();

    executeTurn(0, [...playerStates], [...enemyStates], true);
  };

  // Mini-Boss Intro animation
  const triggerMiniBossIntroAnimation = () => {
    setMiniBossIntroVisible(true);
    miniBossIntroScale.setValue(0.3);
    miniBossIntroOpacity.setValue(1);
    miniBossShakeAnim.setValue(0);

    try {
      Vibration.vibrate([0, 70, 50, 100, 60, 150]);
    } catch {}
    triggerHeavy();

    Animated.parallel([
      Animated.spring(miniBossIntroScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(miniBossShakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
        Animated.timing(miniBossShakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(miniBossShakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(miniBossShakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(miniBossShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]),
    ]).start();

    setTimeout(() => {
      Animated.timing(miniBossIntroOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setMiniBossIntroVisible(false);
        beginFight();
      });
    }, 1900);
  };

  // Start battle
  const startBattle = () => {
    const readyPlayerUnits = playerStates.filter(p => !p.isDead && p.currentHp > 0);
    if (readyPlayerUnits.length === 0 || !enemySquad || enemySquad.units.length === 0) return;

    if (enemySquad?.isMiniBoss && !hasTriggeredMiniBossIntro.current) {
      hasTriggeredMiniBossIntro.current = true;
      triggerMiniBossIntroAnimation();
    } else {
      beginFight();
    }
  };

  // Turn-by-Turn execution driven by Native Animation callbacks
  const executeTurn = (
    turnCount: number,
    currPlayers: UnitBattleState[],
    currEnemies: UnitBattleState[],
    isPlayer: boolean
  ) => {
    if (!isFightingRef.current) return;

    const alivePlayerIdxs = currPlayers.map((p, idx) => (!p.isDead && p.currentHp > 0 ? idx : -1)).filter(i => i !== -1);
    const aliveEnemyIdxs = currEnemies.map((e, idx) => (!e.isDead && e.currentHp > 0 ? idx : -1)).filter(i => i !== -1);

    // Check Victory
    if (aliveEnemyIdxs.length === 0) {
      finishBattle(true, currPlayers);
      return;
    }
    // Check Defeat
    if (alivePlayerIdxs.length === 0) {
      finishBattle(false, currPlayers);
      return;
    }

    const pace = speedMultiplier === 2 ? 140 : 280;

    if (isPlayer) {
      const pIdx = alivePlayerIdxs[turnCount % alivePlayerIdxs.length];
      const targetEnemyIdx = aliveEnemyIdxs[0];

      const attacker = currPlayers[pIdx];
      const target = currEnemies[targetEnemyIdx];

      // Turn Regeneration: Elektrolyte-Drink / Intra-Workout
      const turnRegenItem = (attacker.unit.items || []).find(it => it.trigger === 'turnRegen');
      if (turnRegenItem && attacker.currentHp < attacker.maxHp) {
        const healAmt = Math.max(1, Math.round(attacker.maxHp * 0.12));
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmt);
        attacker.floatingDmg = { text: `+${healAmt} HP`, isHeal: true };
      }

      // Item Stat Bonuses
      let critChance = attacker.unit.category === 'Chest' ? 0.35 : 0.08;
      let critMult = 1.5;
      let armorPen = 0;
      let lifesteal = 0;
      let cleave = 0;
      (attacker.unit.items || []).forEach(it => {
        if (it.stats.critChanceBonus) critChance += it.stats.critChanceBonus / 100;
        if (it.stats.critDmgMult) critMult = it.stats.critDmgMult;
        if (it.stats.armorPenPct) armorPen += it.stats.armorPenPct / 100;
        if (it.stats.lifestealPct) lifesteal += it.stats.lifestealPct / 100;
        if (it.stats.cleavePct) cleave += it.stats.cleavePct / 100;
      });

      let flatReduction = 0;
      let thorns = 0;
      let maxDmgCapPct: number | undefined = undefined;
      (target.unit.items || []).forEach(it => {
        if (it.stats.flatDmgReduction) flatReduction += it.stats.flatDmgReduction / 100;
        if (it.stats.thornsPct) thorns += it.stats.thornsPct / 100;
        if (it.stats.maxDmgPerHitPct) maxDmgCapPct = it.stats.maxDmgPerHitPct / 100;
      });

      const effectiveReduction = Math.max(0, flatReduction * (1 - armorPen));
      const isCrit = Math.random() < critChance;
      const stackBonus = attacker.atkStacks * 0.06;
      let rawDmg = Math.round(attacker.atk * (1 + stackBonus) * (isCrit ? critMult : 0.95 + Math.random() * 0.2));
      let dmg = Math.round(rawDmg * (1 - effectiveReduction));

      if (maxDmgCapPct) {
        const cap = Math.round(target.maxHp * maxDmgCapPct);
        if (dmg > cap) dmg = cap;
      }

      // Foam Roller first-hit shield
      let isBlocked = false;
      if (target.hasShield) {
        dmg = 0;
        target.hasShield = false;
        isBlocked = true;
      }

      // Fractional plates progression
      (attacker.unit.items || []).forEach(it => {
        if (it.stats.stackingAtkPct) attacker.atkStacks += 1;
      });

      Animated.sequence([
        Animated.timing(playerLungeAnims[pIdx], {
          toValue: -22,
          duration: speedMultiplier === 2 ? 80 : 130,
          useNativeDriver: true,
        }),
        Animated.timing(playerLungeAnims[pIdx], {
          toValue: 0,
          duration: speedMultiplier === 2 ? 90 : 140,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        if (!isFightingRef.current) return;

        shake(enemyShakeAnims[targetEnemyIdx]);
        triggerLight();

        let remainingHp = Math.max(0, target.currentHp - dmg);
        let isDead = remainingHp <= 0;
        let targetAtk = target.atk;
        let healFloatText: string | null = null;

        // Golden Elixir Revive check
        if (isDead) {
          const reviveItem = (target.unit.items || []).find(it => it.trigger === 'reviveOrMajorHeal');
          if (reviveItem && !target.reviveUsed) {
            target.reviveUsed = true;
            isDead = false;
            remainingHp = Math.round(target.maxHp * 0.35);
            targetAtk = Math.round(target.atk * 1.3);
            healFloatText = '✨ WIEDERBELEBT!';
            setStatusMessage(`✨ ${target.unit.exerciseName} trotzt K.O. mit dem Anabolen Elixier!`);
          } else {
            triggerHeavy();
          }
        } else if (remainingHp <= target.maxHp * 0.35) {
          // Emergency Dextrose Heal
          const emergencyItem = (target.unit.items || []).find(it => it.trigger === 'emergencyHeal');
          if (emergencyItem && !target.emergencyHealUsed) {
            target.emergencyHealUsed = true;
            const healAmt = Math.round(target.maxHp * 0.50);
            remainingHp = Math.min(target.maxHp, remainingHp + healAmt);
            healFloatText = `💚 +${healAmt} Dextrose!`;
            setStatusMessage(`💚 Dextrose-Shot rettet ${target.unit.exerciseName} (+${healAmt} HP)!`);
          }
        }

        // Smelling salts rage trigger (<30% HP)
        if (!target.isEnraged && remainingHp > 0 && remainingHp <= target.maxHp * 0.3) {
          const hasRageItem = (target.unit.items || []).some(it => it.trigger === 'lowHpRage');
          if (hasRageItem) {
            target.isEnraged = true;
            targetAtk = Math.round(target.atk * 1.6);
            setStatusMessage(`⚡ ${target.unit.exerciseName} gerät in Riechsalz-Wut (+60% ATK)!`);
          }
        }

        // Lifesteal & Thorns
        if (lifesteal > 0 && dmg > 0) {
          attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + Math.round(dmg * lifesteal));
        }
        if (thorns > 0 && dmg > 0) {
          attacker.currentHp = Math.max(0, attacker.currentHp - Math.round(dmg * thorns));
          if (attacker.currentHp <= 0) attacker.isDead = true;
        }

        // Cleave (Pump booster)
        if (cleave > 0 && aliveEnemyIdxs.length > 1) {
          const adjIdx = aliveEnemyIdxs[1];
          const adj = currEnemies[adjIdx];
          if (adj) {
            const cleaveDmg = Math.round(dmg * cleave);
            const adjHp = Math.max(0, adj.currentHp - cleaveDmg);
            currEnemies[adjIdx] = {
              ...adj,
              currentHp: adjHp,
              isDead: adjHp <= 0,
              floatingDmg: { text: `-${cleaveDmg} Cleave` }
            };
          }
        }

        currEnemies[targetEnemyIdx] = {
          ...target,
          currentHp: remainingHp,
          atk: targetAtk,
          isDead,
          floatingDmg: healFloatText 
            ? { text: healFloatText, isHeal: true }
            : { text: isBlocked ? '🛡️ BLOCKED' : `-${dmg}`, isCrit },
        };
        setEnemyStates([...currEnemies]);
        setPlayerStates([...currPlayers]);
        setStatusMessage(isBlocked 
          ? `🛡️ ${target.unit.exerciseName} absorbiert den Treffer (Foam Roller)!`
          : `💥 ${attacker.unit.exerciseName} trifft für ${dmg} ${isCrit ? '🔥 CRIT!' : ''}`);

        setTimeout(() => {
          if (currEnemies[targetEnemyIdx]) {
            currEnemies[targetEnemyIdx] = { ...currEnemies[targetEnemyIdx], floatingDmg: null };
            setEnemyStates([...currEnemies]);
          }
        }, speedMultiplier === 2 ? 180 : 250);

        nextTurnTimer.current = setTimeout(() => {
          executeTurn(turnCount, currPlayers, currEnemies, false);
        }, pace);
      }, speedMultiplier === 2 ? 70 : 110);
    } else {
      // Enemy turn (Symmetric item logic for enemy units!)
      const eIdx = aliveEnemyIdxs[turnCount % aliveEnemyIdxs.length];
      const targetPlayerIdx = alivePlayerIdxs[0];

      const attacker = currEnemies[eIdx];
      const target = currPlayers[targetPlayerIdx];

      // Turn Regeneration: Elektrolyte-Drink on enemy
      const turnRegenItem = (attacker.unit.items || []).find(it => it.trigger === 'turnRegen');
      if (turnRegenItem && attacker.currentHp < attacker.maxHp) {
        const healAmt = Math.max(1, Math.round(attacker.maxHp * 0.12));
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmt);
        attacker.floatingDmg = { text: `+${healAmt} HP`, isHeal: true };
      }

      let critChance = 0.08;
      let critMult = 1.5;
      let armorPen = 0;
      let lifesteal = 0;
      let cleave = 0;
      (attacker.unit.items || []).forEach(it => {
        if (it.stats.critChanceBonus) critChance += it.stats.critChanceBonus / 100;
        if (it.stats.critDmgMult) critMult = it.stats.critDmgMult;
        if (it.stats.armorPenPct) armorPen += it.stats.armorPenPct / 100;
        if (it.stats.lifestealPct) lifesteal += it.stats.lifestealPct / 100;
        if (it.stats.cleavePct) cleave += it.stats.cleavePct / 100;
      });

      let flatReduction = 0;
      let thorns = 0;
      let maxDmgCapPct: number | undefined = undefined;
      (target.unit.items || []).forEach(it => {
        if (it.stats.flatDmgReduction) flatReduction += it.stats.flatDmgReduction / 100;
        if (it.stats.thornsPct) thorns += it.stats.thornsPct / 100;
        if (it.stats.maxDmgPerHitPct) maxDmgCapPct = it.stats.maxDmgPerHitPct / 100;
      });

      const effectiveReduction = Math.max(0, flatReduction * (1 - armorPen));
      const isCrit = Math.random() < critChance;
      const stackBonus = attacker.atkStacks * 0.06;
      let rawDmg = Math.round(attacker.atk * (1 + stackBonus) * (isCrit ? critMult : 0.90 + Math.random() * 0.2));
      let dmg = Math.round(rawDmg * (1 - effectiveReduction));

      if (maxDmgCapPct) {
        const cap = Math.round(target.maxHp * maxDmgCapPct);
        if (dmg > cap) dmg = cap;
      }

      let isBlocked = false;
      if (target.hasShield) {
        dmg = 0;
        target.hasShield = false;
        isBlocked = true;
      }

      (attacker.unit.items || []).forEach(it => {
        if (it.stats.stackingAtkPct) attacker.atkStacks += 1;
      });

      Animated.sequence([
        Animated.timing(enemyLungeAnims[eIdx], {
          toValue: 22,
          duration: speedMultiplier === 2 ? 80 : 130,
          useNativeDriver: true,
        }),
        Animated.timing(enemyLungeAnims[eIdx], {
          toValue: 0,
          duration: speedMultiplier === 2 ? 90 : 140,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        if (!isFightingRef.current) return;

        shake(playerShakeAnims[targetPlayerIdx]);
        triggerLight();

        let remainingHp = Math.max(0, target.currentHp - dmg);
        let isDead = remainingHp <= 0;
        let targetAtk = target.atk;
        let healFloatText: string | null = null;

        // Player Golden Elixir Revive check
        if (isDead) {
          const reviveItem = (target.unit.items || []).find(it => it.trigger === 'reviveOrMajorHeal');
          if (reviveItem && !target.reviveUsed) {
            target.reviveUsed = true;
            isDead = false;
            remainingHp = Math.round(target.maxHp * 0.35);
            targetAtk = Math.round(target.atk * 1.3);
            healFloatText = '✨ WIEDERBELEBT!';
            setStatusMessage(`✨ ${target.unit.exerciseName} trotzt K.O. mit dem Anabolen Elixier!`);
          } else {
            triggerHeavy();
          }
        } else if (remainingHp <= target.maxHp * 0.35) {
          // Emergency Dextrose Heal
          const emergencyItem = (target.unit.items || []).find(it => it.trigger === 'emergencyHeal');
          if (emergencyItem && !target.emergencyHealUsed) {
            target.emergencyHealUsed = true;
            const healAmt = Math.round(target.maxHp * 0.50);
            remainingHp = Math.min(target.maxHp, remainingHp + healAmt);
            healFloatText = `💚 +${healAmt} Dextrose!`;
            setStatusMessage(`💚 Dextrose-Shot rettet ${target.unit.exerciseName} (+${healAmt} HP)!`);
          }
        }

        if (!target.isEnraged && remainingHp > 0 && remainingHp <= target.maxHp * 0.3) {
          const hasRageItem = (target.unit.items || []).some(it => it.trigger === 'lowHpRage');
          if (hasRageItem) {
            target.isEnraged = true;
            targetAtk = Math.round(target.atk * 1.6);
            setStatusMessage(`⚡ ${target.unit.exerciseName} gerät in Riechsalz-Wut (+60% ATK)!`);
          }
        }

        if (lifesteal > 0 && dmg > 0) {
          attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + Math.round(dmg * lifesteal));
        }
        if (thorns > 0 && dmg > 0) {
          attacker.currentHp = Math.max(0, attacker.currentHp - Math.round(dmg * thorns));
          if (attacker.currentHp <= 0) attacker.isDead = true;
        }

        if (cleave > 0 && alivePlayerIdxs.length > 1) {
          const adjIdx = alivePlayerIdxs[1];
          const adj = currPlayers[adjIdx];
          if (adj) {
            const cleaveDmg = Math.round(dmg * cleave);
            const adjHp = Math.max(0, adj.currentHp - cleaveDmg);
            currPlayers[adjIdx] = {
              ...adj,
              currentHp: adjHp,
              isDead: adjHp <= 0,
              floatingDmg: { text: `-${cleaveDmg} Cleave` }
            };
          }
        }

        currPlayers[targetPlayerIdx] = {
          ...target,
          currentHp: remainingHp,
          atk: targetAtk,
          isDead,
          floatingDmg: healFloatText 
            ? { text: healFloatText, isHeal: true }
            : { text: isBlocked ? '🛡️ BLOCKED' : `-${dmg}`, isCrit },
        };
        setPlayerStates([...currPlayers]);
        setEnemyStates([...currEnemies]);
        setStatusMessage(isBlocked
          ? `🛡️ ${target.unit.exerciseName} absorbiert den Hieb (Foam Roller)!`
          : `🛡️ ${attacker.unit.exerciseName} kontert für ${dmg} ${isCrit ? '🔥 CRIT!' : ''}`);

        setTimeout(() => {
          if (currPlayers[targetPlayerIdx]) {
            currPlayers[targetPlayerIdx] = { ...currPlayers[targetPlayerIdx], floatingDmg: null };
            setPlayerStates([...currPlayers]);
          }
        }, speedMultiplier === 2 ? 180 : 250);

        nextTurnTimer.current = setTimeout(() => {
          executeTurn(turnCount + 1, currPlayers, currEnemies, true);
        }, pace);
      }, speedMultiplier === 2 ? 70 : 110);
    }
  };

  const handleSkip = () => {
    if (!isFightingRef.current) return;
    isFightingRef.current = false;
    if (nextTurnTimer.current) clearTimeout(nextTurnTimer.current);

    const playerTotal = playerStates.reduce((acc, p) => acc + (p.isDead ? 0 : p.currentHp), 0);
    const enemyTotal = enemyStates.reduce((acc, e) => acc + (e.isDead ? 0 : e.currentHp), 0);

    finishBattle(playerTotal >= enemyTotal, playerStates);
  };

  // Finish battle: Trophies, Coins, and POP-UP MODAL!
  const finishBattle = (won: boolean, currentFighters: UnitBattleState[]) => {
    isFightingRef.current = false;
    if (nextTurnTimer.current) clearTimeout(nextTurnTimer.current);

    const isBoss = !!enemySquad?.isBoss;
    const isMiniBoss = !!enemySquad?.isMiniBoss;

    // Persist damaged HP back to store: dead units remain 0 HP
    const survivingHps: Record<string, number> = {};
    let aliveCount = 0;
    currentFighters.forEach(p => {
      const hpLeft = p.isDead ? 0 : Math.max(0, p.currentHp);
      survivingHps[p.unit.instanceId] = hpLeft;
      if (hpLeft > 0) aliveCount++;
    });
    saveBoardUnitHps(survivingHps);

    setSurvivingUnitsCount(aliveCount);
    setBattleResult(won ? 'victory' : 'defeat');
    setCombatPhase('finished');

    if (won) {
      const rewards = recordWaveVictory(isBoss, isMiniBoss);
      setEarnedTrophies(rewards.trophiesGained);
      setEarnedCoins(rewards.coinsGained);
      triggerSuccess();
      if (rewards.droppedItem) {
        setLootModalItem(rewards.droppedItem);
        setLootModalVisible(true);
      }
    } else {
      const defeatRewards = recordWaveDefeat(isMiniBoss);
      setEarnedTrophies(defeatRewards.trophiesLost > 0 ? -defeatRewards.trophiesLost : 0);
      setEarnedCoins(defeatRewards.coinsGained);
      triggerWarning();
    }

    setResultModalVisible(true);
  };

  // User selects "Nächste Welle fordern"
  const handleNextWave = () => {
    hasTriggeredMiniBossIntro.current = false;
    setResultModalVisible(false);
    setCombatPhase('idle');
    setBattleResult(null);
    spawnNextWave();
  };

  // User selects "Zum Shop & Team"
  const handleToShop = () => {
    hasTriggeredMiniBossIntro.current = false;
    setResultModalVisible(false);
    setCombatPhase('idle');
    setBattleResult(null);
    // If wave was won, prepare next wave for when user returns
    if (battleResult === 'victory' && !enemySquad?.isBoss) {
      spawnNextWave();
    }
    onBackToTeam();
  };

  const handleChallengeBoss = () => {
    setResultModalVisible(false);
    isFightingRef.current = false;
    if (nextTurnTimer.current) clearTimeout(nextTurnTimer.current);

    setBossIntroVisible(true);
    bossIntroScale.setValue(0.4);
    bossIntroOpacity.setValue(1);
    bossThunderFlash.setValue(0);
    bossShakeAnim.setValue(0);

    try {
      Vibration.vibrate([0, 80, 60, 150, 80, 300]);
    } catch {
      // ignore
    }
    triggerHeavy();

    // Thunder flash animation (flashes white/purple)
    Animated.sequence([
      Animated.timing(bossThunderFlash, { toValue: 0.9, duration: 60, useNativeDriver: true }),
      Animated.timing(bossThunderFlash, { toValue: 0.2, duration: 80, useNativeDriver: true }),
      Animated.timing(bossThunderFlash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(bossThunderFlash, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    // Screen shake
    Animated.sequence([
      Animated.timing(bossShakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    // Scale banner in with bounce
    Animated.spring(bossIntroScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // After 2.1s, fade out and trigger encounter
    setTimeout(() => {
      Animated.timing(bossIntroOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setBossIntroVisible(false);
        triggerBossEncounter();
        setStatusMessage('👑 DER SCHATTEN-TITAN IST ERWACHT!');
      });
    }, 2100);
  };

  // Dynamic card width to guarantee all units fit in a single row without wrapping or pushing the screen down
  const maxUnitsInRow = Math.max(
    3,
    enemyStates.length,
    playerStates.length,
    (enemySquad?.units || []).length,
    activeUnits.length
  );
  const spacingGap = maxUnitsInRow >= 5 ? 3 : maxUnitsInRow >= 4 ? 4 : 6;
  const totalGaps = (maxUnitsInRow - 1) * spacingGap;
  const availableWidth = SCREEN_WIDTH - 24 - totalGaps;
  const compactWidth = Math.max(62, Math.min(104, Math.floor(availableWidth / maxUnitsInRow)));

  return (
    <View style={styles.container}>
      {/* 1. TOP WAVE-BONUS HUD BAR (Clear and always visible!) */}
      <View style={styles.topBonusHUD}>
        <View style={styles.bonusBadgeActive}>
          <Text style={styles.bonusTextActive}>
            🔥 Aktiver Bonus: +{activeWaveBonusStacks * 10}% Stats ({activeWaveBonusStacks} Stacks)
          </Text>
        </View>
        <View style={styles.bonusBadgePending}>
          <Text style={styles.bonusTextPending}>
            ⭐ In dieser Pause aufgebaut: +{pendingWaveBonusStacks} Stacks
          </Text>
        </View>
      </View>

      {/* 2. ARENA BANNER (Shows active unlocked Arena with title, icon, and atmosphere) */}
      <View
        style={[
          styles.arenaBanner,
          {
            backgroundColor: activeArena.backgroundColor,
            borderColor: activeArena.borderColor,
            shadowColor: activeArena.primaryColor,
            shadowOpacity: activeArena.id !== 'gym' ? 0.35 : 0.05,
            shadowRadius: 8,
          },
        ]}
      >
        <View style={styles.arenaBannerLeft}>
          <View
            style={[
              styles.arenaIconCircle,
              {
                backgroundColor: `${activeArena.primaryColor}25`,
                borderColor: activeArena.borderColor,
              },
            ]}
          >
            <MaterialCommunityIcons name={activeArena.icon as any} size={15} color={activeArena.primaryColor} />
          </View>
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.arenaBannerTitle, { color: activeArena.primaryColor }]}>
                {activeArena.badgeEmoji} {activeArena.name.toUpperCase()}
              </Text>
              {activeArena.requiredTrophies > 0 && (
                <View style={[styles.arenaReqTag, { borderColor: `${activeArena.primaryColor}60` }]}>
                  <Text style={[styles.arenaReqTagText, { color: activeArena.primaryColor }]}>
                    {activeArena.requiredTrophies} 🏆
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.arenaBannerSubtitle}>{activeArena.subtitle}</Text>
          </View>
        </View>
      </View>

      {/* 3. ENEMY FORMATION */}
      <View
        style={[
          styles.arenaSection,
          {
            backgroundColor: enemySquad?.isBoss 
              ? '#160E1E' 
              : enemySquad?.isMiniBoss 
                ? '#1A140A' 
                : activeArena.backgroundColor,
            borderColor: enemySquad?.isBoss 
              ? '#A855F760' 
              : enemySquad?.isMiniBoss 
                ? '#FF950080' 
                : activeArena.borderColor,
            shadowColor: enemySquad?.isBoss 
              ? '#A855F7' 
              : enemySquad?.isMiniBoss 
                ? '#FF9500' 
                : activeArena.primaryColor,
            shadowOpacity: activeArena.id !== 'gym' || enemySquad?.isMiniBoss ? 0.35 : 0.08,
            shadowRadius: activeArena.id !== 'gym' || enemySquad?.isMiniBoss ? 8 : 2,
          },
          enemySquad?.isBoss && styles.bossSection,
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.infoRow}>
            <View 
              style={[
                styles.enemyCircle, 
                enemySquad?.isBoss && styles.bossCircle,
                enemySquad?.isMiniBoss && { backgroundColor: '#FF950020', borderColor: '#FF9500' }
              ]}
            >
              <MaterialCommunityIcons 
                name={enemySquad?.isBoss ? 'skull' : enemySquad?.isMiniBoss ? 'skull-crossbones' : 'skull-outline'} 
                size={16} 
                color={enemySquad?.isBoss ? '#C084FC' : enemySquad?.isMiniBoss ? '#FF9500' : '#FF453A'} 
              />
            </View>
            <View>
              <Text 
                style={[
                  styles.teamTitle, 
                  enemySquad?.isBoss && { color: '#C084FC' },
                  enemySquad?.isMiniBoss && { color: '#FF9500' }
                ]}
              >
                {enemySquad?.isBoss ? '🏰 Der Schatten-Titan' : enemySquad?.name || 'Gym Rogue'}
              </Text>
              <Text style={styles.teamSubtitle}>
                {enemySquad?.isBoss 
                  ? '🏰 Schloss des Titans • Endgegner deines Workouts' 
                  : (enemySquad?.bossSubtitle || `Weg zum Schloss 🏰 • Welle ${currentWaveInPause} • Satz ${round}`)}
              </Text>
            </View>
          </View>

          {/* Speed & Skip Controls */}
          {combatPhase === 'fighting' && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={styles.speedToggle}
                onPress={() => setSpeedMultiplier(prev => (prev === 1 ? 2 : 1))}
              >
                <Text style={styles.speedText}>{speedMultiplier}x Speed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>⚡ Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Enemy Cards Grid */}
        <View style={styles.cardsGrid}>
          {enemyStates.map((es, idx) => (
            <CombatUnitSlot
              key={es.unit.instanceId || `enemy_${idx}`}
              state={es}
              lungeAnim={enemyLungeAnims[idx] || new Animated.Value(0)}
              shakeAnim={enemyShakeAnims[idx] || new Animated.Value(0)}
              isPlayer={false}
              compactWidth={compactWidth}
            />
          ))}
        </View>
      </View>

      {/* 3. CENTER HUD & START BUTTON */}
      <View style={styles.centerHUD}>
        {/* Boss Encounter Banner if ready */}
        {isBossAvailable && !isBossDefeated && !enemySquad?.isBoss && combatPhase === 'idle' && (
          <TouchableOpacity style={styles.bossBannerTrigger} onPress={handleChallengeBoss}>
            <MaterialCommunityIcons name="crown" size={16} color="#FFD700" style={{ marginRight: 6 }} />
            <Text style={styles.bossBannerText}>👑 Schatten-Titan herausfordern (+25 🏆)</Text>
          </TouchableOpacity>
        )}

        {/* Quick Revive Action if any units are dead and player has a consumable */}
        {combatPhase === 'idle' && (() => {
          const deadUnit = board.find(u => u !== null && (typeof u.hp === 'number' && u.hp <= 0));
          const consumable = (itemInventory || []).find(it => it.isConsumable);
          if (deadUnit && consumable) {
            return (
              <TouchableOpacity
                style={styles.quickReviveBanner}
                onPress={() => {
                  const ok = useConsumableItem(consumable.id, deadUnit.instanceId);
                  if (ok) {
                    triggerSuccess();
                    setupBattle();
                    setStatusMessage(`💚 ${deadUnit.exerciseName} durch ${consumable.name} wiederbelebt!`);
                  }
                }}
              >
                <MaterialCommunityIcons name="heart-flash" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.quickReviveBannerText}>
                  {deadUnit.exerciseName} wiederbeleben (1x {consumable.name}) ⚡
                </Text>
              </TouchableOpacity>
            );
          }
          return null;
        })()}

        {combatPhase === 'idle' && (
          <TouchableOpacity
            style={[styles.startBtn, aliveUnits.length === 0 && styles.btnDisabled]}
            disabled={aliveUnits.length === 0}
            onPress={startBattle}
          >
            <MaterialCommunityIcons name="sword-cross" size={20} color="#000" style={{ marginRight: 6 }} />
            <Text style={styles.startBtnText}>
              {aliveUnits.length === 0 
                ? 'Truppen K.O.! (Heilung bei neuem Satz)' 
                : enemySquad?.isBoss 
                  ? '🏰 Schloss betreten: Titan-Kampf! 👑' 
                  : enemySquad?.isMiniBoss
                    ? `👹 Mini-Boss herausfordern! (+12 🏆 / -6 🏆)`
                    : `Welle ${currentWaveInPause} starten! ⚔️`}
            </Text>
          </TouchableOpacity>
        )}

        {combatPhase === 'fighting' && (
          <View style={styles.liveStatusBadge}>
            <MaterialCommunityIcons name="sword-cross" size={16} color="#FFD700" style={{ marginRight: 6 }} />
            <Text style={styles.liveStatusText} numberOfLines={1}>
              {statusMessage}
            </Text>
          </View>
        )}
      </View>

      {/* 4. PLAYER FORMATION */}
      <View
        style={[
          styles.arenaSection,
          {
            backgroundColor: activeArena.backgroundColor,
            borderColor: activeArena.borderColor,
            shadowColor: activeArena.primaryColor,
            shadowOpacity: activeArena.id !== 'gym' ? 0.35 : 0.08,
            shadowRadius: activeArena.id !== 'gym' ? 8 : 2,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.infoRow}>
            <View style={[styles.enemyCircle, { backgroundColor: '#30D15820', borderColor: '#30D158' }]}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#30D158" />
            </View>
            <View>
              <Text style={styles.teamTitle}>Dein Squad</Text>
              <Text style={[styles.teamSubtitle, { color: '#30D158' }]}>
                {aliveUnits.length} von {activeUnits.length} einsatzbereit
              </Text>
            </View>
          </View>

          {combatPhase === 'idle' && (
            <TouchableOpacity style={styles.aufstellungBtn} onPress={onBackToTeam}>
              <MaterialCommunityIcons name="cog-outline" size={14} color="#8E8E93" style={{ marginRight: 4 }} />
              <Text style={styles.aufstellungText}>Aufstellung</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Player Cards Grid */}
        <View style={styles.cardsGrid}>
          {playerStates.map((ps, idx) => (
            <CombatUnitSlot
              key={ps.unit.instanceId || `player_${idx}`}
              state={ps}
              lungeAnim={playerLungeAnims[idx] || new Animated.Value(0)}
              shakeAnim={playerShakeAnims[idx] || new Animated.Value(0)}
              isPlayer={true}
              compactWidth={compactWidth}
            />
          ))}
        </View>
      </View>

      {/* 5. VICTORY / DEFEAT POP-UP MODAL (Prominent & Clear!) */}
      <Modal
        visible={resultModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, battleResult === 'victory' ? styles.modalCardWin : styles.modalCardLoss]}>
            {/* Header Icon & Title */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderEmoji}>
                {battleResult === 'victory' 
                  ? (enemySquad?.isBoss ? '👑' : (enemySquad?.isMiniBoss ? '👹' : '🏆')) 
                  : '💀'}
              </Text>
              <Text style={styles.modalTitle}>
                {battleResult === 'victory' 
                  ? (enemySquad?.isBoss ? '🏰 TITAN BEZWUNGEN!' : (enemySquad?.isMiniBoss ? 'MINI-BOSS BESIEGT!' : `WELLE ${currentWaveInPause} GEWONNEN!`)) 
                  : (enemySquad?.isBoss ? '🏰 VOM TITAN IM SCHLOSS BEZWUNGEN!' : enemySquad?.isMiniBoss ? 'VOM MINI-BOSS BEZWUNGEN!' : `WELLE ${currentWaveInPause} VERLOREN!`)}
              </Text>
              <Text style={styles.modalSubhead}>
                {battleResult === 'victory'
                  ? (enemySquad?.isBoss
                      ? 'Epischer Sieg im Schloss des Titans! +25 🏆 Pokale für deinen Trophäen-Pfad verdient!'
                      : (enemySquad?.isMiniBoss
                          ? 'Du hast den Mini-Boss bezwungen! +12 🏆 Pokale & Beute erbeutet!'
                          : (survivingUnitsCount > 0 
                              ? `${survivingUnitsCount} Einheiten haben überlebt • +1 Satz-Stack aufgebaut!` 
                              : 'Knapper Sieg! Deine Truppen sind erschöpft.')))
                  : (enemySquad?.isBoss
                      ? 'Der Schatten-Titan hat dein Team überwältigt! Stärke deine Einheiten im Shop und versuche es erneut!'
                      : enemySquad?.isMiniBoss
                        ? 'Du hast gegen den Mini-Boss verloren (-6 🏆 Pokale), erhältst aber 2 Trost-Plates für den Shop.'
                        : 'Deine Truppen wurden K.O. geschlagen!')}
              </Text>
            </View>

            {/* Rewards Row (if victory) */}
            {battleResult === 'victory' && (
              <View style={styles.rewardsRow}>
                {earnedTrophies > 0 ? (
                  <View style={[styles.rewardPill, enemySquad?.isMiniBoss ? { borderColor: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.15)' } : styles.rewardPillBoss]}>
                    <Text style={styles.rewardIcon}>🏆</Text>
                    <Text style={[styles.rewardValue, { color: enemySquad?.isMiniBoss ? '#FF9500' : '#FFD700' }]}>+{earnedTrophies}</Text>
                    <Text style={styles.rewardLabel}>{enemySquad?.isMiniBoss ? 'Pokale (Mini-Boss!)' : 'Pokale (Boss-Sieg!)'}</Text>
                  </View>
                ) : (
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardIcon}>⭐</Text>
                    <Text style={[styles.rewardValue, { color: '#30D158' }]}>+1 Stack</Text>
                    <Text style={styles.rewardLabel}>Satz-Bonus</Text>
                  </View>
                )}
                <View style={styles.rewardPill}>
                  <WeightPlateIcon size={24} color="#FFD700" style={{ marginBottom: 4 }} />
                  <Text style={styles.rewardValue}>+{earnedCoins}</Text>
                  <Text style={styles.rewardLabel}>Plates</Text>
                </View>
                {enemySquad?.isMiniBoss && lootModalItem && (
                  <TouchableOpacity
                    style={[styles.rewardPill, { borderColor: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}
                    onPress={() => setLootModalVisible(true)}
                  >
                    <Text style={styles.rewardIcon}>{lootModalItem.icon}</Text>
                    <Text style={[styles.rewardValue, { color: '#FF9500' }]}>1x Loot</Text>
                    <Text style={styles.rewardLabel}>Beute öffnen</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Consolation Bounty (if defeat) */}
            {battleResult === 'defeat' && (
              <View style={styles.rewardsRow}>
                {earnedTrophies < 0 ? (
                  <View style={[styles.rewardPill, { borderColor: '#FF453A80', backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                    <Text style={styles.rewardIcon}>💀</Text>
                    <Text style={[styles.rewardValue, { color: '#FF453A' }]}>{earnedTrophies}</Text>
                    <Text style={styles.rewardLabel}>Pokale (Mini-Boss!)</Text>
                  </View>
                ) : null}
                {earnedCoins > 0 && (
                  <View style={[styles.rewardPill, { borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(255, 215, 0, 0.08)' }]}>
                    <WeightPlateIcon size={24} color="#FFD700" style={{ marginBottom: 4 }} />
                    <Text style={[styles.rewardValue, { color: '#FFD700' }]}>+{earnedCoins}</Text>
                    <Text style={styles.rewardLabel}>Trost-Münzen</Text>
                  </View>
                )}
                <View style={[styles.rewardPill, { borderColor: 'rgba(0, 210, 255, 0.3)', backgroundColor: 'rgba(0, 210, 255, 0.06)' }]}>
                  <Text style={styles.rewardIcon}>🛡️</Text>
                  <Text style={[styles.rewardValue, { color: '#00D2FF' }]}>Shop</Text>
                  <Text style={styles.rewardLabel}>Team verstärken</Text>
                </View>
              </View>
            )}

            {/* Highlighted Wave Bonus Card */}
            <View style={styles.waveBonusCard}>
              <View style={styles.waveBonusHeaderRow}>
                <MaterialCommunityIcons name="fire" size={18} color="#FF9500" />
                <Text style={styles.waveBonusCardTitle}>
                  {enemySquad?.isBoss ? 'Titan bezwungen • Satz-Bonus bereit' : 'Wellen-Bonus für nächsten Satz'}
                </Text>
              </View>
              <Text style={styles.waveBonusBigNum}>+{pendingWaveBonusStacks} Stacks</Text>
              <Text style={styles.waveBonusCardDesc}>
                {pendingWaveBonusStacks > 0 
                  ? `Bringt +${pendingWaveBonusStacks * 10}% Stats & +${pendingWaveBonusStacks} Plates beim nächsten Gym-Satz!` 
                  : 'Schließe Wellen ab, um Stacks für deinen nächsten Satz zu sammeln!'}
              </Text>
              {!enemySquad?.isBoss && (
                <View style={styles.trophyInfoBox}>
                  <Text style={styles.trophyInfoText}>
                    💡 Pokale gibt es bei Mini-Bossen (+12 🏆) und dem finalen Schatten-Titan (+25 🏆)!
                  </Text>
                </View>
              )}
            </View>

            {/* Defeat hint */}
            {battleResult === 'defeat' && (
              <View style={styles.recoveryNoticeCard}>
                <MaterialCommunityIcons name="heart-pulse" size={20} color="#30D158" style={{ marginRight: 8 }} />
                <Text style={styles.recoveryNoticeText}>
                  Keine Sorge! Sobald du deinen nächsten Gym-Satz im echten Training abhakst, heilen alle Karten wieder auf 100% HP auf!
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionsCol}>
              {battleResult === 'victory' && survivingUnitsCount > 0 && !enemySquad?.isBoss && (
                <TouchableOpacity style={styles.actionBtnNextWave} onPress={handleNextWave}>
                  <MaterialCommunityIcons name="sword" size={18} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnNextWaveText}>
                    Welle {currentWaveInPause + 1} herausfordern ⚔️
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionBtnShop} onPress={handleToShop}>
                <MaterialCommunityIcons name="store" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnShopText}>
                  {battleResult === 'victory' && survivingUnitsCount > 0 
                    ? `Zum Shop & Team (Welle ${currentWaveInPause + 1} wartet)` 
                    : 'Zum Shop & Team 🛠️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. EPIC BOSS INTRO OVERLAY */}
      {bossIntroVisible && (
        <Animated.View
          style={[
            styles.bossIntroOverlay,
            {
              opacity: bossIntroOpacity,
              transform: [{ translateX: bossShakeAnim }],
            },
          ]}
          pointerEvents="none"
        >
          {/* Lightning Flash Backdrop */}
          <Animated.View
            style={[
              styles.bossThunderLayer,
              {
                opacity: bossThunderFlash,
              },
            ]}
          />

          {/* Epic Centered Card */}
          <Animated.View
            style={[
              styles.bossIntroCenter,
              {
                transform: [{ scale: bossIntroScale }],
              },
            ]}
          >
            <View style={styles.bossIntroCard}>
              <View style={styles.bossSkullCircle}>
                <MaterialCommunityIcons name="skull" size={44} color="#C084FC" />
              </View>

              <View style={styles.bossWarningTag}>
                <MaterialCommunityIcons name="alert-decagram" size={14} color="#FF453A" style={{ marginRight: 4 }} />
                <Text style={styles.bossWarningText}>WARNUNG: TITAN ERWACHT</Text>
              </View>

              <Text style={styles.bossIntroTitle}>SCHATTEN-TITAN</Text>
              <Text style={styles.bossIntroSub}>
                Spiegelbild deiner heutigen Trainingsgewichte!
              </Text>

              <View style={styles.bossTrophyRewardPill}>
                <MaterialCommunityIcons name="trophy" size={18} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={styles.bossTrophyRewardText}>KOPFGELD: +25 🏆 POKALE</Text>
              </View>

              <Text style={styles.bossThreatDesc}>
                ⚡ Enorme Zähigkeit & 100% Workout-Echo
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* 7. MINI-BOSS INTRO OVERLAY */}
      {miniBossIntroVisible && (
        <Animated.View
          style={[
            styles.miniBossIntroOverlay,
            {
              opacity: miniBossIntroOpacity,
              transform: [{ scale: miniBossIntroScale }, { translateX: miniBossShakeAnim }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.miniBossIntroCard}>
            <View style={styles.miniBossWarningTag}>
              <MaterialCommunityIcons name="alert" size={15} color="#FF9500" style={{ marginRight: 6 }} />
              <Text style={styles.miniBossWarningText}>WARNUNG • MINI-BOSS ERSCHIENEN</Text>
            </View>

            <View style={styles.miniBossAvatarCircle}>
              <MaterialCommunityIcons 
                name={(enemySquad?.avatar as any) || 'skull'} 
                size={50} 
                color="#FF9500" 
              />
            </View>

            <Text style={styles.miniBossIntroTitle}>
              {enemySquad?.name || 'Mini-Boss'}
            </Text>
            <Text style={styles.miniBossIntroSub}>
              {enemySquad?.bossSubtitle || `Welle ${currentWaveInPause}`}
            </Text>

            <View style={styles.miniBossStakeBox}>
              <View style={styles.miniBossStakeRow}>
                <Text style={styles.miniBossStakeIcon}>🏆</Text>
                <Text style={styles.miniBossStakeWin}>Sieg: +12 Pokale & Loot-Drop!</Text>
              </View>
              <View style={styles.miniBossStakeRow}>
                <Text style={styles.miniBossStakeIcon}>💀</Text>
                <Text style={styles.miniBossStakeLoss}>Niederlage: -6 Pokale</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* 8. MINI-BOSS LOOT REVEAL MODAL */}
      <AutoChessLootModal
        visible={lootModalVisible}
        item={lootModalItem}
        onClaim={() => {
          claimLootDrop();
          setLootModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-between',
    backgroundColor: '#09090D',
  },
  topBonusHUD: {
    backgroundColor: '#12121A',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#22222E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  bonusBadgeActive: {
    flex: 1,
  },
  bonusTextActive: {
    color: '#FF9500',
    fontSize: 9.5,
    fontWeight: '800',
  },
  bonusBadgePending: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bonusTextPending: {
    color: '#30D158',
    fontSize: 9.5,
    fontWeight: '800',
  },
  arenaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.2,
    marginBottom: 8,
  },
  arenaBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arenaIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arenaBannerTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  arenaReqTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 0.8,
    backgroundColor: '#00000030',
  },
  arenaReqTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  arenaBannerSubtitle: {
    color: '#8E8E93',
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 1,
  },
  arenaSection: {
    backgroundColor: '#111116',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#20202A',
  },
  bossSection: {
    backgroundColor: '#160E1E',
    borderColor: '#A855F760',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enemyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF453A20',
    borderWidth: 1,
    borderColor: '#FF453A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bossCircle: {
    backgroundColor: '#A855F730',
    borderColor: '#C084FC',
  },
  teamTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  teamSubtitle: {
    color: '#8E8E93',
    fontSize: 9.5,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedToggle: {
    backgroundColor: '#1E1E28',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#343444',
  },
  speedText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  skipBtn: {
    backgroundColor: '#FF950020',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  skipText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '800',
  },
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
    flexWrap: 'nowrap',
  },
  centerHUD: {
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossBannerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B21A835',
    borderColor: '#C084FC',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 6,
  },
  bossBannerText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '900',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#30D158',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
  },
  startBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  btnDisabled: {
    backgroundColor: '#262630',
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD70040',
    maxWidth: '90%',
  },
  liveStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  aufstellungBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aufstellungText: {
    color: '#8E8E93',
    fontSize: 9.5,
    fontWeight: '700',
  },

  // Pop-Up Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  modalCardWin: {
    backgroundColor: '#0F1A12',
    borderColor: '#30D158',
  },
  modalCardLoss: {
    backgroundColor: '#1A0E10',
    borderColor: '#FF453A',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSubhead: {
    color: '#A0A0AA',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
  },
  rewardPill: {
    backgroundColor: '#1E281F',
    borderWidth: 1,
    borderColor: '#30D15850',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  rewardPillBoss: {
    backgroundColor: '#262010',
    borderColor: '#FFD70080',
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  rewardLabel: {
    color: '#8E8E93',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  waveBonusCard: {
    width: '100%',
    backgroundColor: '#141E15',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF950050',
    marginBottom: 14,
    alignItems: 'center',
  },
  waveBonusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  waveBonusCardTitle: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '800',
  },
  waveBonusBigNum: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  waveBonusCardDesc: {
    color: '#A0A0AA',
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  trophyInfoBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#253526',
    width: '100%',
  },
  trophyInfoText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  recoveryNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162217',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#30D15840',
  },
  recoveryNoticeText: {
    color: '#E0E0E6',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  modalActionsCol: {
    width: '100%',
    gap: 10,
  },
  actionBtnNextWave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 13,
    borderRadius: 14,
  },
  actionBtnNextWaveText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  actionBtnShop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242432',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A4C',
  },
  actionBtnShopText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bossIntroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 2, 10, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  bossThunderLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#BF5AF2',
  },
  bossIntroCenter: {
    width: '88%',
    alignItems: 'center',
  },
  bossIntroCard: {
    width: '100%',
    backgroundColor: '#180B22',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#C084FC',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
  },
  bossSkullCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E1045',
    borderWidth: 2,
    borderColor: '#C084FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#C084FC',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  bossWarningTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF453A25',
    borderColor: '#FF453A80',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  bossWarningText: {
    color: '#FF453A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  bossIntroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: '#A855F7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  bossIntroSub: {
    color: '#D8B4FE',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  bossTrophyRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    borderColor: '#FFD700',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  bossTrophyRewardText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bossThreatDesc: {
    color: '#9E9EB0',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  miniBossIntroOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(5, 5, 10, 0.90)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  miniBossIntroCard: {
    width: '92%',
    backgroundColor: '#16120E',
    borderColor: '#FF9500',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 20,
  },
  miniBossWarningTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950025',
    borderColor: '#FF950090',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  miniBossWarningText: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  miniBossAvatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FF950020',
    borderColor: '#FF9500',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniBossIntroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: '#FF9500',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  miniBossIntroSub: {
    color: '#FFD7A8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  miniBossStakeBox: {
    width: '100%',
    backgroundColor: '#0E0B08',
    borderColor: '#FF950050',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  miniBossStakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBossStakeIcon: {
    fontSize: 14,
  },
  miniBossStakeWin: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '800',
  },
  miniBossStakeLoss: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '800',
  },
  quickReviveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF453A',
    borderColor: '#FF6961',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 8,
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
  },
  quickReviveBannerText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },
});
