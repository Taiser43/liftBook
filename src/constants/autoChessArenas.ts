export interface AutoChessArenaTheme {
  id: string;
  name: string;
  subtitle: string;
  requiredTrophies: number;
  badgeEmoji: string;
  primaryColor: string;
  borderColor: string;
  backgroundColor: string;
  glowColor: string;
  icon: string;
}

export const AUTO_CHESS_ARENAS: AutoChessArenaTheme[] = [
  {
    id: 'gym',
    name: 'Iron Gym',
    subtitle: 'Klassischer Trainingsbereich',
    requiredTrophies: 0,
    badgeEmoji: '🥊',
    primaryColor: '#8E8E93',
    borderColor: '#20202A',
    backgroundColor: '#111116',
    glowColor: 'rgba(255, 255, 255, 0.05)',
    icon: 'dumbbell',
  },
  {
    id: 'bronze_kolosseum',
    name: 'Bronze Kolosseum',
    subtitle: 'Gladiator-Sand & geschmiedeter Stahl',
    requiredTrophies: 100,
    badgeEmoji: '🥉',
    primaryColor: '#CD7F32',
    borderColor: '#CD7F3290',
    backgroundColor: '#1A110A',
    glowColor: 'rgba(205, 127, 50, 0.28)',
    icon: 'shield-star',
  },
  {
    id: 'silber_bastion',
    name: 'Silber Bastion',
    subtitle: 'Kühler Panzerstahl & Disziplin',
    requiredTrophies: 500,
    badgeEmoji: '🥈',
    primaryColor: '#C0C0C0',
    borderColor: '#A8B5C895',
    backgroundColor: '#10141C',
    glowColor: 'rgba(168, 181, 200, 0.28)',
    icon: 'shield-outline',
  },
  {
    id: 'gold_olymp',
    name: 'Gold Olymp',
    subtitle: 'Goldene Säulen & göttliche Gewichte',
    requiredTrophies: 1000,
    badgeEmoji: '🥇',
    primaryColor: '#FFD700',
    borderColor: '#FFD70095',
    backgroundColor: '#1C1705',
    glowColor: 'rgba(255, 215, 0, 0.3)',
    icon: 'trophy',
  },
  {
    id: 'challenger_ring',
    name: 'Challenger Cyber-Ring',
    subtitle: 'Hochenergie-Boden & Cyber-Neon',
    requiredTrophies: 2500,
    badgeEmoji: '👑',
    primaryColor: '#C084FC',
    borderColor: '#A855F7',
    backgroundColor: '#160C22',
    glowColor: 'rgba(168, 85, 247, 0.35)',
    icon: 'crown',
  },
  {
    id: 'iron_god_pantheon',
    name: 'Iron God Pantheon',
    subtitle: 'Göttlicher Donner & ewige Kraft',
    requiredTrophies: 3750,
    badgeEmoji: '⚡',
    primaryColor: '#00F2FE',
    borderColor: '#00D2FF',
    backgroundColor: '#071524',
    glowColor: 'rgba(0, 242, 254, 0.45)',
    icon: 'fire',
  },
];

/**
 * Returns the highest unlocked arena for the current trophy count.
 */
export const getActiveArena = (trophies: number = 0): AutoChessArenaTheme => {
  const safeTrophies = typeof trophies === 'number' && !isNaN(trophies) ? trophies : 0;
  let active = AUTO_CHESS_ARENAS[0];
  for (const arena of AUTO_CHESS_ARENAS) {
    if (safeTrophies >= arena.requiredTrophies) {
      active = arena;
    }
  }
  return active;
};
