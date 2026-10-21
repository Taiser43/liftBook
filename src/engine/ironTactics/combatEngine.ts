import { AutoChessItem } from '../../constants/autoChessItems';
import { ArenaEffectId } from '../../constants/ironTacticsArenas';
import { CoachId } from '../../constants/ironTacticsCoaches';
import { MuscleCategory } from '../../store/useAutoChessStore';

export interface CombatUnitData {
  instanceId: string;
  name: string;
  category: MuscleCategory;
  stars: 1 | 2 | 3;
  baseAtk: number;
  baseHp: number;
  items?: AutoChessItem[];
  isBoss?: boolean;
}

export interface ActiveFighter {
  instanceId: string;
  name: string;
  category: MuscleCategory;
  stars: 1 | 2 | 3;
  currentHp: number;
  maxHp: number;
  atk: number;
  baseAtk: number;
  critChance: number;
  critMult: number;
  isDead: boolean;
  hasShield: boolean;
  isEnraged: boolean;
  atkStacks: number;
  items: AutoChessItem[];
  isPlayer: boolean;
}

export interface CombatEvent {
  tick: number;
  attackerSide: 'player' | 'enemy';
  attackerIndex: number;
  targetIndex: number;
  targetInstanceId: string;
  damage: number;
  isCrit: boolean;
  isBlocked: boolean;
  isKill: boolean;
  lifestealHeal: number;
  thornsDamage: number;
  cleaveDamage: number;
  thunderSplashDamage: number;
  message: string;
}

export interface BattleResult {
  winner: 'player' | 'enemy';
  ticks: number;
  events: CombatEvent[];
  playerFighters: ActiveFighter[];
  enemyFighters: ActiveFighter[];
  survivingPlayers: number;
  survivingEnemies: number;
}

/**
 * Builds active fighters applying synergies, arena effects, coach perks and items.
 */
export const buildActiveFighter = (
  unit: CombatUnitData,
  isPlayer: boolean,
  synergyCounts: Record<MuscleCategory, number>,
  arenaEffect: ArenaEffectId,
  coachId: CoachId | null,
  isPlanDeck: boolean = false
): ActiveFighter => {
  let atk = unit.baseAtk;
  let hp = unit.baseHp;

  // Star multipliers (1 = 1x, 2 = 1.8x, 3 = 3.0x)
  const starMult = unit.stars === 3 ? 3.0 : unit.stars === 2 ? 1.8 : 1.0;
  atk = Math.round(atk * starMult);
  hp = Math.round(hp * starMult);

  // Synergy bonuses (>=2 same category = +25%, >=3 = +60%)
  const catCount = synergyCounts[unit.category] || 0;
  let synBonus = catCount >= 3 ? 0.60 : catCount >= 2 ? 0.25 : 0;
  if (isPlayer && coachId === 'bb') {
    synBonus += 0.05; // Bodybuilder coach adds +5% to synergies
  }
  atk = Math.round(atk * (1 + synBonus));
  hp = Math.round(hp * (1 + synBonus));

  // Plan deck bonus (+10% stats)
  if (isPlayer && isPlanDeck) {
    atk = Math.round(atk * 1.10);
    hp = Math.round(hp * 1.10);
  }

  // Coach specific perks
  if (isPlayer && coachId === 'pl' && (unit.category === 'Chest' || unit.category === 'Legs')) {
    atk = Math.round(atk * 1.10);
  }
  if (isPlayer && coachId === 'bb' && (unit.category === 'Arms' || unit.category === 'Shoulders')) {
    hp = Math.round(hp * 1.10);
  }

  // Arena effects on stats
  if (arenaEffect === 'sand' && unit.category === 'Legs') {
    hp = Math.round(hp * 1.10);
  }

  // Items
  const items = unit.items || [];
  let itemAtkPct = 0;
  let itemHpPct = 0;
  let critChance = unit.category === 'Chest' ? 0.20 : 0.08;
  let critMult = 1.5;
  let hasShield = false;

  const forgeMultiplier = arenaEffect === 'forge' ? 1.20 : 1.0;

  items.forEach(it => {
    if (it.stats.atkBonusPct) itemAtkPct += it.stats.atkBonusPct * forgeMultiplier;
    if (it.stats.hpBonusPct) itemHpPct += it.stats.hpBonusPct * forgeMultiplier;
    if (it.stats.critChanceBonus) critChance += (it.stats.critChanceBonus / 100) * forgeMultiplier;
    if (it.stats.critDmgMult) critMult = it.stats.critDmgMult;
    if (it.trigger === 'shieldFirstHit') hasShield = true;
  });

  if (arenaEffect === 'neon') critChance += 0.10;
  if (arenaEffect === 'pump' && (unit.category === 'Arms' || unit.category === 'Shoulders')) {
    critChance += 0.15;
  }

  atk = Math.round(atk * (1 + itemAtkPct / 100));
  hp = Math.round(hp * (1 + itemHpPct / 100));

  return {
    instanceId: unit.instanceId,
    name: unit.name,
    category: unit.category,
    stars: unit.stars,
    currentHp: hp,
    maxHp: hp,
    atk,
    baseAtk: atk,
    critChance: Math.min(0.85, critChance),
    critMult,
    isDead: hp <= 0,
    hasShield,
    isEnraged: false,
    atkStacks: 0,
    items,
    isPlayer,
  };
};

/**
 * Executes a single combat turn between an attacker and a defending team.
 */
export const executeTurnStep = (
  tick: number,
  attackerSide: 'player' | 'enemy',
  attackerIdx: number,
  attackers: ActiveFighter[],
  defenders: ActiveFighter[],
  arenaEffect: ArenaEffectId,
  coachId: CoachId | null
): CombatEvent | null => {
  const attacker = attackers[attackerIdx];
  if (!attacker || attacker.isDead || attacker.currentHp <= 0) return null;

  const aliveDefenderIdxs = defenders
    .map((d, i) => (!d.isDead && d.currentHp > 0 ? i : -1))
    .filter(i => i !== -1);
  if (aliveDefenderIdxs.length === 0) return null;

  const targetIdx = aliveDefenderIdxs[0];
  const target = defenders[targetIdx];

  // Item & Perk calculations
  let critChance = attacker.critChance;
  let critMult = attacker.critMult;
  let armorPen = 0;
  let lifesteal = 0;
  let cleave = 0;

  // Powerlifter first strike guarantee
  if (attackerSide === 'player' && coachId === 'pl' && tick <= 1) {
    critChance = 1.0;
  }

  attacker.items.forEach(it => {
    if (it.stats.armorPenPct) armorPen += it.stats.armorPenPct / 100;
    if (it.stats.lifestealPct) lifesteal += it.stats.lifestealPct / 100;
    if (it.stats.cleavePct) cleave += it.stats.cleavePct / 100;
  });

  let flatReduction = 0;
  let thorns = 0;
  let maxDmgCapPct: number | undefined = undefined;

  target.items.forEach(it => {
    if (it.stats.flatDmgReduction) flatReduction += it.stats.flatDmgReduction / 100;
    if (it.stats.thornsPct) thorns += it.stats.thornsPct / 100;
    if (it.stats.maxDmgPerHitPct) maxDmgCapPct = it.stats.maxDmgPerHitPct / 100;
  });

  const effectiveReduction = Math.max(0, flatReduction * (1 - armorPen));
  const isCrit = Math.random() < critChance;
  const stackBonus = attacker.atkStacks * 0.06;
  const variance = 0.95 + Math.random() * 0.15;
  let rawDmg = Math.round(attacker.atk * (1 + stackBonus) * (isCrit ? critMult : variance));
  let dmg = Math.round(rawDmg * (1 - effectiveReduction));

  if (maxDmgCapPct !== undefined) {
    const cap = Math.round(target.maxHp * maxDmgCapPct);
    if (dmg > cap) dmg = cap;
  }

  let isBlocked = false;
  if (target.hasShield) {
    dmg = 0;
    target.hasShield = false;
    isBlocked = true;
  }

  // Stacking attack item
  attacker.items.forEach(it => {
    if (it.stats.stackingAtkPct) attacker.atkStacks += 1;
  });

  // Apply damage
  target.currentHp = Math.max(0, target.currentHp - dmg);
  const isKill = target.currentHp <= 0;
  if (isKill) {
    target.isDead = true;
  }

  // Smelling salts rage (<30% HP)
  if (!target.isEnraged && !target.isDead && target.currentHp <= target.maxHp * 0.30) {
    const hasRageItem = target.items.some(it => it.trigger === 'lowHpRage');
    if (hasRageItem) {
      target.isEnraged = true;
      target.atk = Math.round(target.atk * 1.60);
    }
  }

  // Lifesteal & Thorns
  let lifestealHeal = 0;
  if (lifesteal > 0 && dmg > 0) {
    lifestealHeal = Math.round(dmg * lifesteal);
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + lifestealHeal);
  }

  let thornsDamage = 0;
  if (thorns > 0 && dmg > 0) {
    thornsDamage = Math.round(dmg * thorns);
    attacker.currentHp = Math.max(0, attacker.currentHp - thornsDamage);
    if (attacker.currentHp <= 0) {
      attacker.isDead = true;
    }
  }

  // Cleave
  let cleaveDamage = 0;
  if (cleave > 0 && dmg > 0 && aliveDefenderIdxs.length > 1) {
    const secondDefender = defenders[aliveDefenderIdxs[1]];
    if (secondDefender) {
      cleaveDamage = Math.round(dmg * cleave);
      secondDefender.currentHp = Math.max(0, secondDefender.currentHp - cleaveDamage);
      if (secondDefender.currentHp <= 0) secondDefender.isDead = true;
    }
  }

  // Thunder Arena splash every 4 ticks
  let thunderSplashDamage = 0;
  if (arenaEffect === 'thunder' && tick % 4 === 0 && dmg > 0) {
    thunderSplashDamage = Math.round(attacker.atk * 0.15);
    defenders.forEach(d => {
      if (!d.isDead && d.instanceId !== target.instanceId) {
        d.currentHp = Math.max(0, d.currentHp - thunderSplashDamage);
        if (d.currentHp <= 0) d.isDead = true;
      }
    });
  }

  const msg = isBlocked
    ? `🛡️ ${target.name} blockt den Treffer!`
    : `💥 ${attacker.name} trifft ${target.name} für ${dmg}${isCrit ? ' 🔥 CRIT!' : ''}`;

  return {
    tick,
    attackerSide,
    attackerIndex: attackerIdx,
    targetIndex: targetIdx,
    targetInstanceId: target.instanceId,
    damage: dmg,
    isCrit,
    isBlocked,
    isKill,
    lifestealHeal,
    thornsDamage,
    cleaveDamage,
    thunderSplashDamage,
    message: msg,
  };
};

/**
 * Fast simulations of full battles (used for AI calculations, testing & skip).
 */
export const simulateFullBattle = (
  players: ActiveFighter[],
  enemies: ActiveFighter[],
  arenaEffect: ArenaEffectId,
  coachId: CoachId | null,
  maxTicks: number = 80
): BattleResult => {
  const events: CombatEvent[] = [];
  let tick = 0;

  while (tick < maxTicks) {
    tick++;
    const alivePlayers = players.filter(p => !p.isDead && p.currentHp > 0);
    const aliveEnemies = enemies.filter(e => !e.isDead && e.currentHp > 0);

    if (aliveEnemies.length === 0) {
      return {
        winner: 'player',
        ticks: tick,
        events,
        playerFighters: players,
        enemyFighters: enemies,
        survivingPlayers: alivePlayers.length,
        survivingEnemies: 0,
      };
    }
    if (alivePlayers.length === 0) {
      return {
        winner: 'enemy',
        ticks: tick,
        events,
        playerFighters: players,
        enemyFighters: enemies,
        survivingPlayers: 0,
        survivingEnemies: aliveEnemies.length,
      };
    }

    // Player turn
    const pIdx = players.findIndex(p => !p.isDead && p.currentHp > 0);
    if (pIdx !== -1) {
      const pEvent = executeTurnStep(tick, 'player', pIdx, players, enemies, arenaEffect, coachId);
      if (pEvent) events.push(pEvent);
    }

    // Check if enemy defeated after player strike
    if (!enemies.some(e => !e.isDead && e.currentHp > 0)) {
      return {
        winner: 'player',
        ticks: tick,
        events,
        playerFighters: players,
        enemyFighters: enemies,
        survivingPlayers: players.filter(p => !p.isDead && p.currentHp > 0).length,
        survivingEnemies: 0,
      };
    }

    // Enemy turn
    const eIdx = enemies.findIndex(e => !e.isDead && e.currentHp > 0);
    if (eIdx !== -1) {
      const eEvent = executeTurnStep(tick, 'enemy', eIdx, enemies, players, arenaEffect, coachId);
      if (eEvent) events.push(eEvent);
    }
  }

  // Timeout resolution: highest total HP wins
  const totalPlayerHp = players.reduce((s, p) => s + (p.isDead ? 0 : p.currentHp), 0);
  const totalEnemyHp = enemies.reduce((s, e) => s + (e.isDead ? 0 : e.currentHp), 0);
  const winner = totalPlayerHp >= totalEnemyHp ? 'player' : 'enemy';

  return {
    winner,
    ticks: tick,
    events,
    playerFighters: players,
    enemyFighters: enemies,
    survivingPlayers: players.filter(p => !p.isDead && p.currentHp > 0).length,
    survivingEnemies: enemies.filter(e => !e.isDead && e.currentHp > 0).length,
  };
};
