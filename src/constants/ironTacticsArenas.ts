export type ArenaEffectId =
  | 'none'
  | 'sand'
  | 'discipline'
  | 'gold'
  | 'pump'
  | 'neon'
  | 'forge'
  | 'thunder'
  | 'honor'
  | 'apex';

export interface IronTacticsArena {
  id: string;
  name: string;
  subtitle: string;
  requiredTrophies: number;
  badgeEmoji: string;
  primaryColor: string;
  borderColor: string;
  backgroundColor: string;
  glowColor: string;
  icon: string; // MaterialCommunityIcons name
  effectId: ArenaEffectId;
  effectName: string;
  effectDescription: string;
  bossName: string;
  bossSubtitle: string;
}

export const IRON_TACTICS_ARENAS: IronTacticsArena[] = [
  {
    id: 'gym',
    name: 'Iron Gym',
    subtitle: 'Klassischer Freihantel-Bereich',
    requiredTrophies: 0,
    badgeEmoji: '🥊',
    primaryColor: '#8E8E93',
    borderColor: '#3A3A4C',
    backgroundColor: '#121218',
    glowColor: 'rgba(255, 255, 255, 0.08)',
    icon: 'dumbbell',
    effectId: 'none',
    effectName: 'Standard-Boden',
    effectDescription: 'Keine Modifikatoren. Fokus auf grundlegende Synergien.',
    bossName: 'Der Studio-Riese',
    bossSubtitle: 'Meister des Einsteiger-Split',
  },
  {
    id: 'bronze_kolosseum',
    name: 'Bronze Kolosseum',
    subtitle: 'Gladiator-Sand & geschmiedeter Stahl',
    requiredTrophies: 100,
    badgeEmoji: '🥉',
    primaryColor: '#CD7F32',
    borderColor: '#CD7F3290',
    backgroundColor: '#1C120A',
    glowColor: 'rgba(205, 127, 50, 0.28)',
    icon: 'shield-star',
    effectId: 'sand',
    effectName: 'Sandboden',
    effectDescription: 'Bein-Einheiten beider Seiten erhalten +10% maximale HP.',
    bossName: 'Der Kolosseum-Gladiator',
    bossSubtitle: 'Unbändige Unterkörper-Power',
  },
  {
    id: 'silber_bastion',
    name: 'Silber Bastion',
    subtitle: 'Kühler Panzerstahl & eiserne Disziplin',
    requiredTrophies: 500,
    badgeEmoji: '🥈',
    primaryColor: '#C0C0C0',
    borderColor: '#A8B5C895',
    backgroundColor: '#111520',
    glowColor: 'rgba(168, 181, 200, 0.28)',
    icon: 'shield-outline',
    effectId: 'discipline',
    effectName: 'Disziplin',
    effectDescription: '1 kostenloser Shop-Reroll zu Beginn jeder Stage.',
    bossName: 'Der Panzer-Titan',
    bossSubtitle: 'Granitfeste Rumpfstabilität',
  },
  {
    id: 'gold_olymp',
    name: 'Gold Olymp',
    subtitle: 'Goldene Säulen & göttliche Gewichte',
    requiredTrophies: 1000,
    badgeEmoji: '🥇',
    primaryColor: '#FFD700',
    borderColor: '#FFD70095',
    backgroundColor: '#201804',
    glowColor: 'rgba(255, 215, 0, 0.32)',
    icon: 'trophy',
    effectId: 'gold',
    effectName: 'Göttliche Gewichte',
    effectDescription: 'Item-Drop-Chancen bei Mini-Bossen sind um +50% erhöht.',
    bossName: 'Schatten-Titan I',
    bossSubtitle: 'Erste Inkarnation der Schwerkraft',
  },
  {
    id: 'emerald_lab',
    name: 'Smaragd-Labor',
    subtitle: 'Biochemische Hypertrophie & Pump-Formeln',
    requiredTrophies: 1750,
    badgeEmoji: '🧪',
    primaryColor: '#30D158',
    borderColor: '#30D15890',
    backgroundColor: '#071A10',
    glowColor: 'rgba(48, 209, 88, 0.35)',
    icon: 'flask-round-bottom',
    effectId: 'pump',
    effectName: 'Pump-Zonen',
    effectDescription: 'Arm- & Schulter-Einheiten erhalten +15% Crit-Chance.',
    bossName: 'Schatten-Titan II',
    bossSubtitle: 'Hypertrophie-Mutation',
  },
  {
    id: 'challenger_ring',
    name: 'Challenger Cyber-Ring',
    subtitle: 'Hochenergie-Boden & Cyber-Neon',
    requiredTrophies: 2500,
    badgeEmoji: '👑',
    primaryColor: '#C084FC',
    borderColor: '#A855F7',
    backgroundColor: '#170A24',
    glowColor: 'rgba(168, 85, 247, 0.38)',
    icon: 'crown',
    effectId: 'neon',
    effectName: 'Neon-Überladung',
    effectDescription: '+10% Crit-Chance für alle Einheiten beider Seiten.',
    bossName: 'Schatten-Titan III',
    bossSubtitle: 'Kybernetischer Zerstörer',
  },
  {
    id: 'shadow_forge',
    name: 'Schatten-Schmiede',
    subtitle: 'Glühende Barren & schwere Ambosse',
    requiredTrophies: 3200,
    badgeEmoji: '🔥',
    primaryColor: '#FF6B00',
    borderColor: '#FF453A95',
    backgroundColor: '#200A06',
    glowColor: 'rgba(255, 69, 58, 0.40)',
    icon: 'hammer',
    effectId: 'forge',
    effectName: 'Schmiedefeuer',
    effectDescription: 'Ausgerüstete Items sind um +20% wirksamer.',
    bossName: 'Titan der Schmiede',
    bossSubtitle: 'Herr der glühenden Eisen',
  },
  {
    id: 'iron_god_pantheon',
    name: 'Iron God Pantheon',
    subtitle: 'Göttlicher Donner & ewige Kraft',
    requiredTrophies: 3750,
    badgeEmoji: '⚡',
    primaryColor: '#00F2FE',
    borderColor: '#00D2FF',
    backgroundColor: '#061726',
    glowColor: 'rgba(0, 242, 254, 0.45)',
    icon: 'lightning-bolt',
    effectId: 'thunder',
    effectName: 'Göttlicher Donner',
    effectDescription: 'Jeder 4. Schlag entlädt einen Blitz-Splash (15% Flächenschaden).',
    bossName: 'Der Donner-Titan',
    bossSubtitle: 'Gott des olympischen Maximalgewichts',
  },
  {
    id: 'valhalla',
    name: 'Walhalla der Eisen',
    subtitle: 'Ruhmeshalle der unsterblichen Heber',
    requiredTrophies: 5000,
    badgeEmoji: '⚔️',
    primaryColor: '#F59E0B',
    borderColor: '#F59E0B95',
    backgroundColor: '#1C1304',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    icon: 'sword-cross',
    effectId: 'honor',
    effectName: 'Eiserne Ehre',
    effectDescription: 'Gefallene gegnerische Einheiten hinterlassen +2 Plates.',
    bossName: 'Walküren-Titan',
    bossSubtitle: 'Wächterin der Eisenhalle',
  },
  {
    id: 'singularity',
    name: 'Apex-Singularität',
    subtitle: 'Absoluter Zenit aller Kraftsport-Dimensionen',
    requiredTrophies: 7500,
    badgeEmoji: '🌌',
    primaryColor: '#E2E8F0',
    borderColor: '#38BDF8',
    backgroundColor: '#090B14',
    glowColor: 'rgba(56, 189, 248, 0.55)',
    icon: 'atom',
    effectId: 'apex',
    effectName: 'Singularität',
    effectDescription: 'Alle Arena-Effekte 1–9 rotieren unvorhersehbar je Stage.',
    bossName: 'Der Apex-Titan',
    bossSubtitle: 'Vollendete Schwerkraft-Singularität',
  },
];

/**
 * Returns the highest unlocked arena for the current trophy count.
 */
export const getActiveIronTacticsArena = (trophies: number = 0): IronTacticsArena => {
  const safeTrophies = typeof trophies === 'number' && !isNaN(trophies) ? trophies : 0;
  let active = IRON_TACTICS_ARENAS[0];
  for (const arena of IRON_TACTICS_ARENAS) {
    if (safeTrophies >= arena.requiredTrophies) {
      active = arena;
    }
  }
  return active;
};

/**
 * Returns the next locked arena (or null if at max arena).
 */
export const getNextIronTacticsArena = (trophies: number = 0): IronTacticsArena | null => {
  const safeTrophies = typeof trophies === 'number' && !isNaN(trophies) ? trophies : 0;
  for (const arena of IRON_TACTICS_ARENAS) {
    if (safeTrophies < arena.requiredTrophies) {
      return arena;
    }
  }
  return null;
};
