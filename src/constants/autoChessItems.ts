export type ItemRarity = 'common' | 'rare' | 'epic';

export type ItemTrigger =
  | 'firstStrike'
  | 'shieldFirstHit'
  | 'cleave'
  | 'lowHpRage'
  | 'thorns'
  | 'lifesteal'
  | 'stackingAtk'
  | 'unblockable'
  | 'armorPen'
  | 'synergyBoost'
  | 'oneHitProtection'
  | 'regenOnKill';

export interface AutoChessItem {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  cost: number;
  description: string;
  flavorText: string;
  stats: {
    atkBonusPct?: number;
    hpBonusPct?: number;
    critChanceBonus?: number;
    critDmgMult?: number;
    flatDmgReduction?: number;
    thornsPct?: number;
    lifestealPct?: number;
    armorPenPct?: number;
    synergyBoostPct?: number;
    stackingAtkPct?: number;
    cleavePct?: number;
    maxDmgPerHitPct?: number;
    regenOnKillPct?: number;
  };
  trigger?: ItemTrigger;
}

export const RARITY_THEMES: Record<ItemRarity, { label: string; color: string; border: string; bg: string }> = {
  common: {
    label: 'Standard',
    color: '#E0E0E6',
    border: '#A0A0B0',
    bg: '#20202A',
  },
  rare: {
    label: 'Fortgeschritten',
    color: '#0A84FF',
    border: '#0A84FF80',
    bg: '#0F2035',
  },
  epic: {
    label: 'Elite / Legendär',
    color: '#BF5AF2',
    border: '#BF5AF290',
    bg: '#250D35',
  },
};

export const AUTO_CHESS_ITEMS: AutoChessItem[] = [
  // ── COMMON ITEMS (3 Plates / 65% Drop) ──────────────────────────────
  {
    id: 'chalk',
    name: 'Liquid Chalk / Magnesium',
    icon: 'hand-back-right-outline',
    rarity: 'common',
    cost: 3,
    description: '+20% ATK & unblockbare Hiebe.',
    flavorText: 'Kein Abrutschen an der Hantel. Bombenfester Freihantel-Grip.',
    stats: { atkBonusPct: 20 },
    trigger: 'unblockable',
  },
  {
    id: 'wrist_wraps',
    name: 'Handgelenksbandagen',
    icon: 'bandage',
    rarity: 'common',
    cost: 3,
    description: '+15% ATK & +12% Crit-Chance.',
    flavorText: 'Stabile Handgelenke für brachiale Bankdrück- und Schultersätze.',
    stats: { atkBonusPct: 15, critChanceBonus: 12 },
  },
  {
    id: 'knee_sleeves',
    name: 'Neopren Kniebandagen 7mm',
    icon: 'shield-half-full',
    rarity: 'common',
    cost: 3,
    description: '+20% HP & 15% Dornen-Schaden zurück auf Angreifer.',
    flavorText: 'Wärme, Gelenkschutz und massiver Rebound aus dem tiefen Squat.',
    stats: { hpBonusPct: 20, thornsPct: 15 },
    trigger: 'thorns',
  },
  {
    id: 'arm_blaster',
    name: 'Arm-Blaster / Isolator',
    icon: 'dumbbell',
    rarity: 'common',
    cost: 3,
    description: '+40% auf alle aktiven Synergie-Boni dieser Einheit.',
    flavorText: 'Kein Körperschwung, kein Abfälschen – pure Muskel-Isolation.',
    stats: { synergyBoostPct: 40 },
    trigger: 'synergyBoost',
  },
  {
    id: 'foam_roller',
    name: 'Schaumstoffrolle (Foam Roller)',
    icon: 'cylinder',
    rarity: 'common',
    cost: 3,
    description: 'Absorbiert den 1. erlittenen Treffer im Kampf zu 100%.',
    flavorText: 'Myofasziale Entspannung vor dem ersten schweren Arbeitssatz.',
    stats: {},
    trigger: 'shieldFirstHit',
  },

  // ── RARE ITEMS (5 Plates / 28% Drop) ────────────────────────────────
  {
    id: 'lifting_belt',
    name: 'KDK Leder-Hebergürtel',
    icon: 'belt',
    rarity: 'rare',
    cost: 5,
    description: '+25% Max HP & 20% flache Schadensreduktion.',
    flavorText: 'Intraabdominaler Druck und unzerstörbare Rumpfstabilität.',
    stats: { hpBonusPct: 25, flatDmgReduction: 20 },
  },
  {
    id: 'lifting_straps',
    name: 'Zughilfen (Figure-8 Straps)',
    icon: 'link-variant',
    rarity: 'rare',
    cost: 5,
    description: 'Ignoriert 35% der Rüstung & Schadensreduktion des Ziels.',
    flavorText: 'Kreuzheben bis zum Muskelversagen ohne limitierende Unterarme.',
    stats: { armorPenPct: 35 },
    trigger: 'armorPen',
  },
  {
    id: 'smelling_salts',
    name: 'Riechsalz (Smelling Salts)',
    icon: 'lightning-bolt',
    rarity: 'rare',
    cost: 5,
    description: 'Unter 30% HP: Erhält sofort +60% ATK für 2 Runden.',
    flavorText: 'Der ultimative Adrenalin-Schock vor dem entscheidenden 1RM.',
    stats: {},
    trigger: 'lowHpRage',
  },
  {
    id: 'fractional_plates',
    name: 'Fractional Plates (0.5kg)',
    icon: 'weight',
    rarity: 'rare',
    cost: 5,
    description: 'Jeder eigene Treffer erhöht ATK permanent um +6% (stapelbar).',
    flavorText: 'Stetige progressive Überlastung in jedem einzelnen Satz.',
    stats: { stackingAtkPct: 6 },
    trigger: 'stackingAtk',
  },
  {
    id: 'stringer_tanktop',
    name: "Gold's Classic Stringer",
    icon: 'tshirt-crew',
    rarity: 'rare',
    cost: 5,
    description: '+25% Crit-Chance & Crits treffen für 2.0x Schaden.',
    flavorText: 'Mind-Muscle-Connection und maximaler Flex im Freihantel-Spiegel.',
    stats: { critChanceBonus: 25, critDmgMult: 2.0 },
  },
  {
    id: 'whey_shaker',
    name: 'Whey Isolat & Dextrose Shaker',
    icon: 'bottle-tonic',
    rarity: 'rare',
    cost: 5,
    description: 'Lifesteal: Heilt die Einheit bei Treffern um 25% des Schadens.',
    flavorText: 'Sofortiger Post-Workout Anabolismus & ATP-Regeneration.',
    stats: { lifestealPct: 25 },
    trigger: 'lifesteal',
  },

  // ── EPIC / LEGENDARY ITEMS (8 Plates / 7% Drop) ─────────────────────
  {
    id: 'pre_workout',
    name: 'Hardcore Pre-Workout Booster',
    icon: 'fire',
    rarity: 'epic',
    cost: 8,
    description: 'Erstschlag: Trifft vor Kampfbeginn garantiert mit einem Crit.',
    flavorText: 'Brutaler Tunnelblick und extremes Beta-Alanin Kribbeln.',
    stats: {},
    trigger: 'firstStrike',
  },
  {
    id: 'creatine',
    name: 'Kreatin Monohydrat (Ladephase)',
    icon: 'water-percent',
    rarity: 'epic',
    cost: 8,
    description: '+35% Max HP & heilt 20% Max HP bei jedem erzielten K.O.',
    flavorText: 'Maximale intramuskuläre ATP-Zellspeicher & Ausdauer.',
    stats: { hpBonusPct: 35, regenOnKillPct: 20 },
    trigger: 'regenOnKill',
  },
  {
    id: 'pump_booster',
    name: 'Pump-Booster (Citrullin & Arginin)',
    icon: 'heart-pulse',
    rarity: 'epic',
    cost: 8,
    description: 'Spalt-Schaden: 30% des Schadens treffen auch Nebengegner.',
    flavorText: 'Maximaler Gefäßdruck, vaskuläre Adern und pralle Muskeln.',
    stats: { cleavePct: 30 },
    trigger: 'cleave',
  },
  {
    id: 'weighted_vest',
    name: 'Gewichtsweste 20kg',
    icon: 'vest',
    rarity: 'epic',
    cost: 8,
    description: '+20% HP & kann pro Treffer maximal 40% Max-HP verlieren.',
    flavorText: 'Unzerstörbare Calisthenics-Festung gegen tödliche One-Hits.',
    stats: { hpBonusPct: 20, maxDmgPerHitPct: 40 },
    trigger: 'oneHitProtection',
  },
];

/**
 * Rolls loot drop for Mini-Boss victory
 * Common: 65%, Rare: 28%, Epic: 7% (slightly upgraded in round >= 4)
 */
export function rollMiniBossLoot(roundNumber: number = 1): AutoChessItem {
  const rand = Math.random() * 100;
  let rarity: ItemRarity = 'common';

  if (roundNumber >= 4) {
    if (rand < 12) rarity = 'epic';
    else if (rand < 45) rarity = 'rare';
    else rarity = 'common';
  } else {
    if (rand < 7) rarity = 'epic';
    else if (rand < 35) rarity = 'rare';
    else rarity = 'common';
  }

  const pool = AUTO_CHESS_ITEMS.filter(it => it.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] || AUTO_CHESS_ITEMS[0];
}

/**
 * Rolls a shop item offering
 * 30% chance to spawn an item in the 6th shop slot
 */
export function rollShopItem(): AutoChessItem | null {
  // 30% chance to spawn an item
  if (Math.random() > 0.30) {
    return null;
  }

  const rand = Math.random() * 100;
  let rarity: ItemRarity = 'common';
  if (rand < 10) rarity = 'epic';
  else if (rand < 40) rarity = 'rare';
  else rarity = 'common';

  const pool = AUTO_CHESS_ITEMS.filter(it => it.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] || AUTO_CHESS_ITEMS[0];
}

/**
 * Mini-Boss Archetypes (Triggered at Wave 4)
 */
export interface MiniBossDefinition {
  name: string;
  avatar: string;
  subtitle: string;
  category: 'Chest' | 'Back' | 'Arms' | 'Shoulders' | 'Legs' | 'Core';
  equipmentType: string;
  itemId: string;
  bonusAtkMult: number;
  bonusHpMult: number;
}

export const MINI_BOSS_ARCHETYPES: MiniBossDefinition[] = [
  {
    name: 'Der Studio-Riese (Plate Warden)',
    avatar: 'shield-cross',
    subtitle: 'Welle 4 • Zäher Koloss mit Kniebandagen-Dornen',
    category: 'Legs',
    equipmentType: 'Kniebeugen-Käfig',
    itemId: 'knee_sleeves',
    bonusAtkMult: 1.05,
    bonusHpMult: 1.45,
  },
  {
    name: 'Der 1RM-Junkie (Adrenalin-Freak)',
    avatar: 'lightning-bolt',
    subtitle: 'Welle 4 • Explosive Angriffskraft mit Riechsalz-Wut',
    category: 'Chest',
    equipmentType: 'Wettkampf-Bank',
    itemId: 'smelling_salts',
    bonusAtkMult: 1.35,
    bonusHpMult: 1.15,
  },
  {
    name: 'Das Massemonster (Oldschool Lifter)',
    avatar: 'skull',
    subtitle: 'Welle 4 • Gepanzert mit KDK-Lederhebergürtel',
    category: 'Back',
    equipmentType: 'Kreuzhebe-Plattform',
    itemId: 'lifting_belt',
    bonusAtkMult: 1.15,
    bonusHpMult: 1.35,
  },
  {
    name: 'Das Calisthenics-Biest',
    avatar: 'arm-flex',
    subtitle: 'Welle 4 • Akrobat mit hoher Crit-Chance & Wraps',
    category: 'Core',
    equipmentType: 'Klimmzug-Stange',
    itemId: 'wrist_wraps',
    bonusAtkMult: 1.25,
    bonusHpMult: 1.20,
  },
];
